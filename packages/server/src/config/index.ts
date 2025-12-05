import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import type { Config } from '../types/index.js';
import 'dotenv/config';

// Configuration schema using Zod for validation
const ConfigSchema = z.object({
  git: z.object({
    autoCommit: z.boolean().default(true),
    branchPrefix: z.string().default('ai-optimization/'),
    requireCleanWorkingDir: z.boolean().default(true),
    commitMessagePrefix: z.string().default('[React Dev Insight]'),
  }),
  llm: z.object({
    provider: z.enum(['anthropic', 'openai']).default('openai'),
    model: z.string().default('gpt-4'),
    temperature: z.number().min(0).max(2).default(0.2),
    maxTokens: z.number().positive().default(4096),
    maxChangesPerRequest: z.number().positive().default(5),
  }),
  optimization: z.object({
    allowedCategories: z.array(
      z.enum([
        'performance',
        'accessibility',
        'maintainability',
        'bundle-size',
        'ux',
        'code-quality',
      ])
    ).default(['performance', 'accessibility', 'maintainability']),
    requireReview: z.boolean().default(true),
    autoRunTests: z.boolean().default(false),
    autoFormat: z.boolean().default(true),
  }),
  server: z.object({
    port: z.number().positive().default(3847),
    host: z.string().default('localhost'),
  }),
  backup: z.object({
    enabled: z.boolean().default(true),
    maxBackups: z.number().positive().default(50),
    backupDir: z.string().default('.react-dev-insight-backups'),
  }),
  ui: z.object({
    theme: z.enum(['light', 'dark']).default('dark'),
    showLineNumbers: z.boolean().default(true),
    diffStyle: z.enum(['split', 'unified']).default('split'),
  }),
});

const DEFAULT_CONFIG: Config = {
  git: {
    autoCommit: true,
    branchPrefix: 'ai-optimization/',
    requireCleanWorkingDir: true,
    commitMessagePrefix: '[React Dev Insight]',
  },
  llm: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.2,
    maxTokens: 4096,
    maxChangesPerRequest: 5,
  },
  optimization: {
    allowedCategories: ['performance', 'accessibility', 'maintainability'],
    requireReview: true,
    autoRunTests: false,
    autoFormat: true,
  },
  server: {
    port: 3847,
    host: 'localhost',
  },
  backup: {
    enabled: true,
    maxBackups: 50,
    backupDir: '.react-dev-insight-backups',
  },
  ui: {
    theme: 'dark',
    showLineNumbers: true,
    diffStyle: 'split',
  },
};

const CONFIG_FILE_NAMES = [
  '.react-dev-insightrc.json',
  '.react-dev-insightrc',
  'react-dev-insight.config.json',
];

let cachedConfig: Config | null = null;
let cachedProjectPath: string | null = null;

/**
 * Find and load configuration file from project directory
 */
function findConfigFile(projectPath: string): string | null {
  for (const fileName of CONFIG_FILE_NAMES) {
    const filePath = join(projectPath, fileName);
    if (existsSync(filePath)) {
      return filePath;
    }
  }
  return null;
}

/**
 * Load and validate configuration from file
 */
function loadConfigFile(filePath: string): Partial<Config> {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    return parsed;
  } catch (error) {
    console.warn(`Failed to load config from ${filePath}:`, error);
    return {};
  }
}

/**
 * Deep merge two objects
 */
function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue !== undefined &&
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

/**
 * Load configuration with caching
 */
export function loadConfig(projectPath?: string): Config {
  const effectivePath = projectPath ?? process.cwd();

  // Return cached config if path matches
  if (cachedConfig && cachedProjectPath === effectivePath) {
    return cachedConfig;
  }

  // Find and load config file
  const configFilePath = findConfigFile(effectivePath);
  const fileConfig = configFilePath ? loadConfigFile(configFilePath) : {};

  // Merge with defaults
  const mergedConfig = deepMerge(DEFAULT_CONFIG as unknown as Record<string, unknown>, fileConfig) as unknown as Config;

  // Override with environment variables if present
  if (process.env.LLM_MODEL_NAME) {
    mergedConfig.llm.model = process.env.LLM_MODEL_NAME;
  }

  // Validate with Zod
  const validationResult = ConfigSchema.safeParse(mergedConfig);

  if (!validationResult.success) {
    console.warn('Config validation warnings:', validationResult.error.issues);
    cachedConfig = DEFAULT_CONFIG;
  } else {
    cachedConfig = validationResult.data as Config;
  }

  cachedProjectPath = effectivePath;
  return cachedConfig;
}

/**
 * Get current configuration (uses cached if available)
 */
export function getConfig(): Config {
  return cachedConfig ?? loadConfig();
}

/**
 * Clear configuration cache
 */
export function clearConfigCache(): void {
  cachedConfig = null;
  cachedProjectPath = null;
}

/**
 * Validate a partial config object
 */
export function validateConfig(config: unknown): {
  valid: boolean;
  errors: string[];
} {
  const result = ConfigSchema.safeParse(config);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`
    ),
  };
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): Config {
  return { ...DEFAULT_CONFIG };
}

export { DEFAULT_CONFIG, ConfigSchema };
