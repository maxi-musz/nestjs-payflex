#!/bin/bash

# Database Reset Script
# This script will:
# 1. Drop the database
# 2. Delete all migration files
# 3. Reset Prisma migrations
# 4. Create a fresh migration

echo "⚠️  WARNING: This will DELETE all data and migrations!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

echo "📦 Resetting Prisma migrations..."
npx prisma migrate reset --force

echo "🗑️  Deleting all migration files..."
rm -rf prisma/migrations/*

echo "📝 Creating fresh migration..."
npx prisma migrate dev --name init

echo "✨ Database reset complete!"
echo "📊 Generating Prisma Client..."
npx prisma generate

echo "✅ Done! Your database is now fresh and ready."

