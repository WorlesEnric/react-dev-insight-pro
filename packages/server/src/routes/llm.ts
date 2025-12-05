/**
 * LLM Routes
 * 
 * Provides REST API endpoints for direct LLM interactions including
 * code analysis, suggestion generation, and validation.
 */

import { Router, Request, Response } from 'express';
import { getLLMService, LLMService } from '../services/llmService';
import { APIResponse, OptimizationCategory } from '../types';
import { loadConfig } from '../config';
import type { ClientOptions } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const router = Router();

// Singleton LLM service
let llmService: LLMService | null = null;

async function getLLMServiceInstance(): Promise<LLMService> {
  if (!llmService) {
    llmService = getLLMService();
  }
  return llmService;
}

/**
 * POST /api/llm/analyze
 * Analyze code and generate optimization suggestions
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { code, goal, componentName, filePath, context } = req.body;

    if (!code || typeof code !== 'string') {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'code is required and must be a string'
        }
      };
      return res.status(400).json(response);
    }

    if (!goal || typeof goal !== 'string') {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'goal is required and must be a string'
        }
      };
      return res.status(400).json(response);
    }

    const service = await getLLMServiceInstance();
    const result = await service.analyzeComponent({
      componentName: componentName || 'Unknown',
      filePath: filePath || '',
      code,
      optimizationGoal: goal,
      ...context
    });

    const response: APIResponse<typeof result> = {
      success: true,
      data: result
    };

    res.json(response);
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'ANALYSIS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to analyze code'
      }
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/llm/validate
 * Validate a code modification
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { originalCode, modifiedCode, goal } = req.body;

    if (!originalCode || typeof originalCode !== 'string') {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'originalCode is required'
        }
      };
      return res.status(400).json(response);
    }

    if (!modifiedCode || typeof modifiedCode !== 'string') {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'modifiedCode is required'
        }
      };
      return res.status(400).json(response);
    }

    const service = await getLLMServiceInstance();
    const result = await service.validateModification({
      originalCode,
      modifiedCode,
      suggestionTitle: goal || 'Code modification'
    });

    const response: APIResponse<typeof result> = {
      success: true,
      data: result
    };

    res.json(response);
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to validate code'
      }
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/llm/commit-message
 * Generate a commit message for code changes
 */
router.post('/commit-message', async (req: Request, res: Response) => {
  try {
    const { originalCode, modifiedCode, goal, componentName } = req.body;

    if (!originalCode || typeof originalCode !== 'string') {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'originalCode is required'
        }
      };
      return res.status(400).json(response);
    }

    if (!modifiedCode || typeof modifiedCode !== 'string') {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'modifiedCode is required'
        }
      };
      return res.status(400).json(response);
    }

    const service = await getLLMServiceInstance();
    const message = await service.generateCommitMessage({
      filePath: componentName || 'unknown',
      changes: [{
        title: goal || 'Code optimization',
        category: 'code-quality',
        description: 'Code modification'
      }]
    });

    const response: APIResponse<{ message: string }> = {
      success: true,
      data: { message }
    };

    res.json(response);
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'COMMIT_MESSAGE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate commit message'
      }
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/llm/explain
 * Generate an explanation for a code change
 */
router.post('/explain', async (req: Request, res: Response) => {
  try {
    const { originalCode, modifiedCode, goal } = req.body;

    if (!originalCode || typeof originalCode !== 'string') {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'originalCode is required'
        }
      };
      return res.status(400).json(response);
    }

    if (!modifiedCode || typeof modifiedCode !== 'string') {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'modifiedCode is required'
        }
      };
      return res.status(400).json(response);
    }

    const service = await getLLMServiceInstance();
    const validCategories: OptimizationCategory[] = ['performance', 'accessibility', 'maintainability', 'bundle-size', 'ux', 'code-quality'];
    const category: OptimizationCategory = (goal && validCategories.includes(goal as OptimizationCategory))
      ? (goal as OptimizationCategory)
      : 'code-quality';
    const explanation = await service.explainChange({
      originalCode,
      modifiedCode,
      category
    });

    const response: APIResponse<{ explanation: string }> = {
      success: true,
      data: { explanation }
    };

    res.json(response);
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'EXPLANATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to explain change'
      }
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/llm/suggest-related
 * Get suggestions for related optimizations
 */
router.post('/suggest-related', async (req: Request, res: Response) => {
  try {
    const { code, appliedChanges } = req.body;

    if (!code || typeof code !== 'string') {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'code is required'
        }
      };
      return res.status(400).json(response);
    }

    if (!appliedChanges || !Array.isArray(appliedChanges)) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'appliedChanges array is required'
        }
      };
      return res.status(400).json(response);
    }

    const service = await getLLMServiceInstance();
    const suggestions = await service.suggestRelated({
      componentCode: code,
      appliedChanges: appliedChanges.map((change: any) => ({
        title: change.title || change,
        category: change.category || 'code-quality'
      }))
    });

    const response: APIResponse<{ suggestions: string[] }> = {
      success: true,
      data: { suggestions }
    };

    res.json(response);
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'SUGGESTION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to suggest related changes'
      }
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/llm/status
 * Check LLM service status and configuration
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const config = await loadConfig();
    const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
    const hasApiKey = !!apiKey;

    const response: APIResponse<{
      available: boolean;
      provider: string;
      model: string;
      hasApiKey: boolean;
      baseURL?: string;
    }> = {
      success: true,
      data: {
        available: hasApiKey,
        provider: config.llm.provider,
        model: process.env.LLM_MODEL_NAME || config.llm.model,
        hasApiKey,
        ...(process.env.LLM_BASE_URL ? { baseURL: process.env.LLM_BASE_URL } : {})
      }
    };

    res.json(response);
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get LLM status'
      }
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/llm/custom-prompt
 * Send a custom prompt to the LLM (advanced usage)
 */
router.post('/custom-prompt', async (req: Request, res: Response) => {
  try {
    const { systemPrompt, userPrompt, maxTokens = 2048 } = req.body;

    if (!userPrompt || typeof userPrompt !== 'string') {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'userPrompt is required'
        }
      };
      return res.status(400).json(response);
    }

    // Check if API key is available
    const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'CONFIGURATION_ERROR',
          message: 'LLM_API_KEY or OPENAI_API_KEY not configured'
        }
      };
      return res.status(503).json(response);
    }

    const config = await loadConfig();
    const OpenAI = (await import('openai')).default;
    const clientConfig: ClientOptions = {
      apiKey,
    };
    if (process.env.LLM_BASE_URL) {
      clientConfig.baseURL = process.env.LLM_BASE_URL;
    }
    const client = new OpenAI(clientConfig);

    const messages: ChatCompletionMessageParam[] = [];
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }
    messages.push({
      role: 'user',
      content: userPrompt,
    });

    const completion = await client.chat.completions.create({
      model: process.env.LLM_MODEL_NAME || config.llm.model,
      max_tokens: maxTokens,
      messages,
    });

    const responseText = completion.choices[0]?.message?.content || '';

    const response: APIResponse<{
      response: string;
      usage: {
        inputTokens: number;
        outputTokens: number;
      };
    }> = {
      success: true,
      data: {
        response: responseText,
        usage: {
          inputTokens: completion.usage?.prompt_tokens || 0,
          outputTokens: completion.usage?.completion_tokens || 0
        }
      }
    };

    res.json(response);
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'PROMPT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to process custom prompt'
      }
    };
    res.status(500).json(response);
  }
});

export default router;
