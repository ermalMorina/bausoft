const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Only watch the app directory, not the entire monorepo
config.watchFolders = [projectRoot];

// Configure resolver to allow resolving from root node_modules
// but limit file watching to reduce EMFILE errors
config.resolver = {
  ...config.resolver,
  // Allow resolving from root node_modules (needed for monorepo)
  nodeModulesPaths: [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(monorepoRoot, 'node_modules'),
  ],
  // Block watching backend directory to reduce file watchers
  blockList: [
    new RegExp(`${monorepoRoot}/bauSoftBackend/.*`),
  ],
};

// Reduce file watching by excluding unnecessary directories
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

module.exports = config;
