#!/bin/sh
# Script to verify prisma schema location
echo "Current directory: $(pwd)"
echo "Listing contents of current directory:"
ls -la

echo "\nListing prisma directory if it exists:"
if [ -d "prisma" ]; then
  ls -la prisma/
else
  echo "prisma directory not found!"
fi

echo "\nSearching for schema.prisma:"
find . -name "schema.prisma" -type f