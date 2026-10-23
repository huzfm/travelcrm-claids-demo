#!/bin/bash

# Database Cleanup Script
# Truncates all tables in PostgreSQL, preserving schema
# ⚠️  WARNING: This is DESTRUCTIVE - all data will be permanently deleted

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
echo -e "${RED}  ⚠️  DATABASE CLEANUP - ALL DATA WILL BE DELETED ⚠️${NC}"
echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}This will delete all data from:${NC}"
echo "  • branches, users, leads, follow-ups"
echo "  • itineraries, itinerary templates"
echo "  • whatsapp messages & contacts"
echo "  • audit logs, activities, tags"
echo "  • ad campaigns, hotels, OTPs"
echo ""
echo -e "${YELLOW}Schema & tables will remain intact.${NC}"
echo ""

# Prompt for confirmation
read -p "Type 'DELETE ALL DATA' to confirm: " confirmation

if [ "$confirmation" != "DELETE ALL DATA" ]; then
    echo -e "${RED}Cancelled - no data was deleted${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Starting database cleanup...${NC}"
echo ""

# Run Prisma to clear all data
npx prisma db execute --stdin << 'SQL'
-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- Truncate all tables in dependency order
TRUNCATE TABLE "ad_campaign_leads" CASCADE;
TRUNCATE TABLE "ad_campaigns" CASCADE;
TRUNCATE TABLE "lead_to_tags" CASCADE;
TRUNCATE TABLE "lead_tags" CASCADE;
TRUNCATE TABLE "audit_logs" CASCADE;
TRUNCATE TABLE "whatsapp_messages" CASCADE;
TRUNCATE TABLE "whatsapp_contacts" CASCADE;
TRUNCATE TABLE "whatsapp_templates" CASCADE;
TRUNCATE TABLE "assignment_rules" CASCADE;
TRUNCATE TABLE "lead_activities" CASCADE;
TRUNCATE TABLE "follow_ups" CASCADE;
TRUNCATE TABLE "itineraries" CASCADE;
TRUNCATE TABLE "itinerary_templates" CASCADE;
TRUNCATE TABLE "leads" CASCADE;
TRUNCATE TABLE "otps" CASCADE;
TRUNCATE TABLE "hotels" CASCADE;
TRUNCATE TABLE "users" CASCADE;
TRUNCATE TABLE "branches" CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = default;

-- Reset all sequences to 1
SELECT setval(pg_get_serial_sequence(t.tablename, c.attname), 1)
FROM pg_tables t
JOIN pg_attribute c ON c.attrelname = t.tablename
JOIN pg_class rel ON rel.relname = t.tablename
WHERE t.schemaname = 'public'
  AND c.atttypid IN (SELECT oid FROM pg_type WHERE typname IN ('int2', 'int4', 'int8'));
SQL

echo ""
echo -e "${GREEN}✓ Database cleanup complete!${NC}"
echo -e "${GREEN}✓ All data has been deleted${NC}"
echo -e "${GREEN}✓ Schema remains intact${NC}"
echo ""
echo -e "${YELLOW}To reseed the database with default data, run:${NC}"
echo -e "${GREEN}npm run db:seed${NC}"
echo ""
