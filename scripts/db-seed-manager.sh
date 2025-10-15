#!/bin/bash

# Enhanced Database Seed Manager
# Provides easy commands to load/unload seed data for different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

# Default values
ACTION=${1:-help}
ENV=${2:-development}
SEED_TYPE=${3:-enhanced}

# Display help
show_help() {
    echo -e "${CYAN}🌱 Database Seed Manager${NC}"
    echo -e "${CYAN}========================${NC}"
    echo
    echo -e "${BLUE}Usage:${NC} $0 <action> [environment] [seed-type]"
    echo
    echo -e "${BLUE}Actions:${NC}"
    echo -e "  ${GREEN}load${NC}      - Load seed data into the database"
    echo -e "  ${GREEN}unload${NC}    - Clear all data from the database"
    echo -e "  ${GREEN}reload${NC}    - Unload then load seed data (fresh start)"
    echo -e "  ${GREEN}status${NC}    - Show current database status"
    echo -e "  ${GREEN}help${NC}      - Show this help message"
    echo
    echo -e "${BLUE}Environments:${NC}"
    echo -e "  ${GREEN}production${NC} - Production database (asam) - minimal data"
    echo -e "  ${GREEN}development${NC} - Development database (asam_d) - full test data (default)"
    echo -e "  ${GREEN}test${NC}       - Test database (asam_t) - full test data"
    echo
    echo -e "${BLUE}Seed Types:${NC}"
    echo -e "  ${GREEN}basic${NC}      - Original seed data (users only)"
    echo -e "  ${GREEN}enhanced${NC}   - Enhanced seed with activities from Jan 2, 2025 (default)"
    echo
    echo -e "${BLUE}Examples:${NC}"
    echo -e "  $0 load development enhanced    # Load enhanced seed to dev"
    echo -e "  $0 reload test                  # Clear and reload test database"
    echo -e "  $0 unload production            # Clear production database"
    echo -e "  $0 status                       # Show dev database status"
    echo

}

# Set environment variables based on target
set_environment() {
    case $ENV in
        "production"|"prod")
            export NODE_ENV=production
            export DATABASE_NAME="$DB_NAME_PRODUCTION"
            export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME_PRODUCTION?schema=$DB_SCHEMA"
            ;;
        "development"|"dev")
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
            show_help
            exit 1
            ;;
    esac
}

# Load seed data
load_seed() {
    echo -e "${BLUE}🌱 Loading seed data...${NC}"
    echo -e "${BLUE}Environment: ${GREEN}$ENV${NC}"
    echo -e "${BLUE}Database: ${GREEN}$DATABASE_NAME${NC}"
    echo -e "${BLUE}Seed Type: ${GREEN}$SEED_TYPE${NC}"
    echo
    
    # Ensure Prisma client is generated
    echo -e "${BLUE}🔄 Generating Prisma client...${NC}"
    npx prisma generate
    
    # Run migrations
    echo -e "${BLUE}🔄 Running database migrations...${NC}"
    npx prisma db push
    
    # Run appropriate seed script
    if [ "$SEED_TYPE" = "enhanced" ]; then
        echo -e "${BLUE}🌱 Running enhanced seed script...${NC}"
        npx ts-node prisma/seed-enhanced.ts
    else
        echo -e "${BLUE}🌱 Running basic seed script...${NC}"
        npx ts-node prisma/seed.ts
    fi
    
    echo -e "${GREEN}✅ Seed data loaded successfully!${NC}"
}

# Unload (clear) all data
unload_seed() {
    echo -e "${YELLOW}⚠️  WARNING: This will delete ALL data from the database!${NC}"
    echo -e "${BLUE}Environment: ${GREEN}$ENV${NC}"
    echo -e "${BLUE}Database: ${GREEN}$DATABASE_NAME${NC}"
    
    if [ "$ENV" = "production" ] || [ "$ENV" = "prod" ]; then
        echo -e "${RED}⚠️  PRODUCTION DATABASE - Extra confirmation required!${NC}"
        echo -n "Type 'DELETE PRODUCTION DATA' to confirm: "
        read confirmation
        if [ "$confirmation" != "DELETE PRODUCTION DATA" ]; then
            echo -e "${RED}❌ Confirmation failed. Aborting.${NC}"
            exit 1
        fi
    else
        echo -n "Are you sure? (y/N): "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Cancelled.${NC}"
            exit 0
        fi
    fi
    
    echo -e "${BLUE}🧹 Clearing database...${NC}"
    npx ts-node prisma/seed-enhanced.ts --reset
    echo -e "${GREEN}✅ Database cleared successfully!${NC}"
}

# Reload seed data (unload then load)
reload_seed() {
    echo -e "${BLUE}🔄 Reloading seed data...${NC}"
    unload_seed
    echo
    load_seed
}

# Show database status
show_status() {
    echo -e "${BLUE}📊 Database Status${NC}"
    echo -e "${BLUE}==================${NC}"
    echo -e "${BLUE}Environment: ${GREEN}$ENV${NC}"
    echo -e "${BLUE}Database: ${GREEN}$DATABASE_NAME${NC}"
    echo
    
    # Test connection
    echo -e "${BLUE}🔗 Testing connection...${NC}"
    if npx prisma db execute --command "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Connection successful${NC}"
    else
        echo -e "${RED}❌ Connection failed${NC}"
        exit 1
    fi
    
    # Get counts using Prisma
    echo -e "${BLUE}📊 Data counts:${NC}"
    
    # Create a temporary TypeScript file to query counts
    cat > /tmp/db-status.ts << 'EOF'
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  const activityCount = await prisma.activity.count();
  const taskCount = await prisma.task.count();
  const clientCount = await prisma.client.count();
  const metricCount = await prisma.salesMetric.count();
  
  console.log(`Users: ${userCount}`);
  console.log(`Activities: ${activityCount}`);
  console.log(`Tasks: ${taskCount}`);
  console.log(`Clients: ${clientCount}`);
  console.log(`Sales Metrics: ${metricCount}`);
  
  // Show hierarchy
  if (userCount > 0) {
    console.log('\nUser Hierarchy:');
    const users = await prisma.user.findMany({
      include: { manager: true, reports: true },
      orderBy: { id: 'asc' }
    });
    
    for (const user of users) {
      const reportCount = user.reports.length;
      console.log(`- ${user.username} (${user.role})${user.manager ? ` → reports to ${user.manager.username}` : ''}${reportCount > 0 ? ` → manages ${reportCount} users` : ''}`);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });
EOF
    
    npx ts-node /tmp/db-status.ts
    rm -f /tmp/db-status.ts
}

# Main execution
set_environment

case $ACTION in
    "load")
        load_seed
        ;;
    "unload")
        unload_seed
        ;;
    "reload")
        reload_seed
        ;;
    "status")
        show_status
        ;;
    "help"|*)
        show_help
        ;;
esac 