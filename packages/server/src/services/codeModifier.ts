import { getFileSystemService } from './fileSystem.js';
import { getGitService } from './gitService.js';
import { getBackupService } from './backupService.js';
import { getLLMService } from './llmService.js';
import { validateCode, validateModification } from '../utils/validation.js';
import { getConfig } from '../config/index.js';
import type {
  ModificationRequest,
  ModificationResult,
  CodeSuggestion,
  ModificationHistory,
} from '../types/index.js';

/**
 * Code Modifier Service for applying AI-suggested changes
 */
export class CodeModifierService {
  private projectPath: string;
  private history: ModificationHistory[] = [];

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Apply a code modification with full safety checks
   */
  async applyModification(request: ModificationRequest): Promise<ModificationResult> {
    const config = getConfig();
    const fs = getFileSystemService(this.projectPath);
    const git = getGitService(this.projectPath);
    const backup = getBackupService(this.projectPath);

    // Step 1: Check Git working directory
    if (config.git.requireCleanWorkingDir) {
      const hasChanges = await git.hasUncommittedChanges(request.filePath);
      if (hasChanges) {
        return {
          success: false,
          filePath: request.filePath,
          error: 'File has uncommitted changes. Please commit or stash them first.',
          validation: { valid: false, syntaxErrors: [], typeErrors: [], lintErrors: [] },
        };
      }
    }

    // Step 2: Read current file content
    const currentContent = fs.readFile(request.filePath);
    if (!currentContent.success || !currentContent.content) {
      return {
        success: false,
        filePath: request.filePath,
        error: currentContent.error || 'Failed to read file',
        validation: { valid: false, syntaxErrors: [], typeErrors: [], lintErrors: [] },
      };
    }

    // Step 3: Verify original code matches
    if (!currentContent.content.includes(request.originalCode)) {
      return {
        success: false,
        filePath: request.filePath,
        error: 'Original code not found in file. The file may have been modified.',
        validation: { valid: false, syntaxErrors: [], typeErrors: [], lintErrors: [] },
      };
    }

    // Step 4: Generate new file content
    const newContent = currentContent.content.replace(
      request.originalCode,
      request.modifiedCode
    );

    // Step 5: Validate the modification
    const validation = validateCode(newContent, request.filePath);
    if (!validation.valid) {
      return {
        success: false,
        filePath: request.filePath,
        error: 'Modified code has syntax errors',
        validation,
      };
    }

    // Step 6: Additional safety validation
    const safetyCheck = validateModification(
      request.originalCode,
      request.modifiedCode,
      request.filePath
    );
    if (!safetyCheck.safe) {
      return {
        success: false,
        filePath: request.filePath,
        error: `Unsafe modification: ${safetyCheck.issues.join(', ')}`,
        validation,
      };
    }

    // Step 7: Create backup
    const backupEntry = await backup.createBackup(
      request.filePath,
      `Before applying: ${request.commitMessage || 'AI modification'}`
    );

    // Step 8: Create branch if requested
    if (request.createBranch && request.branchName) {
      const branchResult = await git.createBranch(request.branchName, true);
      if (!branchResult.success) {
        return {
          success: false,
          filePath: request.filePath,
          error: `Failed to create branch: ${branchResult.error}`,
          validation,
          ...(backupEntry?.backupPath && { backupPath: backupEntry.backupPath }),
        };
      }
    }

    // Step 9: Write the modified file
    const writeResult = fs.writeFile(request.filePath, newContent);
    if (!writeResult.success) {
      // Attempt to restore from backup
      if (backupEntry) {
        await backup.restoreBackup(backupEntry.id);
      }

      return {
        success: false,
        filePath: request.filePath,
        error: writeResult.error || 'Failed to write file',
        validation,
        ...(backupEntry?.backupPath && { backupPath: backupEntry.backupPath }),
      };
    }

    // Step 10: Create Git commit if configured
    let commitHash: string | undefined;
    if (config.git.autoCommit) {
      const commitMessage =
        request.commitMessage || 'Apply AI-suggested optimization';
      const commitResult = await git.commit(commitMessage, [request.filePath]);

      if (commitResult.success) {
        commitHash = commitResult.hash;
      } else {
        console.warn('Failed to create commit:', commitResult.error);
      }
    }

    return {
      success: true,
      filePath: request.filePath,
      ...(backupEntry?.backupPath && { backupPath: backupEntry.backupPath }),
      ...(commitHash && { commitHash }),
      validation,
    };
  }

