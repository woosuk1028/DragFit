// PM2 ecosystem config — `pm2 start ecosystem.config.js`
// Backend on :3001, Frontend on :4001 (3000/4000 are taken on prod)

module.exports = {
  apps: [
    {
      name: 'dragfit-backend',
      cwd: './backend',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      out_file: './backend/logs/out.log',
      error_file: './backend/logs/err.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'dragfit-frontend',
      cwd: './frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 4001',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 4001,
      },
      out_file: './frontend/logs/out.log',
      error_file: './frontend/logs/err.log',
      merge_logs: true,
      time: true,
    },
  ],
};
