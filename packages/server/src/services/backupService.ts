import { randomUUID } from 'crypto';
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  statSync,
} from 'fs';
import { join, basename } from 'path';
import { getConfig } from '../config/index.js';
import { getFileSystemService } from './fileSystem.js';
import type { BackupEntry } from '../types/index.js';

interface BackupManifest {
  version: string;
  entries: BackupEntry[];
}

/**
 * Backup Service for managing file backups and restoration
 */
export class BackupService {
  private projectPath: string;
  private backupDir: string;
  private manifestPath: string;
  private manifest: BackupManifest;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    const config = getConfig();
    this.backupDir = join(projectPath, config.backup.backupDir);
    this.manifestPath = join(this.backupDir, 'manifest.json');
    this.manifest = this.loadManifest();
  }

  /**
   * Initialize backup directory and manifest
   */
  private loadManifest(): BackupManifest {
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
    }

    if (existsSync(this.manifestPath)) {
      try {
        const content = readFileSync(this.manifestPath, 'utf-8');
        return JSON.parse(content);
      } catch {
        return { version: '1.0', entries: [] };
      }
    }

    return { version: '1.0', entries: [] };
  }

  /**
   * Save manifest to disk
   */
  private saveManifest(): void {
    writeFileSync(this.manifestPath, JSON.stringify(this.manifest, null, 2));
  }

  /**
   * Create a backup of a file before modification
   */
  async createBackup(
    filePath: string,
    reason: string
  ): Promise<BackupEntry | null> {
    const config = getConfig();

    if (!config.backup.enabled) {
      return null;
    }

    const fs = getFileSystemService(this.projectPath);
    const readResult = fs.readFile(filePath);

    if (!readResult.success || !readResult.content) {
      console.error(`Failed to read file for backup: ${filePath}`);
      return null;
    }

    // Generate unique backup filename
    const id = randomUUID();
    const timestamp = new Date();
    const originalName = basename(filePath);
    const backupFileName = `${timestamp.getTime()}-${id}-${originalName}`;
    const backupPath = join(this.backupDir, backupFileName);

    try {
      // Write backup file
      writeFileSync(backupPath, readResult.content, 'utf-8');

      // Create backup entry
      const entry: BackupEntry = {
        id,
        filePath,
        backupPath,
        timestamp,
        originalContent: readResult.content,
        reason,
      };

      // Add to manifest
      this.manifest.entries.push(entry);

      // Enforce max backups limit
      await this.enforceMaxBackups();

      // Save updated manifest
      this.saveManifest();

      return entry;
    } catch (error) {
      console.error(`Failed to create backup: ${error}`);
      return null;
    }
  }

  /**
   * Restore a file from a backup
   */
  async restoreBackup(backupId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const entry = this.manifest.entries.find((e) => e.id === backupId);

    if (!entry) {
      return { success: false, error: 'Backup not found' };
    }

    try {
      // Read backup content
      let content: string;

      if (existsSync(entry.backupPath)) {
        content = readFileSync(entry.backupPath, 'utf-8');
      } else if (entry.originalContent) {
        content = entry.originalContent;
      } else {
        return { success: false, error: 'Backup file not found and no cached content' };
      }

      // Write content back to original file
      const fs = getFileSystemService(this.projectPath);
      const writeResult = fs.writeFile(entry.filePath, content);

      if (!writeResult.success) {
        return {
          success: false,
          ...(writeResult.error && { error: writeResult.error }),
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Restoration failed',
      };
    }
  }

  /**
   * Get all backups for a specific file
   */
  getBackupsForFile(filePath: string): BackupEntry[] {
    return this.manifest.entries
      .filter((e) => e.filePath === filePath)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get the most recent backup for a file
   */
  getLatestBackup(filePath: string): BackupEntry | null {
    const backups = this.getBackupsForFile(filePath);
    return backups[0] || null;
  }

  /**
   * Get all backups
   */
  getAllBackups(): BackupEntry[] {
    return [...this.manifest.entries].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Delete a specific backup
   */
  deleteBackup(backupId: string): boolean {
    const entryIndex = this.manifest.entries.findIndex((e) => e.id === backupId);

    if (entryIndex === -1) {
      return false;
    }

    const entry = this.manifest.entries[entryIndex];

    // Delete backup file
    if (entry && existsSync(entry.backupPath)) {
      try {
        unlinkSync(entry.backupPath);
      } catch {
        // File might already be deleted
      }
    }

    // Remove from manifest
    this.manifest.entries.splice(entryIndex, 1);
    this.saveManifest();

    return true;
  }

  /**
   * Enforce maximum backup limit
   */
  private async enforceMaxBackups(): Promise<void> {
    const config = getConfig();
    const maxBackups = config.backup.maxBackups;

    while (this.manifest.entries.length > maxBackups) {
      // Remove oldest backup
      const oldest = this.manifest.entries.shift();
      if (oldest && existsSync(oldest.backupPath)) {
        try {
          unlinkSync(oldest.backupPath);
        } catch {
          // Ignore errors
        }
      }
    }
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let deletedCount = 0;

    this.manifest.entries = this.manifest.entries.filter((entry) => {
      const entryDate = new Date(entry.timestamp);
      if (entryDate < cutoffDate) {
        // Delete backup file
        if (existsSync(entry.backupPath)) {
          try {
            unlinkSync(entry.backupPath);
          } catch {
            // Ignore errors
          }
        }
        deletedCount++;
        return false;
      }
      return true;
    });

    this.saveManifest();
    return deletedCount;
  }

  /**
   * Get backup statistics
   */
  getStatistics(): {
    totalBackups: number;
    totalSize: number;
    oldestBackup: Date | null;
    newestBackup: Date | null;
    filesCovered: number;
  } {
    const entries = this.manifest.entries;

    if (entries.length === 0) {
      return {
        totalBackups: 0,
        totalSize: 0,
        oldestBackup: null,
        newestBackup: null,
        filesCovered: 0,
      };
    }

    // Calculate total size
    let totalSize = 0;
    entries.forEach((entry) => {
      if (existsSync(entry.backupPath)) {
        try {
          const stats = statSync(entry.backupPath);
          totalSize += stats.size;
        } catch {
          // Ignore errors
        }
      }
    });

    // Get unique files
    const uniqueFiles = new Set(entries.map((e) => e.filePath));

    // Get date range
    const dates = entries.map((e) => new Date(e.timestamp).getTime());

    return {
      totalBackups: entries.length,
      totalSize,
      oldestBackup: new Date(Math.min(...dates)),
      newestBackup: new Date(Math.max(...dates)),
      filesCovered: uniqueFiles.size,
    };
  }

  /**
   * Verify backup integrity
   */
  verifyIntegrity(): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    this.manifest.entries.forEach((entry) => {
      if (!existsSync(entry.backupPath)) {
        if (!entry.originalContent) {
          issues.push(`Backup file missing and no cached content: ${entry.id}`);
        }
      }
    });

    // Check for orphaned files
    if (existsSync(this.backupDir)) {
      const files = readdirSync(this.backupDir);
      const manifestPaths = new Set(this.manifest.entries.map((e) => basename(e.backupPath)));

      files.forEach((file) => {
        if (file !== 'manifest.json' && !manifestPaths.has(file)) {
          issues.push(`Orphaned backup file: ${file}`);
        }
      });
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

// Singleton instance
let defaultInstance: BackupService | null = null;

export function getBackupService(projectPath?: string): BackupService {
  if (projectPath) {
    return new BackupService(projectPath);
  }

  if (!defaultInstance) {
    defaultInstance = new BackupService(process.cwd());
  }

  return defaultInstance;
}

export function setBackupProjectPath(projectPath: string): void {
  defaultInstance = new BackupService(projectPath);
}
