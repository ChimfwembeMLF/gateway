module.exports = {
  apps: [
    {
      name: "rempay-staging",
      script: "dist/src/main.js",   // your build output
      cwd: "/home/api.tekreminnovations.com/public_html",

      exec_mode: "cluster",
      instances: 1,

      env: {
        NODE_ENV: "staging",
        PORT: 4000
      },

      autorestart: true,
      watch: false,
      max_memory_restart: "500M"
    }
  ]
};