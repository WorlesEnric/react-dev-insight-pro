import { Router, Request, Response } from 'express';
import { getCodeAnalyzer } from '../services/codeAnalyzer.js';
import { getFileSystemService } from '../services/fileSystem.js';
import type { AnalysisRequest, APIResponse, AnalysisResult, BoundingRect } from '../types/index.js';

const router = Router();

/**
 * POST /api/analysis/element
 * Analyze a selected element and its React component
 */
router.post('/element', async (req: Request, res: Response) => {
  try {
    const request = req.body as AnalysisRequest;

    // Validate request
    if (!request.componentInfo || !request.optimizationGoal) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required fields: componentInfo and optimizationGoal',
        },
      };
      res.status(400).json(response);
      return;
    }

    const analyzer = getCodeAnalyzer(request.projectPath);
    const result = await analyzer.analyzeElement(request);

    const response: APIResponse<AnalysisResult> = {
      success: true,
      data: result,
    };

    res.json(response);
  } catch (error) {
    console.error('Analysis error:', error);
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'ANALYSIS_ERROR',
        message: error instanceof Error ? error.message : 'Analysis failed',
      },
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/analysis/file
 * Analyze a specific file
 */
router.post('/file', async (req: Request, res: Response) => {
  try {
    const { filePath, optimizationGoal, category, projectPath } = req.body;

    if (!filePath || !optimizationGoal) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required fields: filePath and optimizationGoal',
        },
      };
      res.status(400).json(response);
      return;
    }

    const analyzer = getCodeAnalyzer(projectPath);
    const result = await analyzer.analyzeElement({
      elementInfo: {
        tagName: '',
        className: '',
        id: '',
        attributes: {},
        textContent: '',
        boundingRect: {
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        } as BoundingRect,
        xpath: '',
      },
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
      optimizationGoal,
      category,
      projectPath,
    });

    const response: APIResponse<AnalysisResult> = {
      success: true,
      data: result,
    };

    res.json(response);
  } catch (error) {
    console.error('File analysis error:', error);
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'ANALYSIS_ERROR',
        message: error instanceof Error ? error.message : 'Analysis failed',
      },
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/analysis/component/:name
 * Find and analyze a component by name
 */
router.get('/component/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const { projectPath } = req.query;

    if (!name || typeof name !== 'string') {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required field: name',
        },
      };
      res.status(400).json(response);
      return;
    }

    if (!projectPath || typeof projectPath !== 'string') {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required field: projectPath',
        },
      };
      res.status(400).json(response);
      return;
    }

    const analyzer = getCodeAnalyzer(projectPath);
    const filePath = await analyzer.findComponentFile(name);

    if (!filePath) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Component "${name}" not found`,
        },
      };
      res.status(404).json(response);
      return;
    }

    const componentInfo = await analyzer.getComponentInfo(filePath, name);

    const response: APIResponse<typeof componentInfo & { filePath: string }> = {
      success: true,
      data: { ...componentInfo, filePath },
    };

    res.json(response);
  } catch (error) {
    console.error('Component lookup error:', error);
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'LOOKUP_ERROR',
        message: error instanceof Error ? error.message : 'Component lookup failed',
      },
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/analysis/batch
 * Analyze multiple components
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { filePaths, optimizationGoal, projectPath } = req.body;

    if (!filePaths || !Array.isArray(filePaths) || !optimizationGoal) {
      const response: APIResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required fields: filePaths (array) and optimizationGoal',
        },
      };
      res.status(400).json(response);
      return;
    }

    const analyzer = getCodeAnalyzer(projectPath);
    const results = await analyzer.analyzeMultiple(filePaths, optimizationGoal);

    const response: APIResponse<AnalysisResult[]> = {
      success: true,
      data: results,
    };

    res.json(response);
  } catch (error) {
    console.error('Batch analysis error:', error);
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'BATCH_ERROR',
        message: error instanceof Error ? error.message : 'Batch analysis failed',
      },
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/analysis/files
 * List all React files in the project
 */
router.get('/files', async (req: Request, res: Response) => {
  try {
    const { projectPath } = req.query;
    const fs = getFileSystemService(projectPath as string);
    const files = fs.findReactFiles();

    const response: APIResponse<typeof files> = {
      success: true,
      data: files,
    };

    res.json(response);
  } catch (error) {
    console.error('File listing error:', error);
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'FILE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list files',
      },
    };
    res.status(500).json(response);
  }
});

export default router;
