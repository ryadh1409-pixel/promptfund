const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Firebase Auth must resolve to the React Native bundle (with AsyncStorage persistence).
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