  /**
   * Apply a suggestion from analysis results
   */
  async applySuggestion(
    filePath: string,
    suggestion: CodeSuggestion,
    options: {
      createBranch?: boolean;
      branchName?: string;
      customCommitMessage?: string;
    } = {}
  ): Promise<ModificationResult> {
    const llm = getLLMService();

    // Generate commit message if LLM is available
    let commitMessage = options.customCommitMessage;
    if (!commitMessage && llm.isAvailable()) {
      commitMessage = await llm.generateCommitMessage({
        filePath,
        changes: [
          {
            title: suggestion.title,
            category: suggestion.category,
            description: suggestion.description,
          },
        ],
      });
    }

    const result = await this.applyModification({
      suggestionId: suggestion.id,
      filePath,
      originalCode: suggestion.originalCode,
      modifiedCode: suggestion.modifiedCode,
      ...(commitMessage && { commitMessage }),
      ...(options.createBranch !== undefined && { createBranch: options.createBranch }),
      ...(options.branchName && { branchName: options.branchName }),
    });

    // Record in history
    this.history.push({
      id: suggestion.id,
      timestamp: new Date(),
      filePath,
      componentName: '', // Would need to be passed in
      optimizationGoal: suggestion.description,
      category: suggestion.category,
      status: result.success ? 'applied' : 'rejected',
      ...(result.commitHash && { commitHash: result.commitHash }),
      ...(result.backupPath && { backupPath: result.backupPath }),
      suggestion,
    });

    return result;
  }

  /**
   * Apply multiple suggestions at once
   */
  async applyMultipleSuggestions(
    filePath: string,
    suggestions: CodeSuggestion[],
    options: {
      createBranch?: boolean;
      branchName?: string;
    } = {}
  ): Promise<ModificationResult[]> {
    const results: ModificationResult[] = [];
    const fs = getFileSystemService(this.projectPath);

    // Read initial file content
    const initialContent = fs.readFile(filePath);
    if (!initialContent.success || !initialContent.content) {
      return suggestions.map(() => ({
        success: false,
        filePath,
        error: 'Failed to read file',
        validation: { valid: false, syntaxErrors: [], typeErrors: [], lintErrors: [] },
      }));
    }

    let currentContent = initialContent.content;

    // Sort suggestions by line number (descending) to avoid offset issues
    const sortedSuggestions = [...suggestions].sort(
      (a, b) => b.lineStart - a.lineStart
    );

    // Apply each suggestion
    for (const suggestion of sortedSuggestions) {
      // Check if original code still exists in current content
      if (!currentContent.includes(suggestion.originalCode)) {
        results.push({
          success: false,
          filePath,
          error: 'Original code not found - may conflict with other changes',
          validation: { valid: true, syntaxErrors: [], typeErrors: [], lintErrors: [] },
        });
        continue;
      }

      // Apply the change
      currentContent = currentContent.replace(
        suggestion.originalCode,
        suggestion.modifiedCode
      );

      results.push({
        success: true,
        filePath,
        validation: { valid: true, syntaxErrors: [], typeErrors: [], lintErrors: [] },
      });
    }

    // Validate final content
    const finalValidation = validateCode(currentContent, filePath);
    if (!finalValidation.valid) {
      // Rollback - don't apply any changes
      return suggestions.map(() => ({
        success: false,
        filePath,
        error: 'Combined changes result in invalid code',
        validation: finalValidation,
      }));
    }

    // Write final content and commit
    const backup = getBackupService(this.projectPath);
    const git = getGitService(this.projectPath);
    const config = getConfig();

    // Create backup
    const backupEntry = await backup.createBackup(
      filePath,
      `Before applying ${suggestions.length} suggestions`
    );

    // Create branch if requested
    if (options.createBranch && options.branchName) {
      await git.createBranch(options.branchName, true);
    }

    // Write file
    const writeResult = fs.writeFile(filePath, currentContent);
    if (!writeResult.success) {
      if (backupEntry) {
        await backup.restoreBackup(backupEntry.id);
      }
      return results.map((r) => ({
        ...r,
        success: false,
        error: 'Failed to write changes',
      }));
    }

    // Commit changes
    if (config.git.autoCommit) {
      const llm = getLLMService();
      let commitMessage = `Apply ${suggestions.length} optimizations`;

      if (llm.isAvailable()) {
        commitMessage = await llm.generateCommitMessage({
          filePath,
          changes: suggestions.map((s) => ({
            title: s.title,
            category: s.category,
            description: s.description,
          })),
        });
      }

      const commitResult = await git.commit(commitMessage, [filePath]);
      if (commitResult.success && commitResult.hash) {
        results.forEach((r) => {
          r.commitHash = commitResult.hash!;
        });
      }
    }

    // Update backup path in results
    results.forEach((r) => {
      if (backupEntry?.backupPath) {
        r.backupPath = backupEntry.backupPath;
      } else {
        delete r.backupPath;
      }
    });

    return results;
  }

