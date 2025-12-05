import type { OptimizationCategory, ComponentInfo, CodeMetrics } from '../types/index.js';

/**
 * System prompt for the React optimization assistant
 */
export const SYSTEM_PROMPT = `You are an expert React developer and code optimization assistant. Your role is to analyze React components and suggest specific, actionable improvements based on the user's optimization goals.

## Core Principles

1. **Minimal Changes**: Make the smallest possible changes to achieve the goal
2. **Backward Compatibility**: Never break existing functionality
3. **Best Practices**: Follow React and TypeScript best practices
4. **Explanation**: Always explain why a change is beneficial
5. **Safety**: Never remove error handling or type safety

## Response Format

Always respond with a JSON object in this exact format:
{
  "analysis": {
    "summary": "Brief summary of the component and its current state",
    "issues": [
      {
        "type": "warning|error|info",
        "message": "Description of the issue",
        "line": 10,
        "category": "performance|accessibility|maintainability|bundle-size|ux|code-quality"
      }
    ]
  },
  "suggestions": [
    {
      "id": "unique-id",
      "title": "Short title for the change",
      "description": "Detailed description of what this change does",
      "category": "performance|accessibility|maintainability|bundle-size|ux|code-quality",
      "priority": "high|medium|low",
      "explanation": "Why this change improves the code",
      "lineStart": 1,
      "lineEnd": 10,
      "originalCode": "The exact code to be replaced",
      "modifiedCode": "The new code that replaces it",
      "confidence": 0.95
    }
  ]
}

## Important Rules

1. The originalCode must be an EXACT match of code in the file (whitespace-sensitive)
2. The modifiedCode must be syntactically valid and complete
3. Each suggestion should be independent and applicable separately
4. Order suggestions by priority (highest first)
5. Confidence should reflect how certain you are the change is correct (0.0-1.0)
6. Never suggest changes that would require additional dependencies without noting it`;

/**
 * Category-specific optimization prompts
 */
export const CATEGORY_PROMPTS: Record<OptimizationCategory, string> = {
  performance: `Focus on performance optimizations:
- useMemo for expensive computations
- useCallback for function props passed to child components
- React.memo for components that receive the same props frequently
- Lazy loading with React.lazy and Suspense
- Avoiding unnecessary re-renders
- Virtual scrolling for long lists
- Debouncing/throttling event handlers
- Key optimization in lists`,

  accessibility: `Focus on accessibility improvements:
- Adding appropriate ARIA attributes (aria-label, aria-describedby, role)
- Ensuring keyboard navigation works correctly
- Adding proper focus management
- Screen reader compatibility
- Color contrast and visibility
- Form label associations
- Alt text for images
- Skip links and landmark regions
- Announcing dynamic content changes`,

  maintainability: `Focus on code maintainability:
- Breaking large components into smaller, focused components
- Extracting reusable custom hooks
- Improving naming conventions
- Adding JSDoc comments for complex logic
- Simplifying conditional rendering
- Reducing prop drilling with context
- Organizing imports and exports
- Following Single Responsibility Principle`,

  'bundle-size': `Focus on bundle size reduction:
- Dynamic imports for code splitting
- Tree-shakeable imports (named vs default)
- Removing unused imports
- Lighter alternative libraries
- Conditional feature loading
- Asset optimization suggestions
- Avoiding barrel file issues`,

  ux: `Focus on user experience improvements:
- Loading states and skeletons
- Error boundaries and fallback UI
- Optimistic updates
- Smooth transitions and animations
- Form validation feedback
- Empty states
- Progressive enhancement
- Responsive design considerations`,

  'code-quality': `Focus on code quality improvements:
- TypeScript type safety
- Error handling patterns
- Input validation
- Null/undefined handling
- Consistent code style
- Removing code duplication
- Following React patterns
- Testing considerations`,
};

/**
 * Build the full analysis prompt
 */
