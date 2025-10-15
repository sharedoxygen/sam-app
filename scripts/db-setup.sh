#!/bin/bash

# Database Setup Script for Multiple Environments
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database connection configuration
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_USER=${DB_USER:-"postgres"}
DB_PASSWORD=${DB_PASSWORD:-"CHANGE_ME_IN_ENV"}
DB_SCHEMA=${DB_SCHEMA:-"public"}

# Database names
DB_NAME_PRODUCTION=${DB_NAME_PRODUCTION:-"asam"}
DB_NAME_DEVELOPMENT=${DB_NAME_DEVELOPMENT:-"asam_d"}
DB_NAME_TEST=${DB_NAME_TEST:-"asam_t"}

# Default environment
ENV=${1:-development}
RESET=${2:-false}

echo -e "${BLUE}🗄️  Database Setup Script${NC}"
echo -e "${BLUE}Environment: ${ENV}${NC}"
echo -e "${BLUE}This script uses environment variables for database connection.${NC}"
echo -e "${BLUE}Use ${CYAN}scripts/db-config.sh${NC} to configure database settings.${NC}"
echo

# Set database URL based on environment
case $ENV in
  "production")
    export NODE_ENV=production
    export DATABASE_NAME="$DB_NAME_PRODUCTION"
    export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME_PRODUCTION?schema=$DB_SCHEMA"
    ;;
  "development")
    export NODE_ENV=development
    export DATABASE_NAME="$DB_NAME_DEVELOPMENT"
    export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME_DEVELOPMENT?schema=$DB_SCHEMA"
    ;;
  "test")
    export NODE_ENV=test
    export DATABASE_NAME="$DB_NAME_TEST"
    export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME_TEST?schema=$DB_SCHEMA"
    ;;
  *)
    echo -e "${RED}❌ Invalid environment: $ENV${NC}"
    echo -e "${YELLOW}Usage: $0 [production|development|test] [reset]${NC}"
    exit 1
    ;;
esac

echo -e "${BLUE}Database: ${DATABASE_NAME}${NC}"
echo -e "${BLUE}Database URL: ${DATABASE_URL}${NC}"

# Reset database if requested
if [ "$RESET" = "reset" ]; then
  echo -e "${YELLOW}⚠️  Resetting database...${NC}"
  npx prisma db push --force-reset
  echo -e "${GREEN}✅ Database reset completed${NC}"
else
  # Run migrations
  echo -e "${BLUE}🔄 Running database migrations...${NC}"
  npx prisma db push
  echo -e "${GREEN}✅ Migrations completed${NC}"
fi

# Generate Prisma client
echo -e "${BLUE}🔄 Generating Prisma client...${NC}"
npx prisma generate
echo -e "${GREEN}✅ Prisma client generated${NC}"

# Run seed
echo -e "${BLUE}🌱 Seeding database...${NC}"
npx prisma db seed
echo -e "${GREEN}✅ Database seeded successfully${NC}"

echo -e "${GREEN}🎉 Database setup completed for ${ENV} environment!${NC}"

# Show quick connection test
echo -e "${BLUE}🔗 Testing database connection...${NC}"
if npx prisma db execute --command "SELECT 1;" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Database connection successful${NC}"
else
  echo -e "${RED}❌ Database connection failed${NC}"
fi 