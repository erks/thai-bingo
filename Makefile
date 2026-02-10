.PHONY: fmt test dev client worker install clean

.DEFAULT_GOAL := fmt

CLIENT_PORT ?= 3000
WORKER_PORT ?= 8787

# Lint and type-check the codebase
fmt: install
	@echo "Type-checking worker..."
	@cd worker && npm exec tsc -- --noEmit

# Run worker tests
test: install
	@echo "Running worker tests..."
	@cd worker && npm test

# Start both client and worker; Ctrl+C stops everything
dev: install
	@echo "Starting client on http://localhost:$(CLIENT_PORT) and worker on http://localhost:$(WORKER_PORT)..."
	@pids=""; \
	trap 'kill $$pids 2>/dev/null; sleep 0.3; kill -9 $$pids 2>/dev/null; exit 0' INT TERM; \
	python3 -m http.server $(CLIENT_PORT) -b 127.0.0.1 & pids="$$!"; \
	(cd worker && npx wrangler dev --port $(WORKER_PORT)) & pids="$$pids $$!"; \
	wait

# Start only the static file server for the client
client:
	python3 -m http.server $(CLIENT_PORT) -b 127.0.0.1

# Start only the Cloudflare Worker locally
worker: install
	cd worker && npx wrangler dev --port $(WORKER_PORT)

# Install worker dependencies
install:
	cd worker && npm install

# Kill any dangling dev processes on CLIENT_PORT and WORKER_PORT
clean:
	@echo "Cleaning up dangling processes..."
	@lsof -ti :$(CLIENT_PORT) | xargs kill 2>/dev/null && echo "Killed process(es) on port $(CLIENT_PORT)" || echo "Nothing on port $(CLIENT_PORT)"
	@lsof -ti :$(WORKER_PORT) | xargs kill 2>/dev/null && echo "Killed process(es) on port $(WORKER_PORT)" || echo "Nothing on port $(WORKER_PORT)"
