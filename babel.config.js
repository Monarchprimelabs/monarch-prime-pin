module.exports = function(api) {
  api.cache(true);
  return {
    // babel-preset-expo adds the Reanimated / worklets plugin itself when the
    // package is installed; listing it here too would run it twice.
    presets: ['babel-preset-expo'],
  };
};
