// PM2 ecosystem config for production deployment
module.exports = {
  apps: [
    {
      name: 'chalog-backend',
      script: './dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      cwd: '/home/ubuntu/chalog-backend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '600M', // t3.small 최적화: 400M → 600M (2GB RAM 활용)
      watch: false,
      node_args: '--require=reflect-metadata --max-old-space-size=500', // Node.js 힙 메모리 제한 (500MB)
    },
  ],
};

