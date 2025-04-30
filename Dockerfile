# Dockerfile for a Node.js application with Prisma ...... Dcokerfile

# Base image
FROM node:20-alpine AS base

# Working directory
WORKDIR /app

# Install dependencies for node-gyp (required for some packages)
RUN apk add --no-cache python3 make g++

# Install dependencies stage
FROM base AS dependencies
# Copy package.json and package-lock.json
COPY package*.json ./
# Copy prisma directory (crucial for prisma generate)
COPY prisma ./prisma/
# Install dependencies without running scripts yet
RUN npm install --no-audit --ignore-scripts

# Development stage
FROM dependencies AS dev
# Copy the rest of the application
COPY . .
# Generate Prisma client explicitly
RUN npx prisma generate
# Use development command
CMD ["npm", "run", "start:dev"]

# Build stage (for production)
FROM dependencies AS build
# Copy the rest of the application
COPY . .
# Generate Prisma client
RUN npx prisma generate
# Build the application
RUN npm run build

# Production stage - create a smaller image
FROM base AS production
# Copy necessary files from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/prisma ./prisma
# Generate Prisma client in production
RUN npx prisma generate
# Set NODE_ENV
ENV NODE_ENV=production
# Command to run in production
CMD ["npm", "run", "start:prod"]