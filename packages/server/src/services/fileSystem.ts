import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  copyFileSync,
  unlinkSync,
} from 'fs';
import { join, dirname, relative, extname, basename } from 'path';
import { getConfig } from '../config/index.js';

interface FileInfo {
  path: string;
  relativePath: string;
  name: string;
  extension: string;
  size: number;
  isDirectory: boolean;
  modifiedAt: Date;
}

interface FileReadResult {
  success: boolean;
  content?: string;
  error?: string;
}

interface FileWriteResult {
  success: boolean;
  path: string;
  error?: string;
}

/**
 * File System Service for safe file operations
 */
export class FileSystemService {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Get the project root path
   */
  getProjectPath(): string {
    return this.projectPath;
  }

  /**
   * Resolve a path relative to the project root
   */
  resolvePath(relativePath: string): string {
    if (relativePath.startsWith('/')) {
      return relativePath;
    }
    return join(this.projectPath, relativePath);
  }

  /**
   * Get relative path from project root
   */
  getRelativePath(absolutePath: string): string {
    return relative(this.projectPath, absolutePath);
  }

  /**
   * Check if a path is within the project directory (security check)
   */
  isWithinProject(filePath: string): boolean {
    const resolved = this.resolvePath(filePath);
    const relative = this.getRelativePath(resolved);
    return !relative.startsWith('..') && !relative.startsWith('/');
  }

  /**
   * Check if a file exists
   */
  exists(filePath: string): boolean {
    const resolved = this.resolvePath(filePath);
    return existsSync(resolved);
  }

