import { randomUUID } from 'crypto';
import { getFileSystemService } from './fileSystem.js';
import { getLLMService } from './llmService.js';
import { analyzeReactComponent, extractComponentCode } from '../utils/parser.js';
import type {
  AnalysisRequest,
  AnalysisResult,
  CodeSuggestion,
  ElementInfo,
  CodeAnalysis,
  CodeMetrics,
  OptimizationCategory,
} from '../types/index.js';

/**
 * Code Analyzer Service for inspecting and analyzing React components
 */
export class CodeAnalyzerService {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Analyze an element and its corresponding React component
   */
  async analyzeElement(request: AnalysisRequest): Promise<AnalysisResult> {
    const fs = getFileSystemService(this.projectPath);
    const llm = getLLMService();

    // Find the source file
    const filePath = request.componentInfo.filePath;
    if (!filePath) {
      throw new Error('Component file path not provided');
    }

    // Read the source file
    const readResult = fs.readFile(filePath);
    if (!readResult.success || !readResult.content) {
      throw new Error(`Failed to read file: ${filePath}`);
    }

    const sourceCode = readResult.content;

    // Parse and analyze the code
    const parseResult = analyzeReactComponent(sourceCode, filePath);

    // Extract specific component code if component name is known
    let componentCode = sourceCode;
    const componentName =
      request.componentInfo.name ||
      request.componentInfo.displayName ||
      parseResult.componentName;

    if (componentName) {
      const extracted = extractComponentCode(sourceCode, componentName, filePath);
      if (extracted) {
        componentCode = extracted;
      }
    }

    // Get AI analysis if available
    let aiAnalysis: { analysis: CodeAnalysis; suggestions: CodeSuggestion[] };

    if (llm.isAvailable()) {
      const analyzeParams: {
        componentName: string;
        filePath: string;
        code: string;
        optimizationGoal: string;
        category?: OptimizationCategory;
        componentInfo?: typeof request.componentInfo;
        metrics?: typeof parseResult.metrics;
      } = {
        componentName: componentName || 'Unknown',
        filePath,
        code: componentCode,
        optimizationGoal: request.optimizationGoal,
        componentInfo: request.componentInfo,
        metrics: parseResult.metrics,
      };
      if (request.category !== undefined) {
        analyzeParams.category = request.category;
      }
      aiAnalysis = await llm.analyzeComponent(analyzeParams);
    } else {
      // Fallback to basic analysis without AI
      aiAnalysis = this.performBasicAnalysis(componentCode, parseResult.metrics);
    }

    return {
      id: randomUUID(),
      timestamp: new Date(),
      componentName: componentName || 'Unknown',
      filePath,
      originalCode: componentCode,
      analysis: aiAnalysis.analysis,
      suggestions: aiAnalysis.suggestions,
    };
  }

