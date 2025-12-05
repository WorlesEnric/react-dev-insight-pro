/**
 * API Service
 * 
 * Client-side service for communicating with the React Dev Insight Pro server.
 * Handles all HTTP requests with proper error handling and typing.
 */

import type {
  AnalysisResult,
  CodeSuggestion,
  ModificationResult,
  GitStatus,
  BackupEntry,
  ModificationEntry,
  OptimizationCategory
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3847/api';

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };
  
  try {
    const response = await fetch(url, config);
    const data: APIResponse<T> = await response.json();
    
    if (!response.ok || !data.success) {
      throw new APIError(
        data.error || 'Request failed',
        response.status,
        data.error
      );
    }
    
    return data.data as T;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    
    throw new APIError(
      error instanceof Error ? error.message : 'Network error',
      0
    );
  }
}

// ============================================
// Analysis Endpoints
// ============================================

export interface AnalyzeElementParams {
  projectPath: string;
  componentInfo: {
    name: string;
    filePath: string;
    lineNumber?: number;
  };
  goal: OptimizationCategory | string;
}

export async function analyzeElement(params: AnalyzeElementParams): Promise<AnalysisResult> {
  return request<AnalysisResult>('/analysis/element', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

export async function analyzeFile(
  projectPath: string,
  filePath: string,
  goal?: string
): Promise<AnalysisResult> {
  return request<AnalysisResult>('/analysis/file', {
    method: 'POST',
    body: JSON.stringify({ projectPath, filePath, goal })
  });
}

export async function analyzeComponentByName(
  projectPath: string,
  componentName: string,
  goal?: string
): Promise<AnalysisResult> {
  const params = new URLSearchParams({ projectPath });
  if (goal) params.set('goal', goal);
  
  return request<AnalysisResult>(
    `/analysis/component/${encodeURIComponent(componentName)}?${params}`
  );
}

export async function listReactFiles(projectPath: string): Promise<string[]> {
  const params = new URLSearchParams({ projectPath });
  return request<string[]>(`/analysis/files?${params}`);
}

// ============================================
// Modification Endpoints
// ============================================

export interface ApplyModificationParams {
  projectPath: string;
  filePath: string;
  originalCode: string;
  modifiedCode: string;
  description: string;
  createBranch?: boolean;
}

export async function applyModification(
  params: ApplyModificationParams
): Promise<ModificationResult> {
  return request<ModificationResult>('/modification/apply', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

export async function applySuggestion(
  projectPath: string,
  filePath: string,
  suggestion: CodeSuggestion
): Promise<ModificationResult> {
  return request<ModificationResult>('/modification/suggestion', {
    method: 'POST',
    body: JSON.stringify({ projectPath, filePath, suggestion })
  });
}

export async function applyMultipleSuggestions(
  projectPath: string,
  filePath: string,
  suggestions: CodeSuggestion[]
): Promise<ModificationResult> {
  return request<ModificationResult>('/modification/batch', {
    method: 'POST',
    body: JSON.stringify({ projectPath, filePath, suggestions })
  });
}

export async function revertModification(
  projectPath: string,
  modificationId: string
): Promise<{ reverted: boolean }> {
  return request<{ reverted: boolean }>('/modification/revert', {
    method: 'POST',
    body: JSON.stringify({ projectPath, modificationId })
  });
}

export interface PreviewResult {
  original: string;
  modified: string;
  diff: {
    additions: number;
    deletions: number;
  };
}

export async function previewModification(
  projectPath: string,
  filePath: string,
  originalCode: string,
  modifiedCode: string
): Promise<PreviewResult> {
  return request<PreviewResult>('/modification/preview', {
    method: 'POST',
    body: JSON.stringify({ projectPath, filePath, originalCode, modifiedCode })
  });
}

export async function getModificationHistory(
  projectPath: string,
  filePath?: string
): Promise<ModificationEntry[]> {
  const params = new URLSearchParams({ projectPath });
  if (filePath) params.set('filePath', filePath);
  
  return request<ModificationEntry[]>(`/modification/history?${params}`);
}

export async function listBackups(projectPath: string): Promise<BackupEntry[]> {
  const params = new URLSearchParams({ projectPath });
  return request<BackupEntry[]>(`/modification/backups?${params}`);
}

export async function restoreBackup(
  projectPath: string,
  backupId: string
): Promise<{ restored: boolean }> {
  return request<{ restored: boolean }>('/modification/restore', {
    method: 'POST',
    body: JSON.stringify({ projectPath, backupId })
  });
}

// ============================================
// Git Endpoints
// ============================================

export async function getGitStatus(projectPath: string): Promise<GitStatus> {
  const params = new URLSearchParams({ projectPath });
  return request<GitStatus>(`/git/status?${params}`);
}

export async function createBranch(
  projectPath: string,
  branchName: string,
  checkout = true
): Promise<{ branchName: string; checkedOut: boolean }> {
  return request<{ branchName: string; checkedOut: boolean }>('/git/branch', {
    method: 'POST',
    body: JSON.stringify({ projectPath, branchName, checkout })
  });
}

export async function listBranches(
  projectPath: string
): Promise<{ branches: string[]; current: string }> {
  const params = new URLSearchParams({ projectPath });
  return request<{ branches: string[]; current: string }>(`/git/branches?${params}`);
}

export async function commitChanges(
  projectPath: string,
  message: string,
  files?: string[]
): Promise<{ commitHash: string; message: string }> {
  return request<{ commitHash: string; message: string }>('/git/commit', {
    method: 'POST',
    body: JSON.stringify({ projectPath, message, files })
  });
}

export async function revertCommit(
  projectPath: string,
  commitHash: string
): Promise<{ reverted: string }> {
  return request<{ reverted: string }>('/git/revert', {
    method: 'POST',
    body: JSON.stringify({ projectPath, commitHash })
  });
}

export async function getFileDiff(
  projectPath: string,
  filePath: string,
  staged = false
): Promise<{ raw: string; additions: number; deletions: number }> {
  return request<{ raw: string; additions: number; deletions: number }>('/git/diff', {
    method: 'POST',
    body: JSON.stringify({ projectPath, filePath, staged })
  });
}

export async function getGitHistory(
  projectPath: string,
  filePath?: string,
  limit = 50
): Promise<Array<{
  hash: string;
  date: string;
  message: string;
  author: string;
}>> {
  const params = new URLSearchParams({ projectPath, limit: String(limit) });
  if (filePath) params.set('filePath', filePath);
  
  return request(`/git/history?${params}`);
}

// ============================================
// LLM Endpoints
// ============================================

export async function generateCommitMessage(
  projectPath: string,
  changes: string,
  category: string
): Promise<{ message: string }> {
  return request<{ message: string }>('/llm/commit-message', {
    method: 'POST',
    body: JSON.stringify({ projectPath, changes, category })
  });
}

export async function explainChange(
  projectPath: string,
  original: string,
  modified: string
): Promise<{ explanation: string }> {
  return request<{ explanation: string }>('/llm/explain', {
    method: 'POST',
    body: JSON.stringify({ projectPath, original, modified })
  });
}

export async function validateCode(
  projectPath: string,
  code: string,
  context?: string
): Promise<{
  isValid: boolean;
  issues: Array<{ type: string; message: string; line?: number }>;
}> {
  return request('/llm/validate', {
    method: 'POST',
    body: JSON.stringify({ projectPath, code, context })
  });
}

// ============================================
// Health Check
// ============================================

export async function healthCheck(): Promise<{
  status: string;
  version: string;
  uptime: number;
}> {
  return request('/health');
}

// Export APIError for error handling
export { APIError };
