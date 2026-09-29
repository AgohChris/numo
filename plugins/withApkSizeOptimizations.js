const { withGradleProperties } = require('@expo/config-plugins');

function setProperty(properties, key, value) {
  const existing = properties.find((item) => item.type === 'property' && item.key === key);
  if (existing) {
    existing.value = value;
  } else {
    properties.push({ type: 'property', key, value });
  }
  return properties;
}

module.exports = function withApkSizeOptimizations(config) {
  return withGradleProperties(config, (config) => {
    setProperty(config.modResults, 'reactNativeArchitectures', 'arm64-v8a');
    setProperty(config.modResults, 'android.enableMinifyInReleaseBuilds', 'true');
    setProperty(config.modResults, 'android.enableShrinkResourcesInReleaseBuilds', 'true');
    return config;
  });
};
