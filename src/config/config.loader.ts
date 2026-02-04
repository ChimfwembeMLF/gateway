import * as path from 'path';
import * as yaml from 'js-yaml';
import * as fs from 'fs';

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
  return { ...defaultConfig, ...envConfig };
}
