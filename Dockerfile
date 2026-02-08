# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install ALL dependencies (dev + prod)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

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

# Support custom environment file selection
# ARG ENV_FILE=.env.production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001

# Copy only production deps
COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile && \
  yarn cache clean

# Copy built app + configs from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/config ./config


# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose default NestJS port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the app
CMD ["node", "dist/src/main.js"]
