#!/bin/bash

# Database Clone Script - Replicates one database to another
# Primarily used to sync test database (asam_t) with development database (asam_d)

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

# Source and target databases
SOURCE_DB=${1:-"asam_d"}
TARGET_DB=${2:-"asam_t"}

echo -e "${CYAN}🗄️  Database Clone Script${NC}"
echo -e "${CYAN}========================${NC}"
echo -e "${BLUE}Source DB: ${GREEN}${SOURCE_DB}${NC}"
echo -e "${BLUE}Target DB: ${GREEN}${TARGET_DB}${NC}"
echo

# Confirm with the user
echo -e "${YELLOW}⚠️  WARNING: This will overwrite all data in ${TARGET_DB} with data from ${SOURCE_DB}${NC}"
read -p "Are you sure you want to proceed? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Operation cancelled by user${NC}"
    exit 0
fi

# Setup connection strings
SOURCE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$SOURCE_DB"
TARGET_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$TARGET_DB"

# Create temporary dump file
TEMP_DUMP_FILE="/tmp/${SOURCE_DB}_to_${TARGET_DB}_dump.sql"
echo -e "${BLUE}🔄 Creating database dump from ${SOURCE_DB}...${NC}"
pg_dump "$SOURCE_URL" > "$TEMP_DUMP_FILE"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error creating database dump${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Database dump created successfully${NC}"

# Drop and recreate target database
echo -e "${BLUE}🔄 Dropping target database ${TARGET_DB} if exists...${NC}"
dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" --if-exists "$TARGET_DB"
echo -e "${BLUE}🔄 Creating fresh target database ${TARGET_DB}...${NC}"
createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$TARGET_DB"

# Restore dump to target database
echo -e "${BLUE}🔄 Restoring data to ${TARGET_DB}...${NC}"
psql "$TARGET_URL" < "$TEMP_DUMP_FILE"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error restoring database${NC}"
    exit 1
fi

# Clean up
rm "$TEMP_DUMP_FILE"
echo -e "${GREEN}✅ Database clone completed successfully!${NC}"

# Verify clone success by comparing row counts for key tables
echo -e "${BLUE}🔍 Verifying database clone...${NC}"
tables=("User" "Client" "Activity" "WeeklyActivity")

for table in "${tables[@]}"; do
    source_count=$(psql -t "$SOURCE_URL" -c "SELECT COUNT(*) FROM \"$table\"")
    target_count=$(psql -t "$TARGET_URL" -c "SELECT COUNT(*) FROM \"$table\"")
    
    echo -e "Table ${CYAN}$table${NC}: ${source_count} rows in source, ${target_count} rows in target"
    
    if [ "$source_count" != "$target_count" ]; then
        echo -e "${YELLOW}⚠️  Row count mismatch for table $table${NC}"
    fi
done

echo -e "${GREEN}🎉 Database clone from ${SOURCE_DB} to ${TARGET_DB} completed successfully!${NC}"
