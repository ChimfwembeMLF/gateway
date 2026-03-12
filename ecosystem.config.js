module.exports = {
  apps: [
    {
      name: 'rempay-production',
      script: 'dist/src/main.js',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
    {
      name: 'rempay-staging',
      script: 'dist/src/main.js',
      env: {
        NODE_ENV: 'staging',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
  ],
};
