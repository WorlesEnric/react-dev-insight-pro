import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { CodeMetrics, HookInfo } from '../types/index.js';

interface ParseResult {
  ast: t.File;
  componentName: string | null;
  props: string[];
  state: string[];
  hooks: HookInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  metrics: CodeMetrics;
}

interface ImportInfo {
  source: string;
  specifiers: string[];
  isDefault: boolean;
  isNamespace: boolean;
}

interface ExportInfo {
  name: string;
  isDefault: boolean;
  type: 'function' | 'class' | 'variable' | 'other';
}

interface ComponentBoundary {
  name: string;
  start: number;
  end: number;
  type: 'function' | 'arrow' | 'class';
}

/**
 * Parse TypeScript/JavaScript/JSX code into AST
 */
export function parseCode(code: string, filename?: string): t.File {
  const isTypeScript = filename?.endsWith('.ts') || filename?.endsWith('.tsx');
  const isJSX = filename?.endsWith('.jsx') || filename?.endsWith('.tsx');

  return parser.parse(code, {
    sourceType: 'module',
    plugins: [
      ...(isJSX ? ['jsx' as const] : []),
      ...(isTypeScript ? ['typescript' as const] : []),
      'classProperties',
      'decorators-legacy',
      'exportDefaultFrom',
      'dynamicImport',
      'optionalChaining',
      'nullishCoalescingOperator',
    ],
  });
}

/**
 * Extract comprehensive information from React component code
 */
export function analyzeReactComponent(
  code: string,
  filename?: string
): ParseResult {
  const ast = parseCode(code, filename);

  let componentName: string | null = null;
  const props: string[] = [];
  const state: string[] = [];
  const hooks: HookInfo[] = [];
  const imports: ImportInfo[] = [];
  const exports: ExportInfo[] = [];
  const dependencies: Set<string> = new Set();

  let complexity = 0;

  traverse(ast, {
    // Track imports
    ImportDeclaration(path) {
      const source = path.node.source.value;
      dependencies.add(source);

      const specifiers: string[] = [];
      let isDefault = false;
      let isNamespace = false;

      path.node.specifiers.forEach((spec) => {
        if (t.isImportDefaultSpecifier(spec)) {
          specifiers.push(spec.local.name);
          isDefault = true;
        } else if (t.isImportNamespaceSpecifier(spec)) {
          specifiers.push(spec.local.name);
          isNamespace = true;
        } else if (t.isImportSpecifier(spec)) {
          const imported = t.isIdentifier(spec.imported)
            ? spec.imported.name
            : spec.imported.value;
          specifiers.push(imported);
        }
      });

      imports.push({ source, specifiers, isDefault, isNamespace });
    },

    // Track exports
    ExportDefaultDeclaration(path) {
      const declaration = path.node.declaration;
      let name = 'default';
      let type: ExportInfo['type'] = 'other';

      if (t.isFunctionDeclaration(declaration) && declaration.id) {
        name = declaration.id.name;
        type = 'function';
        componentName = componentName ?? name;
      } else if (t.isClassDeclaration(declaration) && declaration.id) {
        name = declaration.id.name;
        type = 'class';
        componentName = componentName ?? name;
      } else if (t.isIdentifier(declaration)) {
        name = declaration.name;
      }

      exports.push({ name, isDefault: true, type });
    },

    ExportNamedDeclaration(path) {
      const declaration = path.node.declaration;

      if (t.isFunctionDeclaration(declaration) && declaration.id) {
        exports.push({
          name: declaration.id.name,
          isDefault: false,
          type: 'function',
        });
      } else if (t.isClassDeclaration(declaration) && declaration.id) {
        exports.push({
          name: declaration.id.name,
          isDefault: false,
          type: 'class',
        });
      } else if (t.isVariableDeclaration(declaration)) {
        declaration.declarations.forEach((decl) => {
          if (t.isIdentifier(decl.id)) {
            exports.push({
              name: decl.id.name,
              isDefault: false,
              type: 'variable',
            });
          }
        });
      }

      path.node.specifiers.forEach((spec) => {
        if (t.isExportSpecifier(spec)) {
          const exported = t.isIdentifier(spec.exported)
            ? spec.exported.name
            : spec.exported.value;
          exports.push({ name: exported, isDefault: false, type: 'other' });
        }
      });
    },

    // Track React hooks
    CallExpression(path) {
      const callee = path.node.callee;

      if (t.isIdentifier(callee)) {
        const hookName = callee.name;

        // Common React hooks
        if (hookName.startsWith('use')) {
          const hookInfo: HookInfo = {
            name: hookName,
            value: null,
          };

          // Extract useState initial value and setter name
          if (hookName === 'useState') {
            const parent = path.parent;
            if (
              t.isVariableDeclarator(parent) &&
              t.isArrayPattern(parent.id)
            ) {
              parent.id.elements.forEach((el, idx) => {
                if (t.isIdentifier(el)) {
                  if (idx === 0) state.push(el.name);
                }
              });
            }
          }

          // Extract useEffect/useMemo/useCallback dependencies
          if (['useEffect', 'useMemo', 'useCallback'].includes(hookName)) {
            const depsArg = path.node.arguments[1];
            if (t.isArrayExpression(depsArg)) {
              hookInfo.dependencies = depsArg.elements
                .filter((el): el is t.Identifier => t.isIdentifier(el))
                .map((el) => el.name);
            }
          }

          hooks.push(hookInfo);
        }
      }

      // Increment complexity for function calls
      complexity++;
    },

    // Track function component props
    FunctionDeclaration(path) {
      const params = path.node.params;
      extractPropsFromParams(params, props);

      // Check if this looks like a React component
      if (path.node.id && isLikelyReactComponent(path.node.id.name)) {
        componentName = componentName ?? path.node.id.name;
      }
    },

    ArrowFunctionExpression(path) {
      const params = path.node.params;
      extractPropsFromParams(params, props);
    },

    // Track class component state
    ClassProperty(path) {
      if (
        t.isIdentifier(path.node.key) &&
        path.node.key.name === 'state' &&
        t.isObjectExpression(path.node.value)
      ) {
        path.node.value.properties.forEach((prop) => {
          if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
            state.push(prop.key.name);
          }
        });
      }
    },

    // Track complexity from conditionals and loops
    IfStatement() {
      complexity++;
    },
    ConditionalExpression() {
      complexity++;
    },
    ForStatement() {
      complexity++;
    },
    ForInStatement() {
      complexity++;
    },
    ForOfStatement() {
      complexity++;
    },
    WhileStatement() {
      complexity++;
    },
    DoWhileStatement() {
      complexity++;
    },
    SwitchCase() {
      complexity++;
    },
    LogicalExpression() {
      complexity++;
    },
  });

  const lines = code.split('\n');
  const metrics: CodeMetrics = {
    linesOfCode: lines.filter((line) => line.trim().length > 0).length,
    complexity,
    dependencies: Array.from(dependencies),
    exports: exports.map((e) => e.name),
  };

  return {
    ast,
    componentName,
    props,
    state,
    hooks,
    imports,
    exports,
    metrics,
  };
}

