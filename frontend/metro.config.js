const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Resolve react-native-maps to our web stub when bundling for web
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      filePath: path.resolve(__dirname, 'react-native-maps.web.ts'),
      type: 'sourceFile',
    };
  }
  // Fall back to default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
