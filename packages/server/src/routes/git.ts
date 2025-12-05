/**
 * Git Routes
 * 
 * Provides REST API endpoints for Git operations including
 * status checking, commits, reverts, and history retrieval.
 */

import { Router, Request, Response } from 'express';
import { getGitService, GitService } from '../services/gitService';
import { APIResponse, GitStatus } from '../types';

const router = Router();

// Cache for GitService instances per project
const gitServiceCache = new Map<string, GitService>();

function getGitServiceForProject(projectPath: string): GitService {
  if (!gitServiceCache.has(projectPath)) {
    gitServiceCache.set(projectPath, getGitService(projectPath));
  }
  return gitServiceCache.get(projectPath)!;
}

/**
 * GET /api/git/status
 * Get current Git repository status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const projectPath = req.query.projectPath as string;
    
    if (!projectPath) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'projectPath query parameter is required'
        }
      };
      return res.status(400).json(response);
    }

    const gitService = getGitServiceForProject(projectPath);
    const status = await gitService.getStatus();

    const response: APIResponse<GitStatus> = {
      success: true,
      data: status
    };
    
    res.json(response);
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'GIT_STATUS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get Git status'
      }
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/git/commit
 * Create a new commit with specified files
 */
router.post('/commit', async (req: Request, res: Response) => {
  try {
    const { projectPath, files, message } = req.body;

    if (!projectPath) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'projectPath is required'
        }
      };
      return res.status(400).json(response);
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'files array is required and must not be empty'
        }
      };
      return res.status(400).json(response);
    }

    if (!message || typeof message !== 'string') {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'commit message is required'
        }
      };
      return res.status(400).json(response);
    }

    const gitService = getGitServiceForProject(projectPath);
    const commitResult = await gitService.commit(message, files);

    if (!commitResult.success || !commitResult.hash) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'GIT_COMMIT_ERROR',
          message: commitResult.error || 'Failed to create commit'
        }
      };
      return res.status(500).json(response);
    }

    const response: APIResponse<{ commitHash: string }> = {
      success: true,
      data: { commitHash: commitResult.hash }
    };
    
    res.json(response);
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'GIT_COMMIT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create commit'
      }
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/git/revert
 * Revert a specific commit
 */
router.post('/revert', async (req: Request, res: Response) => {
  try {
    const { projectPath, commitHash } = req.body;

    if (!projectPath) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'projectPath is required'
        }
      };
      return res.status(400).json(response);
    }

    if (!commitHash || typeof commitHash !== 'string') {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'commitHash is required'
        }
      };
      return res.status(400).json(response);
    }

    const gitService = getGitServiceForProject(projectPath);
    await gitService.revertCommit(commitHash);

    const response: APIResponse<{ reverted: boolean; commitHash: string }> = {
      success: true,
      data: { reverted: true, commitHash }
    };
    
    res.json(response);
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'GIT_REVERT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to revert commit'
      }
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/git/reset-file
 * Reset a specific file to HEAD state
 */
router.post('/reset-file', async (req: Request, res: Response) => {
  try {
    const { projectPath, filePath } = req.body;

    if (!projectPath) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'projectPath is required'
        }
      };
      return res.status(400).json(response);
    }

    if (!filePath || typeof filePath !== 'string') {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'filePath is required'
        }
      };
      return res.status(400).json(response);
    }

    const gitService = getGitServiceForProject(projectPath);
    await gitService.resetFile(filePath);

    const response: APIResponse<{ reset: boolean; filePath: string }> = {
      success: true,
      data: { reset: true, filePath }
    };
    
    res.json(response);
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'GIT_RESET_ERROR',
        message: error instanceof Error ? error.message : 'Failed to reset file'
      }
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/git/history
 * Get commit history, optionally filtered by file
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const projectPath = req.query.projectPath as string;
    const filePath = req.query.filePath as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!projectPath) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'projectPath query parameter is required'
        }
      };
      return res.status(400).json(response);
    }

    const gitService = getGitServiceForProject(projectPath);
    const history = await gitService.getHistory({
      maxCount: limit,
      ...(filePath && { file: filePath })
    });

    const response: APIResponse<typeof history> = {
      success: true,
      data: history
    };
    
    res.json(response);
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'GIT_HISTORY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get Git history'
      }
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/git/diff
 * Get diff for a specific file
 */
