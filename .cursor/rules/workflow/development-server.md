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

