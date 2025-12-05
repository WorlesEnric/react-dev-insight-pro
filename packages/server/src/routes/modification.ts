import { Router, Request, Response } from 'express';
import { getCodeModifier } from '../services/codeModifier.js';
import { getBackupService } from '../services/backupService.js';
import { getFileSystemService } from '../services/fileSystem.js';
import type {
  ModificationRequest,
  ModificationResult,
  CodeSuggestion,
  APIResponse,
} from '../types/index.js';

const router = Router();

/**
 * POST /api/modification/apply
 * Apply a code modification
 */
router.post('/apply', async (req: Request, res: Response) => {
  try {
    const { projectPath, ...request } = req.body as ModificationRequest & {
      projectPath?: string;
    };

    // Validate request
    if (!request.filePath || !request.originalCode || !request.modifiedCode) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required fields: filePath, originalCode, modifiedCode',
        },
      };
      res.status(400).json(response);
      return;
    }

    const modifier = getCodeModifier(projectPath);
    const result = await modifier.applyModification(request);

    const response: APIResponse<ModificationResult> = {
      success: result.success,
      data: result,
      ...(result.success
        ? {}
        : {
            error: {
              code: 'MODIFICATION_FAILED',
              message: result.error || 'Modification failed',
            },
          }),
    };

    res.status(result.success ? 200 : 400).json(response);
  } catch (error) {
    console.error('Modification error:', error);
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'MODIFICATION_ERROR',
        message: error instanceof Error ? error.message : 'Modification failed',
      },
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/modification/suggestion
 * Apply a specific suggestion
 */
router.post('/suggestion', async (req: Request, res: Response) => {
  try {
    const { projectPath, filePath, suggestion, options } = req.body as {
      projectPath?: string;
      filePath: string;
      suggestion: CodeSuggestion;
      options?: {
        createBranch?: boolean;
        branchName?: string;
        customCommitMessage?: string;
      };
    };

    if (!filePath || !suggestion) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required fields: filePath and suggestion',
        },
      };
      res.status(400).json(response);
      return;
    }

    const modifier = getCodeModifier(projectPath);
    const result = await modifier.applySuggestion(filePath, suggestion, options);

    const response: APIResponse<ModificationResult> = {
      success: result.success,
      data: result,
      ...(result.success
        ? {}
        : {
            error: {
              code: 'MODIFICATION_FAILED',
              message: result.error || 'Failed to apply suggestion',
            },
          }),
    };

    res.status(result.success ? 200 : 400).json(response);
  } catch (error) {
    console.error('Suggestion apply error:', error);
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'SUGGESTION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to apply suggestion',
      },
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/modification/batch
 * Apply multiple suggestions at once
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { projectPath, filePath, suggestions, options } = req.body as {
      projectPath?: string;
      filePath: string;
      suggestions: CodeSuggestion[];
      options?: {
        createBranch?: boolean;
        branchName?: string;
      };
    };

    if (!filePath || !suggestions || !Array.isArray(suggestions)) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required fields: filePath and suggestions (array)',
        },
      };
      res.status(400).json(response);
      return;
    }

    const modifier = getCodeModifier(projectPath);
    const results = await modifier.applyMultipleSuggestions(
      filePath,
      suggestions,
      options
    );

    const allSuccessful = results.every((r) => r.success);

    const response: APIResponse<ModificationResult[]> = {
      success: allSuccessful,
      data: results,
      ...(allSuccessful
        ? {}
        : {
            error: {
              code: 'PARTIAL_FAILURE',
              message: 'Some modifications failed',
            },
          }),
    };

    res.status(allSuccessful ? 200 : 207).json(response);
  } catch (error) {
    console.error('Batch modification error:', error);
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'BATCH_ERROR',
        message: error instanceof Error ? error.message : 'Batch modification failed',
      },
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/modification/revert
 * Revert a previously applied modification
 */
