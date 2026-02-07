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

---
Edit as needed for your workflow. For production, always run migrations before starting the app.
