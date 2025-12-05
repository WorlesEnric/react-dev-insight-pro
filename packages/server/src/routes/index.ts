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
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    }
  });
});

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'React Dev Insight Pro API',
      version: '1.0.0',
      endpoints: {
        analysis: {
          'POST /api/analysis/element': 'Analyze selected element',
          'POST /api/analysis/file': 'Analyze specific file',
          'GET /api/analysis/component/:name': 'Find and analyze component',
          'POST /api/analysis/batch': 'Analyze multiple files',
          'GET /api/analysis/files': 'List all React files'
        },
        modification: {
          'POST /api/modification/apply': 'Apply code modification',
          'POST /api/modification/suggestion': 'Apply code suggestion',
          'POST /api/modification/batch': 'Apply multiple suggestions',
          'POST /api/modification/revert': 'Revert modification',
          'POST /api/modification/preview': 'Preview changes',
          'GET /api/modification/history': 'Get modification history',
          'GET /api/modification/backups': 'List backups',
          'POST /api/modification/restore': 'Restore from backup'
        },
        git: {
          'GET /api/git/status': 'Get repository status',
          'POST /api/git/commit': 'Create commit',
          'POST /api/git/revert': 'Revert commit',
          'POST /api/git/reset-file': 'Reset file to HEAD',
          'GET /api/git/history': 'Get commit history',
          'GET /api/git/diff': 'Get file diff',
          'POST /api/git/branch': 'Create branch',
          'POST /api/git/stash': 'Stash changes',
          'POST /api/git/stash-pop': 'Pop stash',
          'GET /api/git/uncommitted': 'Check uncommitted changes'
        },
        llm: {
          'POST /api/llm/analyze': 'Analyze code with AI',
          'POST /api/llm/validate': 'Validate modification',
          'POST /api/llm/commit-message': 'Generate commit message',
          'POST /api/llm/explain': 'Explain code change',
          'POST /api/llm/suggest-related': 'Suggest related optimizations',
          'GET /api/llm/status': 'Check LLM status',
          'POST /api/llm/custom-prompt': 'Send custom prompt'
        },
        utility: {
          'GET /api/health': 'Health check',
          'GET /api/': 'API information'
        }
      }
    }
  });
});

export default router;
