import simpleGit, { SimpleGit, StatusResult, LogResult } from 'simple-git';
import { getConfig } from '../config/index.js';
import type { GitStatus, GitCommit, GitDiff } from '../types/index.js';

/**
 * Git Service for version control operations
 */
export class GitService {
  private git: SimpleGit;
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.git = simpleGit(projectPath);
  }

  /**
   * Check if the directory is a Git repository
   */
  async isGitRepo(): Promise<boolean> {
    try {
      await this.git.status();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the current Git status
   */
  async getStatus(): Promise<GitStatus> {
    try {
      const status: StatusResult = await this.git.status();

      return {
        isRepo: true,
        branch: status.current || 'unknown',
        isClean: status.isClean(),
        staged: status.staged,
        unstaged: status.modified,
        untracked: status.not_added,
        ahead: status.ahead,
        behind: status.behind,
      };
    } catch {
      return {
        isRepo: false,
        branch: '',
        isClean: true,
        staged: [],
        unstaged: [],
        untracked: [],
        ahead: 0,
        behind: 0,
      };
    }
  }

  /**
   * Check if working directory is clean
   */
  async isWorkingDirClean(): Promise<boolean> {
    const status = await this.getStatus();
    return status.isClean;
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string> {
    try {
      const status = await this.git.status();
      return status.current || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Create a new branch
   */
  async createBranch(branchName: string, checkout = true): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const config = getConfig();
      const fullBranchName = `${config.git.branchPrefix}${branchName}`;

      if (checkout) {
        await this.git.checkoutLocalBranch(fullBranchName);
      } else {
        await this.git.branch([fullBranchName]);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create branch',
      };
    }
  }

  /**
   * Checkout an existing branch
   */
  async checkoutBranch(branchName: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.git.checkout(branchName);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to checkout branch',
      };
    }
  }

  /**
   * Stage files for commit
   */
  async stageFiles(files: string | string[]): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.git.add(files);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stage files',
      };
    }
  }

  /**
   * Create a commit
   */
  async commit(message: string, files?: string[]): Promise<{
    success: boolean;
    hash?: string;
    error?: string;
  }> {
    try {
      const config = getConfig();
      const fullMessage = `${config.git.commitMessagePrefix} ${message}`;

      if (files && files.length > 0) {
        await this.git.add(files);
      }

      const result = await this.git.commit(fullMessage);
      return {
        success: true,
        hash: result.commit,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to commit',
      };
    }
  }

  /**
   * Get the diff for a file
   */
  async getFileDiff(filePath: string): Promise<GitDiff | null> {
    try {
      const diff = await this.git.diff([filePath]);

      if (!diff) {
        return null;
      }

      // Parse the diff output
      const lines = diff.split('\n');
      let additions = 0;
      let deletions = 0;

      lines.forEach((line) => {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          additions++;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          deletions++;
        }
      });

      return {
        filePath,
        additions,
        deletions,
        hunks: [], // Simplified - full hunk parsing would be more complex
      };
    } catch {
      return null;
    }
  }

  /**
   * Get staged diff for a file
   */
  async getStagedDiff(filePath?: string): Promise<string> {
    try {
      const args = ['--cached'];
      if (filePath) {
        args.push(filePath);
      }
      return await this.git.diff(args);
    } catch {
      return '';
    }
  }

  /**
   * Revert a specific commit
   */
  async revertCommit(commitHash: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.git.revert(commitHash, { '--no-commit': null });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revert commit',
      };
    }
  }

  /**
   * Reset a file to its state in HEAD
   */
  async resetFile(filePath: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.git.checkout(['HEAD', '--', filePath]);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset file',
      };
    }
  }

  /**
   * Get commit history
   */
  async getHistory(options: {
    maxCount?: number;
    file?: string;
  } = {}): Promise<GitCommit[]> {
    try {
      const { maxCount = 50, file } = options;

      const logOptions: Record<string, unknown> = {
        maxCount,
      };

      if (file) {
        logOptions.file = file;
      }

      const log: LogResult = await this.git.log(logOptions);

      return log.all.map((entry) => ({
        hash: entry.hash,
        message: entry.message,
        author: entry.author_name,
        date: new Date(entry.date),
        files: [], // Would need additional git show command to get files
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get the content of a file at a specific commit
   */
  async getFileAtCommit(filePath: string, commitHash: string): Promise<{
    success: boolean;
    content?: string;
    error?: string;
  }> {
    try {
      const content = await this.git.show([`${commitHash}:${filePath}`]);
      return { success: true, content };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get file at commit',
      };
    }
  }

  /**
   * Check for merge conflicts
   */
  async hasMergeConflicts(): Promise<boolean> {
    const status = await this.getStatus();
    return status.unstaged.some((file) =>
      file.includes('both modified') || file.includes('both added')
    );
  }

  /**
   * Stash current changes
   */
  async stash(message?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      if (message) {
        await this.git.stash(['push', '-m', message]);
      } else {
        await this.git.stash();
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stash changes',
      };
    }
  }

  /**
   * Pop the latest stash
   */
  async stashPop(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.git.stash(['pop']);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to pop stash',
      };
    }
  }

  /**
   * Get list of stashes
   */
  async listStashes(): Promise<string[]> {
    try {
      const result = await this.git.stashList();
      return result.all.map((stash) => stash.message);
    } catch {
      return [];
    }
  }

  /**
   * Check if a specific file has uncommitted changes
   */
  async hasUncommittedChanges(filePath: string): Promise<boolean> {
    const status = await this.getStatus();
    return (
      status.unstaged.includes(filePath) ||
      status.staged.includes(filePath) ||
      status.untracked.includes(filePath)
    );
  }
}

// Singleton instance
let defaultInstance: GitService | null = null;

export function getGitService(projectPath?: string): GitService {
  if (projectPath) {
    return new GitService(projectPath);
  }

  if (!defaultInstance) {
    defaultInstance = new GitService(process.cwd());
  }

  return defaultInstance;
}

export function setGitProjectPath(projectPath: string): void {
  defaultInstance = new GitService(projectPath);
}
