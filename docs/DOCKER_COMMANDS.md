# How to Run the Gateway App (YAML Config Only)

1. Build the Docker image for the app:
```
docker-compose build app
```

2. Start the database and app containers:
```
docker-compose up -d db
# Wait a few seconds for the database to initialize

docker-compose up -d app
```

3. Run database migrations (if needed):
```
docker-compose exec app yarn db:migrate
```

4. Check running containers:
```
docker ps
```

5. View app logs:
```
docker-compose logs -f app
```

---
- The app now uses only YAML config files (no .env required).
- Edit config files in the `config/` directory for environment changes.
- Use `docker-compose restart app` to restart the app after config changes.

---
# Refresh Database (Clean State)

This will delete all data and recreate the database:

```
docker-compose down -v
docker-compose up -d db
```

After recreating, run migrations to set up tables:

```
docker-compose exec app yarn db:migrate
```
# Gateway Docker & Database Commands

## App Dependency Fix

Install the latest available @types/helmet:
```
yarn add -D @types/helmet@latest
```

## Docker Compose (Production Build)

Build and start the app service using your Dockerfile:
```
docker-compose build app
docker-compose up -d app
```

## Restart App Service (Development)
```
docker-compose restart app
```

## Database Migrations

Run migrations from the app container:
```
docker-compose exec app yarn db:migrate
```

## Reset Database (Dangerous: Deletes all data)
```
docker-compose down -v
docker-compose up -d db
```

## Check Running Containers
```
docker ps
```

## Check Compose Services
```
docker-compose config --services
```

## View Logs
```
docker-compose logs -f
```

## Build App Only (No Start)

To build the app Docker image without starting it:
```
docker-compose build app
```

To run the build script inside the app container (after starting):
```
docker-compose exec app yarn build
```

- The first command builds the Docker image using your Dockerfile.
- The second command runs the app's build script (TypeScript compile, etc.) inside the running container.

---
Edit as needed for your workflow. For production, always run migrations before starting the app.
