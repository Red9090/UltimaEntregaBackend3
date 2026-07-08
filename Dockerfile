# Use Node.js 18 alpine as base image
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for building if needed, but we only need production)
RUN npm install

# Copy source code
COPY . .

# Production image
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy only the necessary files from the builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/.env .env  # Note: in production, we might use Docker secrets or env-file; but for simplicity we copy .env

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# Expose port
EXPOSE 5000

# Start the server
CMD ["npm", "start"]
