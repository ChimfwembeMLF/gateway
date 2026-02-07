import * as path from 'path';
import * as yaml from 'js-yaml';
import * as fs from 'fs';

/**
 * Recursively resolves environment variable placeholders in config objects
 * Example: "${DATABASE_HOST}" becomes the value of process.env.DATABASE_HOST
 */
function resolveEnvVariables(obj: any): any {
  if (typeof obj === 'string') {
    // Match ${VAR_NAME} pattern
    const match = obj.match(/^\$\{([A-Z_]+)\}$/);
    if (match) {
      const envVar = match[1];
      const value = process.env[envVar];
      if (value === undefined) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
      return value;
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(resolveEnvVariables);
  }
  
  if (obj !== null && typeof obj === 'object') {
    const resolved: any = {};
    for (const key in obj) {
      resolved[key] = resolveEnvVariables(obj[key]);
    }
    return resolved;
  }
  
  return obj;
}

export function loadYamlConfig() {
  const env = process.env.NODE_ENV || 'development';
  // Use process.cwd() to always resolve from project root
  const configDir = path.resolve(process.cwd(), 'config');
  const configPath = path.join(configDir, `${env}.yaml`);
  const defaultPath = path.join(configDir, 'default.yaml');
  
  const defaultConfig = yaml.load(fs.readFileSync(defaultPath, 'utf8')) as Record<string, any>;
  let envConfig = {};
  
  try {
    envConfig = yaml.load(fs.readFileSync(configPath, 'utf8')) as Record<string, any>;
  } catch {}
  
  const mergedConfig = { ...defaultConfig, ...envConfig };
  
  // Resolve all environment variable placeholders
  return resolveEnvVariables(mergedConfig);
}
