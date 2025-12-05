import { validateSyntax, containsJSX } from './parser.js';
import type { ValidationResult, SyntaxError as SyntaxErrorType } from '../types/index.js';

/**
 * Comprehensive code validation
 */
export function validateCode(
  code: string,
  filename?: string
): ValidationResult {
  const syntaxErrors: SyntaxErrorType[] = [];
  const typeErrors: string[] = [];
  const lintErrors: string[] = [];

  // Syntax validation
  const syntaxResult = validateSyntax(code, filename);
  if (!syntaxResult.valid && syntaxResult.error) {
    const errorMatch = syntaxResult.error.match(/\((\d+):(\d+)\)/);
    syntaxErrors.push({
      message: syntaxResult.error,
      line: errorMatch ? parseInt(errorMatch[1] ?? '0', 10) : 0,
      column: errorMatch ? parseInt(errorMatch[2] ?? '0', 10) : 0,
    });
  }

  // Basic lint checks
  const lintResults = runBasicLintChecks(code);
  lintErrors.push(...lintResults);

  // Type-related checks (basic, without full TypeScript compilation)
  if (filename?.endsWith('.ts') || filename?.endsWith('.tsx')) {
    const typeResults = runBasicTypeChecks(code);
    typeErrors.push(...typeResults);
  }

  return {
    valid: syntaxErrors.length === 0,
    syntaxErrors,
    typeErrors,
    lintErrors,
  };
}

/**
 * Basic lint checks without external tools
 */
function runBasicLintChecks(code: string): string[] {
  const errors: string[] = [];
  const lines = code.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Check for console.log statements
    if (line.includes('console.log') && !line.trim().startsWith('//')) {
      errors.push(`Line ${lineNum}: Unexpected console.log statement`);
    }

    // Check for debugger statements
    if (line.includes('debugger') && !line.trim().startsWith('//')) {
      errors.push(`Line ${lineNum}: Unexpected debugger statement`);
    }

    // Check for very long lines
    if (line.length > 120) {
      errors.push(`Line ${lineNum}: Line exceeds 120 characters`);
    }

    // Check for trailing whitespace
    if (line !== line.trimEnd() && line.trim().length > 0) {
      errors.push(`Line ${lineNum}: Trailing whitespace`);
    }
  });

  // Check for common React issues
  if (containsJSX(code)) {
    // Check for missing key prop warnings
    const mapWithoutKey = /\.map\s*\([^)]*\)\s*=>\s*[^{]*<(?!Fragment)[A-Z][^>]*(?!key=)/;
    if (mapWithoutKey.test(code)) {
      errors.push('Possible missing "key" prop in list rendering');
    }
  }

  return errors;
}

/**
 * Basic type checks (simple heuristics, not full type checking)
 */
function runBasicTypeChecks(code: string): string[] {
  const errors: string[] = [];

  // Check for 'any' type usage
  const anyMatches = code.match(/:\s*any\b/g);
  if (anyMatches && anyMatches.length > 0) {
    errors.push(
      `Found ${anyMatches.length} usage(s) of 'any' type - consider using more specific types`
    );
  }

  // Check for non-null assertions
  const nonNullAssertions = code.match(/!\./g);
  if (nonNullAssertions && nonNullAssertions.length > 3) {
    errors.push(
      `Found ${nonNullAssertions.length} non-null assertions - consider proper null handling`
    );
  }

  // Check for @ts-ignore comments
  const tsIgnore = code.match(/@ts-ignore/g);
  if (tsIgnore && tsIgnore.length > 0) {
    errors.push(
      `Found ${tsIgnore.length} @ts-ignore comment(s) - consider fixing the underlying type issues`
    );
  }

  return errors;
}

/**
 * Validate that a code modification is safe to apply
 */
