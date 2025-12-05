/**
 * Server Entry Point
 * 
 * Starts the Express server with WebSocket support for
 * real-time communication with the client.
 */

import 'dotenv/config';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createApp } from './app';
import { loadConfig } from './config';
import { WebSocketMessage } from './types';

// WebSocket client tracking
interface WSClient {
  id: string;
  ws: WebSocket;
  projectPath?: string;
  lastActivity: Date;
}

const clients = new Map<string, WSClient>();

/**
 * Broadcast message to all connected clients
 */
function broadcast(message: WebSocketMessage, filterFn?: (client: WSClient) => boolean): void {
  const messageStr = JSON.stringify(message);

  clients.forEach(client => {
    if (client.ws.readyState === WebSocket.OPEN) {
      if (!filterFn || filterFn(client)) {
        client.ws.send(messageStr);
      }
    }
  });
}

/**
 * Broadcast to clients watching a specific project
 */
function broadcastToProject(projectPath: string, message: WebSocketMessage): void {
  broadcast(message, client => client.projectPath === projectPath);
}

/**
 * Handle incoming WebSocket message
 */
function handleMessage(client: WSClient, data: string): void {
  try {
    const message: WebSocketMessage = JSON.parse(data);
    client.lastActivity = new Date();

    switch (message.type) {
      case 'subscribe':
        // Subscribe to project updates
        if (message.data && 'projectPath' in message.data) {
          client.projectPath = (message.data as { projectPath: string }).projectPath;
          client.ws.send(JSON.stringify({
            type: 'subscribed',
            data: { projectPath: client.projectPath }
          }));
        }
        break;

      case 'unsubscribe':
        // Unsubscribe from project updates
        // Unsubscribe from project updates
        delete client.projectPath;
        client.ws.send(JSON.stringify({
          type: 'unsubscribed',
          data: {}
        }));
        break;

      case 'ping':
        // Keep-alive ping
        client.ws.send(JSON.stringify({
          type: 'pong',
          data: { timestamp: Date.now() }
        }));
        break;

      default:
        console.log(`Unknown message type: ${message.type}`);
    }
  } catch (error) {
    console.error('Error handling WebSocket message:', error);
    client.ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'Invalid message format' }
    }));
  }
}

/**
 * Setup WebSocket server
 */
function setupWebSocket(server: http.Server): WebSocketServer {
  const wss = new WebSocketServer({
    server,
    path: '/ws'
  });

  wss.on('connection', (ws: WebSocket, _req) => {
    const clientId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const client: WSClient = {
      id: clientId,
      ws,
      lastActivity: new Date()
    };

    clients.set(clientId, client);
    console.log(`WebSocket client connected: ${clientId}`);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      data: {
        clientId,
        timestamp: Date.now()
      }
    }));

    ws.on('message', (data: Buffer) => {
      handleMessage(client, data.toString());
    });

    ws.on('close', () => {
      clients.delete(clientId);
      console.log(`WebSocket client disconnected: ${clientId}`);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      clients.delete(clientId);
    });
  });

  // Cleanup inactive clients every 30 seconds
  setInterval(() => {
    const now = new Date();
    const timeout = 5 * 60 * 1000; // 5 minutes

    clients.forEach((client, id) => {
      const inactive = now.getTime() - client.lastActivity.getTime() > timeout;

      if (inactive || client.ws.readyState !== WebSocket.OPEN) {
        client.ws.terminate();
        clients.delete(id);
        console.log(`Cleaned up inactive client: ${id}`);
      }
    });
  }, 30000);

  return wss;
}

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    const config = await loadConfig();
    const app = await createApp();

    const server = http.createServer(app);
    const wss = setupWebSocket(server);

    const port = config.server?.port || 3001;
    const host = config.server?.host || 'localhost';

    server.listen(port, host, () => {
      console.log('\n🚀 React Dev Insight Pro Server');
      console.log('================================');
      console.log(`HTTP:      http://${host}:${port}`);
      console.log(`WebSocket: ws://${host}:${port}/ws`);
      console.log(`API Docs:  http://${host}:${port}/api`);
      console.log(`Health:    http://${host}:${port}/api/health`);
      console.log('================================');

      const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.log('\n⚠️  LLM_API_KEY or OPENAI_API_KEY not set');
        console.log('   AI features will be limited to basic analysis');
      } else {
        console.log('\n✅ AI features enabled');
        console.log(`   Model: ${config.llm.model}`);
        if (process.env.LLM_BASE_URL) {
          console.log(`   Base URL: ${process.env.LLM_BASE_URL}`);
        }
      }

      console.log('\nOptimization categories:', config.optimization.allowedCategories.join(', '));
      console.log('Git auto-commit:', config.git.autoCommit ? 'enabled' : 'disabled');
      console.log('Backup enabled:', config.backup?.enabled !== false ? 'yes' : 'no');
      console.log('\n');
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\nShutting down gracefully...');

      // Close all WebSocket connections
      clients.forEach(client => {
        client.ws.send(JSON.stringify({
          type: 'server_shutdown',
          data: { message: 'Server is shutting down' }
        }));
        client.ws.close();
      });

      wss.close(() => {
        console.log('WebSocket server closed');
      });

      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Export for programmatic use
    return;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Export utilities for external use
export { broadcast, broadcastToProject, clients };

// Start server if this is the main module
startServer();
