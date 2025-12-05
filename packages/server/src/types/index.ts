// Core type definitions for React Dev Insight Pro Server

export interface Config {
  git: GitConfig;
  llm: LLMConfig;
  optimization: OptimizationConfig;
  server: ServerConfig;
  backup: BackupConfig;
  ui: UIConfig;
}

export interface GitConfig {
  autoCommit: boolean;
  branchPrefix: string;
  requireCleanWorkingDir: boolean;
  commitMessagePrefix: string;
}

export interface LLMConfig {
  provider: 'anthropic' | 'openai';
  model: string;
  temperature: number;
  maxTokens: number;
  maxChangesPerRequest: number;
}

export interface OptimizationConfig {
  allowedCategories: OptimizationCategory[];
  requireReview: boolean;
  autoRunTests: boolean;
  autoFormat: boolean;
}

export interface ServerConfig {
  port: number;
  host: string;
}

export interface BackupConfig {
  enabled: boolean;
  maxBackups: number;
  backupDir: string;
}

export interface UIConfig {
  theme: 'light' | 'dark';
  showLineNumbers: boolean;
  diffStyle: 'split' | 'unified';
}

export type OptimizationCategory =
  | 'performance'
  | 'accessibility'
  | 'maintainability'
  | 'bundle-size'
  | 'ux'
  | 'code-quality';

// Element and Component Types
export interface BoundingRect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ElementInfo {
  tagName: string;
  className: string;
  id: string;
  attributes: Record<string, string>;
  textContent: string;
  boundingRect: BoundingRect;
  xpath: string;
}

export interface ComponentInfo {
  name: string;
  displayName: string | null;
  filePath: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
  props: Record<string, unknown>;
  state: Record<string, unknown> | null;
  hooks: HookInfo[];
  fiber: FiberInfo | null;
}

export interface HookInfo {
  name: string;
  value: unknown;
  dependencies?: unknown[];
}

export interface FiberInfo {
  tag: number;
  type: string;
  key: string | null;
  stateNode: unknown;
}

// Analysis Types
export interface AnalysisRequest {
  elementInfo: ElementInfo;
  componentInfo: ComponentInfo;
  optimizationGoal: string;
  category?: OptimizationCategory;
  projectPath: string;
}

export interface AnalysisResult {
  id: string;
  timestamp: Date;
  componentName: string;
  filePath: string;
  originalCode: string;
  analysis: CodeAnalysis;
  suggestions: CodeSuggestion[];
}

export interface CodeAnalysis {
  summary: string;
  issues: CodeIssue[];
  metrics: CodeMetrics;
}

export interface CodeIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
  category: OptimizationCategory;
}

export interface CodeMetrics {
  linesOfCode: number;
  complexity: number;
  dependencies: string[];
  exports: string[];
}

export interface CodeSuggestion {
  id: string;
  title: string;
  description: string;
  category: OptimizationCategory;
  priority: 'high' | 'medium' | 'low';
  originalCode: string;
  modifiedCode: string;
  explanation: string;
  lineStart: number;
  lineEnd: number;
  confidence: number;
}

// Modification Types
export interface ModificationRequest {
  suggestionId: string;
  filePath: string;
  originalCode: string;
  modifiedCode: string;
  commitMessage?: string;
  createBranch?: boolean;
  branchName?: string;
}

export interface ModificationResult {
  success: boolean;
  filePath: string;
  backupPath?: string;
  commitHash?: string;
  error?: string;
  validation: ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  syntaxErrors: SyntaxError[];
  typeErrors: string[];
  lintErrors: string[];
}

export interface SyntaxError {
  message: string;
  line: number;
  column: number;
}

// Git Types
export interface GitStatus {
  isRepo: boolean;
  branch: string;
  isClean: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  ahead: number;
  behind: number;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: Date;
  files: string[];
}

export interface GitDiff {
  filePath: string;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
}

// History Types
export interface ModificationHistory {
  id: string;
  timestamp: Date;
  filePath: string;
  componentName: string;
  optimizationGoal: string;
  category: OptimizationCategory;
  status: 'applied' | 'reverted' | 'rejected';
  commitHash?: string;
  backupPath?: string;
  suggestion: CodeSuggestion;
}

// LLM Types
export interface LLMRequest {
  prompt: string;
  systemPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  model: string;
}

// WebSocket Types
export interface WSMessage {
  type: WSMessageType;
  payload: unknown;
  timestamp: Date;
}

export type WSMessageType =
  | 'element-selected'
  | 'component-info'
  | 'analysis-started'
  | 'analysis-complete'
  | 'modification-started'
  | 'modification-complete'
  | 'error'
  | 'status-update';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  data?: Record<string, unknown>;
}

export type WebSocketMessageType =
  | 'subscribe'
  | 'unsubscribe'
  | 'ping'
  | 'pong'
  | 'connected'
  | 'subscribed'
  | 'unsubscribed'
  | 'error'
  | 'server_shutdown';

// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
}

export interface APIError {
  code: string;
  message: string;
  details?: unknown;
}

// Backup Types
export interface BackupEntry {
  id: string;
  filePath: string;
  backupPath: string;
  timestamp: Date;
  originalContent: string;
  reason: string;
}
