#!/bin/sh
set -e

echo "Current directory: $(pwd)"
echo "Listing files in prisma directory:"
ls -la ./prisma

echo "Generating Prisma client..."
npx prisma generate --schema=./prisma/schema.prisma

echo "Prisma client generated successfully!"