// Metro config (Expo defaults) with one web fix.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// tslib's package "exports" sends ESM imports to modules/index.js, which destructures the
// CommonJS default export and crashes on web ("Cannot destructure property '__extends'").
// Point every `tslib` import at its self-contained ES module build instead.
const tslibEsm = path.join(path.dirname(require.resolve('tslib/package.json')), 'tslib.es6.mjs');
const upstreamResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib') return { type: 'sourceFile', filePath: tslibEsm };
  return upstreamResolve ? upstreamResolve(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
