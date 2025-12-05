import OpenAI from 'openai';
import { getConfig } from '../config/index.js';
import { SYSTEM_PROMPT, buildAnalysisPrompt, buildCommitMessagePrompt } from '../utils/prompts.js';
import type {
  LLMRequest,
  LLMResponse,
  CodeSuggestion,
  CodeAnalysis,
  OptimizationCategory,
  ComponentInfo,
  CodeMetrics,
} from '../types/index.js';

interface AnalysisResponse {
  analysis: CodeAnalysis;
  suggestions: CodeSuggestion[];
}

/**
 * LLM Service for AI-powered code analysis and suggestions
 */
export class LLMService {
  private openai: OpenAI | null = null;
  private initialized = false;
  private baseURL: string | undefined;
  private model: string;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the LLM client
   */
  private initialize(): void {
    const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
    this.baseURL = process.env.LLM_BASE_URL;
    const config = getConfig();
    this.model = process.env.LLM_MODEL_NAME || config.llm.model;

    if (apiKey) {
      const clientConfig: OpenAI.ClientOptions = {
        apiKey,
      };
      if (this.baseURL) {
        clientConfig.baseURL = this.baseURL;
      }
      this.openai = new OpenAI(clientConfig);
      this.initialized = true;
    } else {
      console.warn(
        'LLM_API_KEY or OPENAI_API_KEY not found. LLM features will be disabled.'
      );
    }
  }

  /**
   * Check if LLM service is available
   */
  isAvailable(): boolean {
    return this.initialized && this.openai !== null;
  }

