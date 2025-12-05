/**
 * Client Type Definitions
 * 
 * Shared types for the React Dev Insight Pro client application.
 */

// Element Selection
export interface SelectedElement {
  componentName: string;
  filePath: string;
  lineNumber?: number;
  props?: Record<string, unknown>;
  tagName: string;
}

export interface ReactFiberInfo {
  componentName: string;
  props: Record<string, unknown>;
  state: Record<string, unknown>;
  hooks: string[];
  filePath?: string;
  lineNumber?: number;
}

// Optimization
export interface OptimizationGoal {
  category: OptimizationCategory;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export type OptimizationCategory = 
  | 'performance' 
  | 'accessibility' 
  | 'maintainability' 
  | 'bundle-size' 
  | 'ux' 
  | 'code-quality';

// Analysis
export interface AnalysisResult {
  componentName: string;
  filePath: string;
  code: string;
  analysis: {
    summary: string;
    issues: AnalysisIssue[];
    metrics: CodeMetrics;
  };
  suggestions: CodeSuggestion[];
  timestamp: string;
}

export interface AnalysisIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
}

export interface CodeMetrics {
  complexity: number;
  linesOfCode: number;
  dependencies: number;
  hooks: number;
}

// Code Suggestions
export interface CodeSuggestion {
  id: string;
  title: string;
  description: string;
  category: OptimizationCategory;
  priority: 'high' | 'medium' | 'low';
  originalCode: string;
  modifiedCode: string;
  explanation: string;
  lineRange?: {
    start: number;
    end: number;
  };
  confidence?: number;
}

// Modification
export interface ModificationResult {
  success: boolean;
  modificationId?: string;
  filePath: string;
  commitHash?: string;
  backupId?: string;
  error?: string;
}

export interface ModificationEntry {
  id: string;
  timestamp: number;
  filePath: string;
  suggestion?: CodeSuggestion;
  status: 'applied' | 'reverted' | 'failed';
  commitHash?: string;
  backupId?: string;
}

export interface BackupEntry {
  id: string;
  filePath: string;
  backupPath: string;
  timestamp: number;
  reason?: string;
}

// Git
export interface GitStatus {
  branch: string;
  isClean: boolean;
  staged?: string[];
  modified?: string[];
  untracked?: string[];
  ahead?: number;
  behind?: number;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
  isAIGenerated?: boolean;
}

// WebSocket
export interface WSMessage {
  type: WSMessageType;
  data: unknown;
}

export type WSMessageType = 
  | 'connected'
  | 'subscribed'
  | 'unsubscribed'
  | 'analysis_started'
  | 'analysis_complete'
  | 'modification_started'
  | 'modification_complete'
  | 'error'
  | 'ping'
  | 'pong';

// API
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// UI State
export interface PanelState {
  isOpen: boolean;
  activeTab: string;
  width: number;
}

export interface InspectorState {
  isEnabled: boolean;
  selectedElement: SelectedElement | null;
  highlightedElement: HTMLElement | null;
}

export interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  timestamp: number;
}

// Configuration
export interface ClientConfig {
  serverUrl: string;
  projectPath: string;
  autoAnalyze: boolean;
  showNotifications: boolean;
  theme: 'dark' | 'light' | 'system';
}