  /**
   * Read a file's content
   */
  readFile(filePath: string): FileReadResult {
    try {
      const resolved = this.resolvePath(filePath);

      if (!this.isWithinProject(resolved)) {
        return {
          success: false,
          error: 'Path is outside project directory',
        };
      }

      if (!existsSync(resolved)) {
        return {
          success: false,
          error: `File not found: ${filePath}`,
        };
      }

      const content = readFileSync(resolved, 'utf-8');
      return { success: true, content };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error reading file',
      };
    }
  }

  /**
   * Write content to a file
   */
  writeFile(filePath: string, content: string): FileWriteResult {
    try {
      const resolved = this.resolvePath(filePath);

      if (!this.isWithinProject(resolved)) {
        return {
          success: false,
          path: resolved,
          error: 'Path is outside project directory',
        };
      }

      // Ensure directory exists
      const dir = dirname(resolved);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(resolved, content, 'utf-8');
      return { success: true, path: resolved };
    } catch (error) {
      return {
        success: false,
        path: filePath,
        error: error instanceof Error ? error.message : 'Unknown error writing file',
      };
    }
  }

  /**
   * Copy a file
   */
  copyFile(sourcePath: string, destPath: string): FileWriteResult {
    try {
      const resolvedSource = this.resolvePath(sourcePath);
      const resolvedDest = this.resolvePath(destPath);

      if (!this.isWithinProject(resolvedSource) || !this.isWithinProject(resolvedDest)) {
        return {
          success: false,
          path: resolvedDest,
          error: 'Path is outside project directory',
        };
      }

      // Ensure destination directory exists
      const dir = dirname(resolvedDest);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      copyFileSync(resolvedSource, resolvedDest);
      return { success: true, path: resolvedDest };
    } catch (error) {
      return {
        success: false,
        path: destPath,
        error: error instanceof Error ? error.message : 'Unknown error copying file',
      };
    }
  }

  /**
   * Delete a file
   */
  deleteFile(filePath: string): { success: boolean; error?: string } {
    try {
      const resolved = this.resolvePath(filePath);

      if (!this.isWithinProject(resolved)) {
        return {
          success: false,
          error: 'Path is outside project directory',
        };
      }

      if (!existsSync(resolved)) {
        return { success: true }; // Already deleted
      }

      unlinkSync(resolved);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error deleting file',
      };
    }
  }

  /**
   * Get file information
   */
  getFileInfo(filePath: string): FileInfo | null {
    try {
      const resolved = this.resolvePath(filePath);

      if (!existsSync(resolved)) {
        return null;
      }

      const stats = statSync(resolved);
      return {
        path: resolved,
        relativePath: this.getRelativePath(resolved),
        name: basename(resolved),
        extension: extname(resolved),
        size: stats.size,
        isDirectory: stats.isDirectory(),
        modifiedAt: stats.mtime,
      };
    } catch {
      return null;
    }
  }

  /**
   * List files in a directory
   */
  listFiles(
    dirPath: string,
    options: {
      recursive?: boolean;
      extensions?: string[];
      exclude?: string[];
    } = {}
  ): FileInfo[] {
    const { recursive = false, extensions = [], exclude = [] } = options;
    const results: FileInfo[] = [];

    const defaultExclude = ['node_modules', '.git', 'dist', 'build', '.next'];
    const excludeSet = new Set([...defaultExclude, ...exclude]);

    const scanDir = (currentPath: string) => {
      try {
        const resolved = this.resolvePath(currentPath);

        if (!existsSync(resolved)) {
          return;
        }

        const entries = readdirSync(resolved);

        for (const entry of entries) {
          if (excludeSet.has(entry) || entry.startsWith('.')) {
            continue;
          }

          const entryPath = join(resolved, entry);
          const stats = statSync(entryPath);

          if (stats.isDirectory()) {
            if (recursive) {
              scanDir(entryPath);
            }
          } else {
            const ext = extname(entry);
            if (extensions.length === 0 || extensions.includes(ext)) {
              results.push({
                path: entryPath,
                relativePath: this.getRelativePath(entryPath),
                name: entry,
                extension: ext,
                size: stats.size,
                isDirectory: false,
                modifiedAt: stats.mtime,
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning directory ${currentPath}:`, error);
      }
    };

    scanDir(dirPath);
    return results;
  }

  /**
   * Find React component files in the project
   */
  findReactFiles(): FileInfo[] {
    return this.listFiles('.', {
      recursive: true,
      extensions: ['.jsx', '.tsx', '.js', '.ts'],
      exclude: ['__tests__', '__mocks__', '*.test.*', '*.spec.*'],
    }).filter((file) => {
      // Exclude test files
      if (
        file.name.includes('.test.') ||
        file.name.includes('.spec.') ||
        file.name.includes('.stories.')
      ) {
        return false;
      }
      return true;
    });
  }

  /**
   * Find a file by component name
   */
  findFileByComponentName(componentName: string): FileInfo | null {
    const reactFiles = this.findReactFiles();

    // Try exact match first
    const exactMatch = reactFiles.find(
      (f) =>
        f.name === `${componentName}.tsx` ||
        f.name === `${componentName}.jsx` ||
        f.name === `${componentName}.ts` ||
        f.name === `${componentName}.js`
    );

    if (exactMatch) {
      return exactMatch;
    }

    // Try index file in component folder
    const indexMatch = reactFiles.find(
      (f) =>
        f.relativePath.includes(`/${componentName}/index.`) ||
        f.relativePath.includes(`\\${componentName}\\index.`)
    );

    if (indexMatch) {
      return indexMatch;
    }

    // Try to find file containing the component (read and check)
    for (const file of reactFiles) {
      const result = this.readFile(file.path);
      if (result.success && result.content) {
        // Check for component definition patterns
        const patterns = [
          new RegExp(`function\\s+${componentName}\\s*[(<]`),
          new RegExp(`const\\s+${componentName}\\s*=`),
          new RegExp(`class\\s+${componentName}\\s+extends`),
          new RegExp(`export\\s+(?:default\\s+)?(?:function|const|class)\\s+${componentName}`),
        ];

        if (patterns.some((p) => p.test(result.content!))) {
          return file;
        }
      }
    }

    return null;
  }

  /**
   * Create backup directory
   */
  ensureBackupDir(): string {
    const config = getConfig();
    const backupDir = this.resolvePath(config.backup.backupDir);

    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }

    return backupDir;
  }
}

// Singleton instance for convenience
let defaultInstance: FileSystemService | null = null;

export function getFileSystemService(projectPath?: string): FileSystemService {
  if (projectPath) {
    return new FileSystemService(projectPath);
  }

  if (!defaultInstance) {
    defaultInstance = new FileSystemService(process.cwd());
  }

  return defaultInstance;
}

export function setProjectPath(projectPath: string): void {
  defaultInstance = new FileSystemService(projectPath);
}
