/**
 * Express Application Setup
 * 
 * Configures Express with middleware, CORS, body parsing,
 * error handling, and route mounting.
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { loadConfig } from './config';
import { APIResponse } from './types';

/**
 * Create and configure the Express application
 */
export async function createApp(): Promise<Express> {
  const app = express();
  const config = await loadConfig();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for development tools
    crossOriginEmbedderPolicy: false
  }));

  // CORS configuration
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) {
        return callback(null, true);
      }

      // Allow localhost for development
      const allowedOrigins = [
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/,
        /^http:\/\/\[::1\]:\d+$/
      ];

      const isAllowed = allowedOrigins.some(pattern => pattern.test(origin));
      
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Project-Path']
  };

  app.use(cors(corsOptions));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Request ID middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    req.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('X-Request-ID', req.id);
    next();
  });

  // Project path header middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Allow project path to be passed via header
    const projectPathHeader = req.headers['x-project-path'];
    if (projectPathHeader && typeof projectPathHeader === 'string') {
      req.projectPath = projectPathHeader;
    }
    next();
  });

  // Mount API routes
  app.use('/api', routes);

  // 404 handler
  app.use((req: Request, res: Response) => {
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint not found: ${req.method} ${req.path}`
      }
    };
    res.status(404).json(response);
  });

  // Global error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err);

    // Handle CORS errors
    if (err.message === 'CORS not allowed') {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'CORS_ERROR',
          message: 'CORS policy does not allow this origin'
        }
      };
      return res.status(403).json(response);
    }

    // Handle JSON parsing errors
    if (err instanceof SyntaxError && 'body' in err) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON in request body'
        }
      };
      return res.status(400).json(response);
    }

    // Handle payload too large
    if (err.message?.includes('request entity too large')) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Request payload too large. Maximum size is 10MB.'
        }
      };
      return res.status(413).json(response);
    }

    // Generic error response
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'development' 
          ? err.message 
          : 'Internal server error'
      }
    };

    res.status(500).json(response);
  });

  return app;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      id?: string;
      projectPath?: string;
    }
  }
}

export default createApp;
