#!/bin/bash

# =============================================================================
# CREDENTIAL ROTATION SCRIPT
# =============================================================================
# 
# This script helps you generate new secure credentials to replace exposed ones
#
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          CREDENTIAL ROTATION HELPER                   ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo

echo -e "${BLUE}This script will generate new secure credentials${NC}"
echo

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}❌ openssl is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}1. NEW NEXTAUTH_SECRET${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo -e "${CYAN}NEXTAUTH_SECRET=\"${NEXTAUTH_SECRET}\"${NC}"
echo

echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}2. NEW NEXTAUTH PREVIEW KEYS (Optional)${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
PREVIEW_ID=$(openssl rand -hex 16)
SIGNING_KEY=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
echo -e "${CYAN}NEXTAUTH_PREVIEW_ID=\"${PREVIEW_ID}\"${NC}"
echo -e "${CYAN}NEXTAUTH_PREVIEW_SIGNING_KEY=\"${SIGNING_KEY}\"${NC}"
echo -e "${CYAN}NEXTAUTH_PREVIEW_ENCRYPTION_KEY=\"${ENCRYPTION_KEY}\"${NC}"
echo

echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}3. NEW DATABASE PASSWORD${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)
echo -e "${CYAN}DATABASE_PASSWORD=\"${DB_PASSWORD}\"${NC}"
echo -e "${CYAN}DB_PASSWORD=\"${DB_PASSWORD}\"${NC}"
echo

echo -e "${YELLOW}══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}IMPORTANT: NEXT STEPS${NC}"
echo -e "${YELLOW}══════════════════════════════════════════════════════${NC}"
echo
echo -e "${BLUE}1. Update your .env and .env.local files with these values${NC}"
echo
echo -e "${BLUE}2. Change PostgreSQL password on your database:${NC}"
echo -e "   ${CYAN}psql -h <HOST> -U postgres -c \"ALTER USER postgres WITH PASSWORD '${DB_PASSWORD}';\"${NC}"
echo
echo -e "${BLUE}3. Update DATABASE_URL in .env with new password:${NC}"
echo -e "   ${CYAN}DATABASE_URL=\"postgresql://postgres:${DB_PASSWORD}@<HOST>:5432/<DB>?schema=public\"${NC}"
echo
echo -e "${BLUE}4. If using AWS RDS, update via AWS Console:${NC}"
echo -e "   • RDS Console → Databases → Modify"
echo -e "   • Change master password"
echo -e "   • Apply immediately"
echo
echo -e "${BLUE}5. Restart all services:${NC}"
echo -e "   • Stop all running instances"
echo -e "   • Update environment variables"
echo -e "   • Start services with new credentials"
echo
echo -e "${BLUE}6. Test database connectivity:${NC}"
echo -e "   ${CYAN}npm run db:test${NC}"
echo
echo -e "${BLUE}7. Update CI/CD environment variables${NC}"
echo
echo -e "${BLUE}8. Update any deployment configurations${NC}"
echo

# Offer to save to a secure file
echo -e "${YELLOW}Would you like to save these credentials to a secure file? (y/N):${NC} "
read -r save_response

if [[ "$save_response" =~ ^[Yy]$ ]]; then
    CREDS_FILE="../secure-credentials-$(date +%Y%m%d_%H%M%S).txt"
    {
        echo "# Generated Credentials - $(date)"
        echo "# KEEP THIS FILE SECURE - DO NOT COMMIT TO GIT"
        echo ""
        echo "NEXTAUTH_SECRET=\"${NEXTAUTH_SECRET}\""
        echo "NEXTAUTH_PREVIEW_ID=\"${PREVIEW_ID}\""
        echo "NEXTAUTH_PREVIEW_SIGNING_KEY=\"${SIGNING_KEY}\""
        echo "NEXTAUTH_PREVIEW_ENCRYPTION_KEY=\"${ENCRYPTION_KEY}\""
        echo "DATABASE_PASSWORD=\"${DB_PASSWORD}\""
        echo "DB_PASSWORD=\"${DB_PASSWORD}\""
    } > "$CREDS_FILE"
    
    chmod 600 "$CREDS_FILE"
    echo -e "${GREEN}✅ Credentials saved to: ${CYAN}$CREDS_FILE${NC}"
    echo -e "${RED}⚠️  REMEMBER: Delete this file after updating your environments${NC}"
fi

echo
echo -e "${GREEN}✅ Credential generation complete!${NC}"
echo

