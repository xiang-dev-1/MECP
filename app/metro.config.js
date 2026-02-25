const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch the workspace root for changes in engine/ and languages/
config.watchFolders = [workspaceRoot];

// Resolve modules from both app/node_modules and root/node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Ensure the engine source and language JSON files are resolved
config.resolver.extraNodeModules = {
  '@mecp/engine': path.resolve(workspaceRoot, 'engine', 'src'),
};

module.exports = config;