  /**
   * Perform basic analysis without AI
   */
  private performBasicAnalysis(
    code: string,
    metrics: CodeMetrics
  ): { analysis: CodeAnalysis; suggestions: CodeSuggestion[] } {
    const issues: CodeAnalysis['issues'] = [];
    const suggestions: CodeSuggestion[] = [];

    // Check for common issues

    // Check for missing React.memo
    if (!code.includes('React.memo') && !code.includes('memo(')) {
      if (code.includes('props') || /function\s+\w+\s*\(\s*{/.test(code)) {
        suggestions.push({
          id: `basic-memo-${Date.now()}`,
          title: 'Consider using React.memo',
          description:
            'This component might benefit from memoization to prevent unnecessary re-renders',
          category: 'performance',
          priority: 'medium',
          originalCode: '',
          modifiedCode: '',
          explanation:
            'React.memo can help prevent unnecessary re-renders when props have not changed.',
          lineStart: 1,
          lineEnd: 1,
          confidence: 0.6,
        });
      }
    }

    // Check for inline functions in JSX
    const inlineFunctionPattern = /onClick=\{.*=>/;
    if (inlineFunctionPattern.test(code)) {
      issues.push({
        type: 'warning',
        message: 'Inline function in JSX may cause unnecessary re-renders',
        category: 'performance',
      });
    }

    // Check for missing ARIA attributes on interactive elements
    const buttonWithoutAria = /<button[^>]*(?!aria-)[^>]*>/i;
    if (buttonWithoutAria.test(code) && !code.includes('aria-label')) {
      issues.push({
        type: 'info',
        message: 'Consider adding ARIA attributes for accessibility',
        category: 'accessibility',
      });
    }

    // Check for console.log
    if (code.includes('console.log')) {
      issues.push({
        type: 'warning',
        message: 'Console.log statement found - remove before production',
        category: 'code-quality',
      });
    }

    // Check for useEffect without cleanup
    const useEffectPattern = /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*\}\s*,/;
    const useEffectCleanupPattern = /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*return/;
    if (useEffectPattern.test(code) && !useEffectCleanupPattern.test(code)) {
      issues.push({
        type: 'info',
        message:
          'useEffect without cleanup function - ensure no subscriptions or timers need cleanup',
        category: 'code-quality',
      });
    }

    // Check for missing key prop in map
    const mapWithoutKey = /\.map\s*\([^)]*\)\s*=>\s*\(/;
    if (mapWithoutKey.test(code) && !code.includes('key=')) {
      issues.push({
        type: 'warning',
        message: 'List items may be missing key prop',
        category: 'performance',
      });
    }

    // Check for high complexity
    if (metrics.complexity > 15) {
      issues.push({
        type: 'warning',
        message: `High cyclomatic complexity (${metrics.complexity}) - consider breaking into smaller components`,
        category: 'maintainability',
      });
    }

    // Check for long files
    if (metrics.linesOfCode > 300) {
      issues.push({
        type: 'info',
        message: `File has ${metrics.linesOfCode} lines - consider splitting into multiple files`,
        category: 'maintainability',
      });
    }

    return {
      analysis: {
        summary: `Component with ${metrics.linesOfCode} lines of code and complexity score of ${metrics.complexity}`,
        issues,
        metrics,
      },
      suggestions,
    };
  }

  /**
   * Find the source file for a component
   */
  async findComponentFile(componentName: string): Promise<string | null> {
    const fs = getFileSystemService(this.projectPath);
    const fileInfo = fs.findFileByComponentName(componentName);
    return fileInfo ? fileInfo.path : null;
  }

  /**
   * Get component info from source file
   */
  async getComponentInfo(
    filePath: string,
    componentName?: string
  ): Promise<{
    code: string;
    metrics: CodeMetrics;
    props: string[];
    hooks: string[];
  }> {
    const fs = getFileSystemService(this.projectPath);
    const readResult = fs.readFile(filePath);

    if (!readResult.success || !readResult.content) {
      throw new Error(`Failed to read file: ${filePath}`);
    }

    const parseResult = analyzeReactComponent(readResult.content, filePath);

    let code = readResult.content;
    if (componentName) {
      const extracted = extractComponentCode(
        readResult.content,
        componentName,
        filePath
      );
      if (extracted) {
        code = extracted;
      }
    }

    return {
      code,
      metrics: parseResult.metrics,
      props: parseResult.props,
      hooks: parseResult.hooks.map((h) => h.name),
    };
  }

  /**
   * Batch analyze multiple components
   */
  async analyzeMultiple(
    componentPaths: string[],
    goal: string
  ): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];

    for (const filePath of componentPaths) {
      try {
        const result = await this.analyzeElement({
          elementInfo: {} as ElementInfo,
          componentInfo: {
            name: '',
            displayName: null,
            filePath,
            lineNumber: null,
            columnNumber: null,
            props: {},
            state: null,
            hooks: [],
            fiber: null,
          },
          optimizationGoal: goal,
          projectPath: this.projectPath,
        });
        results.push(result);
      } catch (error) {
        console.error(`Failed to analyze ${filePath}:`, error);
      }
    }

    return results;
  }

  /**
   * Get suggestions for a specific category
   */
  filterSuggestionsByCategory(
    suggestions: CodeSuggestion[],
    category: string
  ): CodeSuggestion[] {
    return suggestions.filter((s) => s.category === category);
  }

  /**
   * Sort suggestions by priority and confidence
   */
  sortSuggestions(suggestions: CodeSuggestion[]): CodeSuggestion[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 };

    return [...suggestions].sort((a, b) => {
      // First by priority
      const priorityDiff =
        priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by confidence
      return b.confidence - a.confidence;
    });
  }
}

// Singleton instance
let instance: CodeAnalyzerService | null = null;

export function getCodeAnalyzer(projectPath?: string): CodeAnalyzerService {
  if (projectPath) {
    return new CodeAnalyzerService(projectPath);
  }

  if (!instance) {
    instance = new CodeAnalyzerService(process.cwd());
  }

  return instance;
}

export function setAnalyzerProjectPath(projectPath: string): void {
  instance = new CodeAnalyzerService(projectPath);
}