router.post('/revert', async (req: Request, res: Response) => {
  try {
    const { projectPath, modificationId } = req.body as {
      projectPath?: string;
      modificationId: string;
    };

    if (!modificationId) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required field: modificationId',
        },
      };
      res.status(400).json(response);
      return;
    }

    const modifier = getCodeModifier(projectPath);
    const result = await modifier.revertModification(modificationId);

    const response: APIResponse<{ reverted: boolean }> = {
      success: result.success,
      data: { reverted: result.success },
      ...(result.success
        ? {}
        : {
            error: {
              code: 'REVERT_FAILED',
              message: result.error || 'Revert failed',
            },
          }),
    };

    res.status(result.success ? 200 : 400).json(response);
  } catch (error) {
    console.error('Revert error:', error);
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'REVERT_ERROR',
        message: error instanceof Error ? error.message : 'Revert failed',
      },
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/modification/preview
 * Preview what a modification would look like
 */
router.post('/preview', async (req: Request, res: Response) => {
  try {
    const { projectPath, filePath, originalCode, modifiedCode } = req.body as {
      projectPath?: string;
      filePath: string;
      originalCode: string;
      modifiedCode: string;
    };

    if (!filePath || !originalCode || !modifiedCode) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required fields: filePath, originalCode, modifiedCode',
        },
      };
      res.status(400).json(response);
      return;
    }

    const fs = getFileSystemService(projectPath);
    const currentContent = fs.readFile(filePath);

    if (!currentContent.success || !currentContent.content) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'FILE_ERROR',
          message: currentContent.error || 'Failed to read file',
        },
      };
      res.status(400).json(response);
      return;
    }

    const modifier = getCodeModifier(projectPath);
    const preview = modifier.previewModification(
      currentContent.content,
      originalCode,
      modifiedCode
    );

    const response: APIResponse<{ preview: string | undefined }> = {
      success: preview.success,
      data: { preview: preview.preview },
      ...(preview.success
        ? {}
        : {
            error: {
              code: 'PREVIEW_FAILED',
              message: preview.error || 'Preview generation failed',
            },
          }),
    };

    res.status(preview.success ? 200 : 400).json(response);
  } catch (error) {
    console.error('Preview error:', error);
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'PREVIEW_ERROR',
        message: error instanceof Error ? error.message : 'Preview failed',
      },
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/modification/history
 * Get modification history
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { projectPath, filePath } = req.query as {
      projectPath?: string;
      filePath?: string;
    };

    const modifier = getCodeModifier(projectPath);
    const history = filePath
      ? modifier.getFileHistory(filePath)
      : modifier.getHistory();

    const response: APIResponse<typeof history> = {
      success: true,
      data: history,
    };

    res.json(response);
  } catch (error) {
    console.error('History error:', error);
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'HISTORY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get history',
      },
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/modification/backups
 * Get available backups
 */
router.get('/backups', async (req: Request, res: Response) => {
  try {
    const { projectPath, filePath } = req.query as {
      projectPath?: string;
      filePath?: string;
    };

    const backup = getBackupService(projectPath);
    const backups = filePath
      ? backup.getBackupsForFile(filePath)
      : backup.getAllBackups();

    const response: APIResponse<typeof backups> = {
      success: true,
      data: backups,
    };

    res.json(response);
  } catch (error) {
    console.error('Backup listing error:', error);
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'BACKUP_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list backups',
      },
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/modification/restore
 * Restore from a backup
 */
router.post('/restore', async (req: Request, res: Response) => {
  try {
    const { projectPath, backupId } = req.body as {
      projectPath?: string;
      backupId: string;
    };

    if (!backupId) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required field: backupId',
        },
      };
      res.status(400).json(response);
      return;
    }

    const backup = getBackupService(projectPath);
    const result = await backup.restoreBackup(backupId);

    const response: APIResponse<{ restored: boolean }> = {
      success: result.success,
      data: { restored: result.success },
      ...(result.success
        ? {}
        : {
            error: {
              code: 'RESTORE_FAILED',
              message: result.error || 'Restore failed',
            },
          }),
    };

    res.status(result.success ? 200 : 400).json(response);
  } catch (error) {
    console.error('Restore error:', error);
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'RESTORE_ERROR',
        message: error instanceof Error ? error.message : 'Restore failed',
      },
    };
    res.status(500).json(response);
  }
});

export default router;