  /**
   * Send a raw request to the LLM
   */
  async sendRequest(request: LLMRequest): Promise<LLMResponse> {
    if (!this.openai) {
      throw new Error('LLM service not initialized. Set LLM_API_KEY or OPENAI_API_KEY.');
    }

    const config = getConfig();
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: request.prompt,
    });

    const response = await this.openai.chat.completions.create({
      model: this.model,
      max_tokens: request.maxTokens ?? config.llm.maxTokens,
      temperature: request.temperature ?? config.llm.temperature,
      messages,
    });

    const content = response.choices[0]?.message?.content || '';

    return {
      content,
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
      },
      model: response.model,
    };
  }

  /**
   * Analyze a React component and generate optimization suggestions
   */
  async analyzeComponent(params: {
    componentName: string;
    filePath: string;
    code: string;
    optimizationGoal: string;
    category?: OptimizationCategory;
    componentInfo?: ComponentInfo;
    metrics?: CodeMetrics;
  }): Promise<AnalysisResponse> {
    if (!this.isAvailable()) {
      throw new Error('LLM service not available');
    }

    const prompt = buildAnalysisPrompt(params);

    const response = await this.sendRequest({
      prompt,
      systemPrompt: SYSTEM_PROMPT,
    });

    // Parse JSON response
    const parsed = this.parseAnalysisResponse(response.content);

    // Generate unique IDs for suggestions
    parsed.suggestions = parsed.suggestions.map((suggestion, index) => ({
      ...suggestion,
      id: suggestion.id || `suggestion-${Date.now()}-${index}`,
    }));

    return parsed;
  }

  /**
   * Parse the LLM response into structured data
   */
  private parseAnalysisResponse(content: string): AnalysisResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!parsed.analysis || !parsed.suggestions) {
        throw new Error('Invalid response structure');
      }

      return {
        analysis: {
          summary: parsed.analysis.summary || 'No summary provided',
          issues: parsed.analysis.issues || [],
          metrics: parsed.analysis.metrics || {
            linesOfCode: 0,
            complexity: 0,
            dependencies: [],
            exports: [],
          },
        },
        suggestions: (parsed.suggestions || []).map((s: Partial<CodeSuggestion>) => ({
          id: s.id || '',
          title: s.title || 'Untitled suggestion',
          description: s.description || '',
          category: s.category || 'code-quality',
          priority: s.priority || 'medium',
          originalCode: s.originalCode || '',
          modifiedCode: s.modifiedCode || '',
          explanation: s.explanation || '',
          lineStart: s.lineStart || 1,
          lineEnd: s.lineEnd || 1,
          confidence: s.confidence || 0.5,
        })),
      };
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      console.error('Raw content:', content);

      // Return empty response on parse failure
      return {
        analysis: {
          summary: 'Failed to parse LLM response',
          issues: [
            {
              type: 'error',
              message: 'Could not parse AI response',
              category: 'code-quality',
            },
          ],
          metrics: {
            linesOfCode: 0,
            complexity: 0,
            dependencies: [],
            exports: [],
          },
        },
        suggestions: [],
      };
    }
  }

  /**
   * Generate a commit message for code changes
   */
  async generateCommitMessage(params: {
    filePath: string;
    changes: Array<{
      title: string;
      category: OptimizationCategory;
      description: string;
    }>;
  }): Promise<string> {
    if (!this.isAvailable()) {
      // Fallback commit message
      const categories = [...new Set(params.changes.map((c) => c.category))];
      return `Optimize ${params.filePath}: ${categories.join(', ')}`;
    }

    const prompt = buildCommitMessagePrompt(params);

    const response = await this.sendRequest({
      prompt,
      systemPrompt:
        'You are a helpful assistant that generates concise, conventional Git commit messages.',
      maxTokens: 256,
    });

    return response.content.trim();
  }

  /**
   * Validate a code modification
   */
  async validateModification(params: {
    originalCode: string;
    modifiedCode: string;
    suggestionTitle: string;
  }): Promise<{
    valid: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    if (!this.isAvailable()) {
      return { valid: true, issues: [], suggestions: [] };
    }

    const prompt = `Validate this code modification for "${params.suggestionTitle}":

Original:
\`\`\`tsx
${params.originalCode}
\`\`\`

Modified:
\`\`\`tsx
${params.modifiedCode}
\`\`\`

Check for:
1. Syntax errors
2. Type safety issues
3. Breaking changes
4. Missing imports

Respond with JSON: {"valid": boolean, "issues": string[], "suggestions": string[]}`;

    try {
      const response = await this.sendRequest({
        prompt,
        systemPrompt: 'You are a code review assistant. Respond only with valid JSON.',
        maxTokens: 512,
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Validation request failed:', error);
    }

    return { valid: true, issues: [], suggestions: [] };
  }

  /**
   * Get an explanation for a code change
   */
  async explainChange(params: {
    originalCode: string;
    modifiedCode: string;
    category: OptimizationCategory;
  }): Promise<string> {
    if (!this.isAvailable()) {
      return 'LLM service not available for explanation generation.';
    }

    const prompt = `Explain this ${params.category} code change in 2-3 sentences:

Before:
\`\`\`tsx
${params.originalCode}
\`\`\`

After:
\`\`\`tsx
${params.modifiedCode}
\`\`\``;

    const response = await this.sendRequest({
      prompt,
      systemPrompt:
        'Provide brief, clear explanations of code changes. Focus on the practical benefits.',
      maxTokens: 256,
    });

    return response.content.trim();
  }

  /**
   * Suggest related optimizations based on current changes
   */
  async suggestRelated(params: {
    appliedChanges: Array<{
      title: string;
      category: OptimizationCategory;
    }>;
    componentCode: string;
  }): Promise<string[]> {
    if (!this.isAvailable()) {
      return [];
    }

    const appliedList = params.appliedChanges
      .map((c) => `- [${c.category}] ${c.title}`)
      .join('\n');

    const prompt = `Based on these applied changes:
${appliedList}

And this component code:
\`\`\`tsx
${params.componentCode}
\`\`\`

Suggest 2-3 related improvements. Respond with a JSON array of strings: ["suggestion1", "suggestion2"]`;

    try {
      const response = await this.sendRequest({
        prompt,
        systemPrompt:
          'Suggest related code improvements. Be specific and actionable. Respond only with a JSON array.',
        maxTokens: 256,
      });

      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Related suggestions request failed:', error);
    }

    return [];
  }
}

// Singleton instance
let instance: LLMService | null = null;

export function getLLMService(): LLMService {
  if (!instance) {
    instance = new LLMService();
  }
  return instance;
}
