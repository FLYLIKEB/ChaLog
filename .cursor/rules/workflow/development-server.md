## Local Development Server

To run the local development environment (SSH tunnel, backend, frontend) all at once:
- Run `npm run dev:local` (recommended)
- Or run `./scripts/start-local.sh`

To stop the local development environment:
- Run `npm run dev:stop` (recommended)
- Or run `./scripts/stop-local.sh`

Note: The 'run' command executes 'pkill -f "next dev" || true && npm run dev'
Note: This project uses Vite, so the above command only runs the frontend
To run the full environment (SSH tunnel+backend+frontend), use `npm run dev:local`

## Server Logs

When using `start-local.sh` script, server logs are saved to:
- **Backend logs**: `/tmp/chalog-backend.log`
- **Frontend logs**: `/tmp/chalog-frontend.log`

### Viewing Logs

**Real-time log monitoring (recommended):**
```bash
# Backend logs
tail -f /tmp/chalog-backend.log

# Frontend logs
tail -f /tmp/chalog-frontend.log
```

**View recent logs:**
```bash
# Last 100 lines of backend logs
tail -n 100 /tmp/chalog-backend.log

# Last 100 lines of frontend logs
tail -n 100 /tmp/chalog-frontend.log
```

**Search logs:**
```bash
# Search for errors in backend logs
grep "error" /tmp/chalog-backend.log

# Real-time search
tail -f /tmp/chalog-backend.log | grep "error"
```

**Access URLs:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/health

