#!/bin/bash

# Simple script to fix the test database (asam_t)
# Uses Prisma to reset and seed the test database

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database connection for test database
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-CHANGE_ME_IN_ENV}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="asam_t"

# Set the DATABASE_URL environment variable
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?schema=public"

echo -e "${BLUE}🔧 Fixing test database (asam_t)...${NC}"
echo -e "${BLUE}Using connection: $DATABASE_URL${NC}"

# Confirm with user
echo -e "${YELLOW}⚠️ WARNING: This will completely reset the test database!${NC}"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${BLUE}Operation cancelled.${NC}"
  exit 0
fi

# Reset the database (this will drop and recreate all tables)
echo -e "${BLUE}🗑️ Resetting database schema...${NC}"
npx prisma db push --force-reset
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to reset database schema${NC}"
  exit 1
fi

# Run Prisma generate to ensure client is up to date
echo -e "${BLUE}🔄 Generating Prisma client...${NC}"
npx prisma generate
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to generate Prisma client${NC}"
  exit 1
fi

# Seed the database with the enhanced seed script
echo -e "${BLUE}🌱 Seeding database with enhanced data...${NC}"
npx ts-node prisma/seed-enhanced.ts
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to seed database${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Test database has been reset and seeded successfully!${NC}"