  /**
   * Revert a previously applied modification
   */
  async revertModification(modificationId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const historyEntry = this.history.find((h) => h.id === modificationId);

    if (!historyEntry) {
      return { success: false, error: 'Modification not found in history' };
    }

    if (historyEntry.status === 'reverted') {
      return { success: false, error: 'Modification already reverted' };
    }

    const git = getGitService(this.projectPath);
    const backup = getBackupService(this.projectPath);

    // Try to restore from backup first
    if (historyEntry.backupPath) {
      const latestBackup = backup.getLatestBackup(historyEntry.filePath);
      if (latestBackup) {
        const restoreResult = await backup.restoreBackup(latestBackup.id);
        if (restoreResult.success) {
          historyEntry.status = 'reverted';
          return { success: true };
        }
      }
    }

    // Try to revert Git commit
    if (historyEntry.commitHash) {
      const revertResult = await git.revertCommit(historyEntry.commitHash);
      if (revertResult.success) {
        historyEntry.status = 'reverted';
        return { success: true };
      }
      return {
        success: false,
        ...(revertResult.error && { error: revertResult.error }),
      };
    }

    return {
      success: false,
      error: 'No backup or commit available for reversion',
    };
  }

  /**
   * Get modification history
   */
  getHistory(): ModificationHistory[] {
    return [...this.history].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Get history for a specific file
   */
  getFileHistory(filePath: string): ModificationHistory[] {
    return this.history
      .filter((h) => h.filePath === filePath)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }

  /**
   * Preview what a modification would look like
   */
  previewModification(
    currentCode: string,
    originalCode: string,
    modifiedCode: string
  ): {
    success: boolean;
    preview?: string;
    error?: string;
  } {
    if (!currentCode.includes(originalCode)) {
      return {
        success: false,
        error: 'Original code not found in current content',
      };
    }

    const preview = currentCode.replace(originalCode, modifiedCode);
    return { success: true, preview };
  }

  /**
   * Clear modification history
   */
  clearHistory(): void {
    this.history = [];
  }
}

// Singleton instance
let instance: CodeModifierService | null = null;

export function getCodeModifier(projectPath?: string): CodeModifierService {
  if (projectPath) {
    return new CodeModifierService(projectPath);
  }

  if (!instance) {
    instance = new CodeModifierService(process.cwd());
  }

  return instance;
}

export function setModifierProjectPath(projectPath: string): void {
  instance = new CodeModifierService(projectPath);
}