router.get('/diff', async (req: Request, res: Response) => {
  try {
    const projectPath = req.query.projectPath as string;
    const filePath = req.query.filePath as string;

    if (!projectPath) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'projectPath query parameter is required'
        }
      };
      return res.status(400).json(response);
    }

    if (!filePath) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'filePath query parameter is required'
        }
      };
      return res.status(400).json(response);
    }

    const gitService = getGitServiceForProject(projectPath);
    const diff = await gitService.getFileDiff(filePath);

    const response: APIResponse<typeof diff> = {
      success: true,
      data: diff
    };
    
    res.json(response);
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'GIT_DIFF_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get file diff'
      }
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/git/branch
 * Create a new branch
 */
router.post('/branch', async (req: Request, res: Response) => {
  try {
    const { projectPath, branchName, usePrefix = true } = req.body;

    if (!projectPath) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'projectPath is required'
        }
      };
      return res.status(400).json(response);
    }

    if (!branchName || typeof branchName !== 'string') {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'branchName is required'
        }
      };
      return res.status(400).json(response);
    }

    const gitService = getGitServiceForProject(projectPath);
    const branchResult = await gitService.createBranch(branchName, usePrefix);

    if (!branchResult.success) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'GIT_BRANCH_ERROR',
          message: branchResult.error || 'Failed to create branch'
        }
      };
      return res.status(500).json(response);
    }

    const response: APIResponse<{ branchName: string }> = {
      success: true,
      data: { branchName }
    };
    
    res.json(response);
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'GIT_BRANCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create branch'
      }
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/git/stash
 * Stash current changes
 */
router.post('/stash', async (req: Request, res: Response) => {
  try {
    const { projectPath, message } = req.body;

    if (!projectPath) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'projectPath is required'
        }
      };
      return res.status(400).json(response);
    }

    const gitService = getGitServiceForProject(projectPath);
    await gitService.stash(message);

    const response: APIResponse<{ stashed: boolean }> = {
      success: true,
      data: { stashed: true }
    };
    
    res.json(response);
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'GIT_STASH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to stash changes'
      }
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/git/stash-pop
 * Pop stashed changes
 */
router.post('/stash-pop', async (req: Request, res: Response) => {
  try {
    const { projectPath } = req.body;

    if (!projectPath) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'projectPath is required'
        }
      };
      return res.status(400).json(response);
    }

    const gitService = getGitServiceForProject(projectPath);
    await gitService.stashPop();

    const response: APIResponse<{ popped: boolean }> = {
      success: true,
      data: { popped: true }
    };
    
    res.json(response);
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'GIT_STASH_POP_ERROR',
        message: error instanceof Error ? error.message : 'Failed to pop stash'
      }
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/git/uncommitted
 * Check if a file has uncommitted changes
 */
router.get('/uncommitted', async (req: Request, res: Response) => {
  try {
    const projectPath = req.query.projectPath as string;
    const filePath = req.query.filePath as string;

    if (!projectPath) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'projectPath query parameter is required'
        }
      };
      return res.status(400).json(response);
    }

    if (!filePath) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'filePath query parameter is required'
        }
      };
      return res.status(400).json(response);
    }

    const gitService = getGitServiceForProject(projectPath);
    const hasChanges = await gitService.hasUncommittedChanges(filePath);

    const response: APIResponse<{ hasUncommittedChanges: boolean; filePath: string }> = {
      success: true,
      data: { hasUncommittedChanges: hasChanges, filePath }
    };
    
    res.json(response);
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'GIT_UNCOMMITTED_ERROR',
        message: error instanceof Error ? error.message : 'Failed to check uncommitted changes'
      }
    };
    res.status(500).json(response);
  }
});

export default router;
