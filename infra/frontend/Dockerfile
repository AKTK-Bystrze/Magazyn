# Use Node.js 22 Alpine as the base image for building
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (use ci for reproducible builds)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build arguments
ARG PUBLIC_SUPABASE_URL
ARG PUBLIC_SUPABASE_ANON_KEY
ARG PUBLIC_BACKEND_URL
ARG PUBLIC_APP_URL


# Build the application
RUN npm run build

# --- Runtime Stage ---
FROM node:22-alpine AS runtime

# Set working directory
WORKDIR /app

# Copy built assets and necessary files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Expose the port Astro runs on (default 4321)
EXPOSE 4321

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=4321

# Run the standalone server
CMD ["node", "./dist/server/entry.mjs"]
