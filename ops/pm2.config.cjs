module.exports = {
  apps: [
    {
      name: 'vms-backend',
      cwd: './backend',
      script: 'src/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    }
  ]
};
