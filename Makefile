# Makefile for smipay-backend - Docker Compose + Prisma helpers
# Usage: run `make help` to see available commands.

# -------- Configurable variables (override with `make VAR=value target`) --------
DEV_COMPOSE ?= docker-compose.dev.yml
STAGING_COMPOSE ?= docker-compose.staging.yml
PROD_COMPOSE ?= docker-compose.prod.yml
# Name of the app service inside your compose files (used for `exec`)
SERVICE ?= api
# Optional .env file path
ENV_FILE ?= .env

# Internal helper: choose compose file by ENV
# Usage: make ENV=dev <target>  (dev|staging|prod)
ifeq ($(ENV),prod)
	COMPOSE_FILE := $(PROD_COMPOSE)
else ifeq ($(ENV),staging)
	COMPOSE_FILE := $(STAGING_COMPOSE)
else
	COMPOSE_FILE := $(DEV_COMPOSE)
endif

# Default goal
.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help
	@echo "Available make targets:" && \
	awk 'BEGIN {FS = ":.*##"}; /^[a-zA-Z0-9_-]+:.*?##/ {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# -------- Dev / Staging / Prod lifecycle --------
.PHONY: dev
dev: ## Start development stack (foreground, rebuild)
	docker compose -f $(DEV_COMPOSE) up --build

.PHONY: dev-d
dev-d: ## Start development stack in background (detached, rebuild)
	docker compose -f $(DEV_COMPOSE) up -d --build

.PHONY: dev-down
dev-down: ## Stop and remove dev containers
	docker compose -f $(DEV_COMPOSE) down

.PHONY: staging
staging: ## Start staging stack (detached, rebuild)
	docker compose -f $(STAGING_COMPOSE) up -d --build

.PHONY: staging-down
staging-down: ## Stop and remove staging containers
	docker compose -f $(STAGING_COMPOSE) down

.PHONY: prod
prod: ## Start production stack (detached, rebuild)
	docker compose -f $(PROD_COMPOSE) up -d --build

.PHONY: prod-down
prod-down: ## Stop and remove production containers
	docker compose -f $(PROD_COMPOSE) down

# -------- Generic (ENV-aware) helpers --------
.PHONY: up
up: ## Start stack for ENV={dev|staging|prod} (detached, rebuild). Default ENV=dev
	docker compose -f $(COMPOSE_FILE) up -d --build

.PHONY: down
down: ## Stop stack for ENV={dev|staging|prod}. Default ENV=dev
	docker compose -f $(COMPOSE_FILE) down

.PHONY: ps
ps: ## List containers for the selected ENV
	docker compose -f $(COMPOSE_FILE) ps

.PHONY: logs
logs: ## Tail logs for the selected ENV; use SVC=<service> to filter
	@if [ -n "$(SVC)" ]; then \
		docker compose -f $(COMPOSE_FILE) logs -f $(SVC); \
	else \
		docker compose -f $(COMPOSE_FILE) logs -f; \
	fi

.PHONY: restart
restart: ## Restart app service for the selected ENV
	docker compose -f $(COMPOSE_FILE) restart $(SERVICE)

# -------- Prisma & DB --------
.PHONY: migrate
migrate: ## Run prisma migrate deploy inside app container for ENV (default dev)
	docker compose -f $(COMPOSE_FILE) exec -T $(SERVICE) npx prisma migrate deploy

.PHONY: db-push
db-push: ## Run prisma db push inside app container for ENV (default dev)
	docker compose -f $(COMPOSE_FILE) exec -T $(SERVICE) npx prisma db push

.PHONY: generate
generate: ## Run prisma generate inside app container for ENV (default dev)
	docker compose -f $(COMPOSE_FILE) exec -T $(SERVICE) npx prisma generate

.PHONY: studio
studio: ## Open Prisma Studio (forwards port); Ctrl+C to stop
	docker compose -f $(COMPOSE_FILE) exec $(SERVICE) npx prisma studio

.PHONY: seed
seed: ## Run npm seed script inside app container if available
	docker compose -f $(COMPOSE_FILE) exec -T $(SERVICE) npm run seed || true

# -------- Local Docker utilities --------
.PHONY: build
build: ## Build image directly from Dockerfile (no compose)
	docker build -t smipay-backend .

.PHONY: run
run: ## Run built image directly (maps port 3000); override with PORT=xxxx
	@PORT=$${PORT:-3000}; \
	docker run --rm --env-file $(ENV_FILE) -p $$PORT:3000 smipay-backend

.PHONY: prune
prune: ## Prune stopped containers, networks, and dangling images (confirmless)
	docker system prune -f

.PHONY: shell
shell: ## Open a shell in the app container for selected ENV
	docker compose -f $(COMPOSE_FILE) exec $(SERVICE) sh

# -------- Information --------
.PHONY: env
env: ## Show selected ENV and compose/service settings
	@echo "ENV           : ${ENV:-dev}" && \
	echo "COMPOSE_FILE : $(COMPOSE_FILE)" && \
	echo "SERVICE      : $(SERVICE)" && \
	echo "ENV_FILE     : $(ENV_FILE)"
