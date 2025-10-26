export default ({ config }) => ({
  ...config,
  name: 'Zenith Studio',
  slug: config.slug || 'zenith-studio',
  ios: {
    ...config.ios,
  },
  android: {
    ...config.android,
  },
});
