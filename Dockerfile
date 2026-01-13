# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install ALL dependencies (dev + prod)
COPY package.json yarn.lock ./
RUN yarn install

# Install NestJS CLI globally for build
RUN yarn global add @nestjs/cli

# Copy source code and configs
COPY . .
COPY config/ ./config/

# Build the NestJS app
RUN yarn build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app

# Copy only production deps
COPY package.json yarn.lock ./
RUN yarn install --production

# Copy built app + configs from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/config ./config

# Expose default NestJS port
EXPOSE 3000

# Start the app
CMD ["node", "dist/src/main.js"]
