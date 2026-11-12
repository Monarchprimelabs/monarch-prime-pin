// Adds a base path for web builds that live under a folder (the website
// serves the web app at /app). Everything else comes from app.json.
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_BASE_URL;
  if (!baseUrl) return config;
  return { ...config, experiments: { ...(config.experiments ?? {}), baseUrl } };
};