export function validateModification(
  originalCode: string,
  modifiedCode: string,
  filename?: string
): {
  safe: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check that modified code is syntactically valid
  const modifiedValidation = validateSyntax(modifiedCode, filename);
  if (!modifiedValidation.valid) {
    issues.push(`Modified code has syntax errors: ${modifiedValidation.error}`);
  }

  // Check that the modification doesn't remove too much code
  const originalLines = originalCode.split('\n').length;
  const modifiedLines = modifiedCode.split('\n').length;
  const lineDiff = originalLines - modifiedLines;

  if (lineDiff > 20 && lineDiff > originalLines * 0.5) {
    warnings.push(
      `Modification removes ${lineDiff} lines (${Math.round((lineDiff / originalLines) * 100)}% of original)`
    );
  }

  // Check that key patterns are preserved
  const originalExports = extractExportNames(originalCode);
  const modifiedExports = extractExportNames(modifiedCode);

  const removedExports = originalExports.filter(
    (e) => !modifiedExports.includes(e)
  );
  if (removedExports.length > 0) {
    issues.push(`Modification removes exports: ${removedExports.join(', ')}`);
  }

  // Check for removed error handling
  const originalTryCatch = (originalCode.match(/try\s*{/g) || []).length;
  const modifiedTryCatch = (modifiedCode.match(/try\s*{/g) || []).length;

  if (modifiedTryCatch < originalTryCatch) {
    warnings.push('Modification may reduce error handling');
  }

  // Check for removed type annotations
  if (filename?.endsWith('.ts') || filename?.endsWith('.tsx')) {
    const originalTypes = (originalCode.match(/:\s*\w+/g) || []).length;
    const modifiedTypes = (modifiedCode.match(/:\s*\w+/g) || []).length;

    if (modifiedTypes < originalTypes * 0.8) {
      warnings.push('Modification may reduce type safety');
    }
  }

  return {
    safe: issues.length === 0,
    issues,
    warnings,
  };
}

/**
 * Extract export names from code
 */
function extractExportNames(code: string): string[] {
  const exports: string[] = [];

  // Named exports: export const/function/class Name
  const namedExportRegex = /export\s+(?:const|let|var|function|class)\s+(\w+)/g;
  let match;
  while ((match = namedExportRegex.exec(code)) !== null) {
    const name = match[1];
    if (name) exports.push(name);
  }

  // Export statements: export { Name1, Name2 }
  const exportListRegex = /export\s*{([^}]+)}/g;
  while ((match = exportListRegex.exec(code)) !== null) {
    const names = match[1];
    if (names) {
      names.split(',').forEach((name) => {
        const trimmed = name.trim().split(/\s+as\s+/)[0]?.trim();
        if (trimmed) exports.push(trimmed);
      });
    }
  }

  // Default export with name: export default function Name
  const defaultExportRegex =
    /export\s+default\s+(?:function|class)\s+(\w+)/g;
  while ((match = defaultExportRegex.exec(code)) !== null) {
    const name = match[1];
    if (name) exports.push(name);
  }

  return exports;
}

/**
 * Check if code change preserves the component's public API
 */
export function preservesPublicAPI(
  originalCode: string,
  modifiedCode: string
): { preserved: boolean; changes: string[] } {
  const changes: string[] = [];

  // Check exports
  const originalExports = extractExportNames(originalCode);
  const modifiedExports = extractExportNames(modifiedCode);

  const removed = originalExports.filter((e) => !modifiedExports.includes(e));
  const added = modifiedExports.filter((e) => !originalExports.includes(e));

  if (removed.length > 0) {
    changes.push(`Removed exports: ${removed.join(', ')}`);
  }
  if (added.length > 0) {
    changes.push(`Added exports: ${added.join(', ')}`);
  }

  // Check prop types (basic check)


  const originalProps = extractPropsFromInterface(originalCode);
  const modifiedProps = extractPropsFromInterface(modifiedCode);

  const removedProps = originalProps.filter((p) => !modifiedProps.includes(p));
  if (removedProps.length > 0) {
    changes.push(`Removed props: ${removedProps.join(', ')}`);
  }

  return {
    preserved: removed.length === 0 && removedProps.length === 0,
    changes,
  };
}

/**
 * Extract prop names from Props interface
 */
function extractPropsFromInterface(code: string): string[] {
  const props: string[] = [];
  const interfaceMatch = code.match(/interface\s+\w*Props\s*{([^}]+)}/);

  if (interfaceMatch && interfaceMatch[1]) {
    const propsContent = interfaceMatch[1];
    const propLines = propsContent.split(/[;\n]/);

    propLines.forEach((line) => {
      const propMatch = line.match(/^\s*(\w+)\s*[?:]?\s*:/);
      if (propMatch && propMatch[1]) {
        props.push(propMatch[1]);
      }
    });
  }

  return props;
}

/**
 * Estimate the impact of a code change
 */
export function estimateChangeImpact(
  originalCode: string,
  modifiedCode: string
): {
  severity: 'low' | 'medium' | 'high';
  affectedLines: number;
  confidence: number;
} {
  const originalLines = originalCode.split('\n');
  const modifiedLines = modifiedCode.split('\n');

  // Count changed lines
  let changedLines = 0;
  const maxLines = Math.max(originalLines.length, modifiedLines.length);

  for (let i = 0; i < maxLines; i++) {
    if (originalLines[i] !== modifiedLines[i]) {
      changedLines++;
    }
  }

  const changePercent = changedLines / originalLines.length;

  let severity: 'low' | 'medium' | 'high';
  let confidence: number;

  if (changePercent < 0.1) {
    severity = 'low';
    confidence = 0.95;
  } else if (changePercent < 0.3) {
    severity = 'medium';
    confidence = 0.85;
  } else {
    severity = 'high';
    confidence = 0.7;
  }

  return {
    severity,
    affectedLines: changedLines,
    confidence,
  };
}