/**
 * Extract props from function parameters
 */
function extractPropsFromParams(
  params: (t.Identifier | t.Pattern | t.RestElement)[],
  props: string[]
): void {
  params.forEach((param) => {
    if (t.isObjectPattern(param)) {
      param.properties.forEach((prop) => {
        if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
          props.push(prop.key.name);
        } else if (t.isRestElement(prop) && t.isIdentifier(prop.argument)) {
          props.push(`...${prop.argument.name}`);
        }
      });
    } else if (t.isIdentifier(param)) {
      props.push(param.name);
    }
  });
}

/**
 * Check if a name looks like a React component
 */
function isLikelyReactComponent(name: string): boolean {
  // React components typically start with uppercase
  return /^[A-Z]/.test(name);
}

/**
 * Find component boundaries in code
 */
export function findComponentBoundaries(code: string, filename?: string): ComponentBoundary[] {
  const ast = parseCode(code, filename);
  const boundaries: ComponentBoundary[] = [];

  traverse(ast, {
    FunctionDeclaration(path) {
      if (path.node.id && isLikelyReactComponent(path.node.id.name)) {
        boundaries.push({
          name: path.node.id.name,
          start: path.node.loc?.start.line ?? 0,
          end: path.node.loc?.end.line ?? 0,
          type: 'function',
        });
      }
    },

    VariableDeclarator(path) {
      if (
        t.isIdentifier(path.node.id) &&
        isLikelyReactComponent(path.node.id.name) &&
        t.isArrowFunctionExpression(path.node.init)
      ) {
        boundaries.push({
          name: path.node.id.name,
          start: path.node.loc?.start.line ?? 0,
          end: path.node.loc?.end.line ?? 0,
          type: 'arrow',
        });
      }
    },

    ClassDeclaration(path) {
      if (path.node.id && isLikelyReactComponent(path.node.id.name)) {
        boundaries.push({
          name: path.node.id.name,
          start: path.node.loc?.start.line ?? 0,
          end: path.node.loc?.end.line ?? 0,
          type: 'class',
        });
      }
    },
  });

  return boundaries;
}

/**
 * Extract a specific component's code from a file
 */
export function extractComponentCode(
  fullCode: string,
  componentName: string,
  filename?: string
): string | null {
  const boundaries = findComponentBoundaries(fullCode, filename);
  const component = boundaries.find((b) => b.name === componentName);

  if (!component) {
    return null;
  }

  const lines = fullCode.split('\n');
  return lines.slice(component.start - 1, component.end).join('\n');
}

/**
 * Get the line range for a specific node
 */
export function getNodeLineRange(
  code: string,
  nodeType: string,
  nodeName: string,
  filename?: string
): { start: number; end: number } | null {
  const ast = parseCode(code, filename);
  let result: { start: number; end: number } | null = null;

  traverse(ast, {
    enter(path) {
      if (
        path.node.type === nodeType &&
        'id' in path.node &&
        t.isIdentifier(path.node.id as t.Node | null | undefined) &&
        (path.node.id as t.Identifier).name === nodeName
      ) {
        result = {
          start: path.node.loc?.start.line ?? 0,
          end: path.node.loc?.end.line ?? 0,
        };
        path.stop();
      }
    },
  });

  return result;
}

/**
 * Check if code contains JSX
 */
export function containsJSX(code: string): boolean {
  try {
    const ast = parseCode(code, 'file.tsx');
    let hasJSX = false;

    traverse(ast, {
      JSXElement() {
        hasJSX = true;
      },
      JSXFragment() {
        hasJSX = true;
      },
    });

    return hasJSX;
  } catch {
    return false;
  }
}

/**
 * Validate that code is syntactically correct
 */
export function validateSyntax(
  code: string,
  filename?: string
): { valid: boolean; error?: string } {
  try {
    parseCode(code, filename);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    };
  }
}