export function buildAnalysisPrompt(params: {
  componentName: string;
  filePath: string;
  code: string;
  optimizationGoal: string;
  category?: OptimizationCategory;
  componentInfo?: ComponentInfo;
  metrics?: CodeMetrics;
}): string {
  const {
    componentName,
    filePath,
    code,
    optimizationGoal,
    category,
    componentInfo,
    metrics,
  } = params;

  const categoryGuidance = category
    ? CATEGORY_PROMPTS[category]
    : Object.values(CATEGORY_PROMPTS).join('\n\n');

  let contextSection = '';

  if (componentInfo) {
    contextSection += `
## Component Context
- Props: ${componentInfo.props ? Object.keys(componentInfo.props).join(', ') || 'none' : 'unknown'}
- Hooks: ${componentInfo.hooks?.map((h) => h.name).join(', ') || 'none'}
- State: ${componentInfo.state ? Object.keys(componentInfo.state).join(', ') || 'none' : 'unknown'}`;
  }

  if (metrics) {
    contextSection += `
## Code Metrics
- Lines of Code: ${metrics.linesOfCode}
- Cyclomatic Complexity: ${metrics.complexity}
- Dependencies: ${metrics.dependencies.join(', ') || 'none'}
- Exports: ${metrics.exports.join(', ') || 'none'}`;
  }

  return `# React Component Optimization Request

## Target Component
- Name: ${componentName}
- File: ${filePath}

## Optimization Goal
${optimizationGoal}

${category ? `## Focus Category: ${category}` : ''}

## Category Guidelines
${categoryGuidance}
${contextSection}

## Component Source Code
\`\`\`tsx
${code}
\`\`\`

## Task
1. Analyze the component for opportunities related to: ${optimizationGoal}
2. Identify specific issues and improvement opportunities
3. Provide concrete code modifications with exact replacements
4. Ensure all suggestions maintain backward compatibility
5. Return your analysis as a valid JSON object following the specified format`;
}

/**
 * Build a prompt for validating/refining suggested changes
 */
export function buildValidationPrompt(params: {
  originalCode: string;
  modifiedCode: string;
  suggestionTitle: string;
}): string {
  const { originalCode, modifiedCode, suggestionTitle } = params;

  return `# Code Change Validation

## Change: ${suggestionTitle}

## Original Code
\`\`\`tsx
${originalCode}
\`\`\`

## Modified Code
\`\`\`tsx
${modifiedCode}
\`\`\`

## Task
Validate this code change and respond with a JSON object:
{
  "valid": true|false,
  "issues": ["list of issues if any"],
  "syntaxValid": true|false,
  "typeSafe": true|false,
  "backwardCompatible": true|false,
  "suggestions": ["any improvements to the modification"]
}`;
}

/**
 * Build a prompt for generating commit messages
 */
export function buildCommitMessagePrompt(params: {
  filePath: string;
  changes: Array<{
    title: string;
    category: OptimizationCategory;
    description: string;
  }>;
}): string {
  const { filePath, changes } = params;

  const changesList = changes
    .map((c) => `- [${c.category}] ${c.title}: ${c.description}`)
    .join('\n');

  return `Generate a concise Git commit message for these changes:

File: ${filePath}

Changes:
${changesList}

Requirements:
1. First line: Brief summary under 72 characters
2. Body: Bullet points explaining key changes
3. Use conventional commit format (feat:, fix:, refactor:, perf:, a11y:)

Respond with just the commit message, no JSON or extra formatting.`;
}

/**
 * Build a prompt for explaining a code change to the user
 */
export function buildExplanationPrompt(params: {
  originalCode: string;
  modifiedCode: string;
  category: OptimizationCategory;
}): string {
  const { originalCode, modifiedCode, category } = params;

  return `Explain this ${category} optimization in simple terms for a React developer:

## Before
\`\`\`tsx
${originalCode}
\`\`\`

## After
\`\`\`tsx
${modifiedCode}
\`\`\`

Provide a clear, concise explanation that:
1. Explains what changed
2. Why it's an improvement
3. Any potential trade-offs
4. When this pattern should be used

Keep the explanation under 200 words and avoid overly technical jargon.`;
}

/**
 * Build a prompt for batch analysis of multiple components
 */
export function buildBatchAnalysisPrompt(params: {
  components: Array<{
    name: string;
    filePath: string;
    code: string;
  }>;
  goal: string;
}): string {
  const { components, goal } = params;

  const componentSections = components
    .map(
      (c) => `### ${c.name} (${c.filePath})
\`\`\`tsx
${c.code}
\`\`\`
`
    )
    .join('\n');

  return `# Batch Component Analysis

## Goal
${goal}

## Components
${componentSections}

## Task
Analyze all components and identify:
1. Common patterns that could be extracted
2. Shared state management opportunities
3. Component composition improvements
4. Cross-cutting concerns (error handling, loading states)

Respond with a JSON object containing analysis for each component and overall recommendations.`;
}
