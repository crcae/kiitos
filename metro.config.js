const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// --- INICIO DEL FIX para react-native-country-picker-modal ---

// 1. Permitir archivos CJS (CommonJS), necesario para librerías antiguas en web
config.resolver.sourceExts.push("cjs");

// 2. Forzar a Metro a encontrar 'react-async-hook' correctamente
// Esto arregla el error: "package itself specifies a main module field that could not be resolved"
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-async-hook': require.resolve('react-async-hook'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib') {
    return {
      filePath: require.resolve('./tslib-shim.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

// --- FIN DEL FIX ---

module.exports = withNativeWind(config, { input: "./global.css" });
