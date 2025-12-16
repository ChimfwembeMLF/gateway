"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadYamlConfig = loadYamlConfig;
const path = require("path");
const yaml = require("js-yaml");
const fs = require("fs");
function loadYamlConfig() {
    const env = process.env.NODE_ENV || 'development';
    const configDir = path.resolve(process.cwd(), 'config');
    const configPath = path.join(configDir, `${env}.yaml`);
    const defaultPath = path.join(configDir, 'default.yaml');
    const defaultConfig = yaml.load(fs.readFileSync(defaultPath, 'utf8'));
    let envConfig = {};
    try {
        envConfig = yaml.load(fs.readFileSync(configPath, 'utf8'));
    }
    catch { }
    return { ...defaultConfig, ...envConfig };
}
//# sourceMappingURL=config.loader.js.map