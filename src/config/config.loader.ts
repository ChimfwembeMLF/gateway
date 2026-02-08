import * as path from 'path';
import * as yaml from 'js-yaml';
import * as fs from 'fs';

// No environment variable resolution; YAML values are used directly

export function loadYamlConfig() {
  const env = 'development';
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
  
  // Return merged YAML config directly
  return mergedConfig;
}
