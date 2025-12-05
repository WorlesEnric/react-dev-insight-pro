/**
 * Route Aggregator
 * 
 * Combines all API route modules and exports a single router
 * for mounting in the Express application.
 */

import { Router } from 'express';
import analysisRoutes from './analysis';
import modificationRoutes from './modification';
import gitRoutes from './git';
import llmRoutes from './llm';

const router = Router();

// Mount route modules
router.use('/analysis', analysisRoutes);
router.use('/modification', modificationRoutes);
router.use('/git', gitRoutes);
router.use('/llm', llmRoutes);

// Health check endpoint
// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString()
    }
  });
});

// API info endpoint
router.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'React Dev Insight Pro API',
      version: '1.0.0'
    }
  });
});

export default router;
