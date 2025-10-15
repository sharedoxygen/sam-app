#!/bin/bash

# =============================================================================
# GIT HISTORY SANITIZATION SCRIPT
# =============================================================================
# 
# WARNING: This script REWRITES Git history and will require force-push!
# 
# This script removes sensitive files (.env, .env.backup, .env.local) from
# Git history to prevent credential exposure.
#
# BEFORE RUNNING:
# 1. Backup your repository
# 2. Notify all team members  
# 3. Ensure all changes are committed
# 4. Have everyone backup their work
#
# AFTER RUNNING:
# 1. Force push to remote
# 2. All team members must re-clone the repository
# 3. Update CI/CD with new credentials
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
echo -e "${CYAN}║       GIT HISTORY SANITIZATION SCRIPT                 ║${NC}"
echo -e "${CYAN}║       REMOVES SENSITIVE FILES FROM HISTORY            ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo

# Check if git-filter-repo is installed
if ! command -v git-filter-repo &> /dev/null; then
    echo -e "${RED}❌ git-filter-repo is not installed${NC}"
    echo -e "${YELLOW}Install it with:${NC}"
    echo -e "  ${CYAN}brew install git-filter-repo${NC}  (macOS)"
    echo -e "  ${CYAN}pip install git-filter-repo${NC}  (Linux/Windows)"
    echo
    exit 1
fi

echo -e "${YELLOW}⚠️  WARNING: THIS WILL REWRITE GIT HISTORY!${NC}"
echo -e "${YELLOW}⚠️  This operation is IRREVERSIBLE${NC}"
echo
echo -e "${BLUE}Files to be removed from history:${NC}"
echo -e "  • .env"
echo -e "  • .env.local"
echo -e "  • .env.backup"
echo -e "  • .env.production"
echo -e "  • .env.development"
echo -e "  • .env.test"
echo
echo -e "${BLUE}Before proceeding, ensure:${NC}"
echo -e "  ✅ All team members have backed up their work"
echo -e "  ✅ All important changes are committed"
echo -e "  ✅ You have a backup of this repository"
echo -e "  ✅ Team members are ready to re-clone"
echo
echo -e "${RED}Type 'REWRITE HISTORY' to proceed:${NC} "
read -r confirmation

if [ "$confirmation" != "REWRITE HISTORY" ]; then
    echo -e "${YELLOW}❌ Operation cancelled${NC}"
    exit 0
fi

echo
echo -e "${BLUE}📦 Creating backup of current repository...${NC}"
BACKUP_DIR="../agent-sales-activity-manager-backup-$(date +%Y%m%d_%H%M%S)"
cp -r "$(pwd)" "$BACKUP_DIR"
echo -e "${GREEN}✅ Backup created at: $BACKUP_DIR${NC}"

echo
echo -e "${BLUE}🗑️  Removing .env files from Git history...${NC}"

# Create temporary file with files to remove
cat > /tmp/files-to-remove.txt << 'FILELIST'
.env
.env.local
.env.backup
.env.production
.env.development
.env.test
FILELIST

# Remove files from history
git filter-repo --invert-paths --paths-from-file /tmp/files-to-remove.txt --force

# Clean up temp file
rm /tmp/files-to-remove.txt

echo -e "${GREEN}✅ Files removed from Git history${NC}"

echo
echo -e "${BLUE}🧹 Cleaning up repository...${NC}"
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo -e "${GREEN}✅ Repository cleaned${NC}"

echo
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Git history sanitization complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo
echo -e "${YELLOW}⚠️  NEXT STEPS (CRITICAL):${NC}"
echo
echo -e "${BLUE}1. Review changes:${NC}"
echo -e "   git log --oneline | head -20"
echo
echo -e "${BLUE}2. Verify .env files are gone:${NC}"
echo -e "   git log --all --full-history -- .env"
echo
echo -e "${BLUE}3. Add new remotes (if needed):${NC}"
echo -e "   git remote add origin <YOUR_REPO_URL>"
echo
echo -e "${BLUE}4. Force push to remote:${NC}"
echo -e "   ${RED}git push --force --all origin${NC}"
echo -e "   ${RED}git push --force --tags origin${NC}"
echo
echo -e "${BLUE}5. Notify team members:${NC}"
echo -e "   • History has been rewritten"
echo -e "   • They must delete their local clones"
echo -e "   • They must clone the repository fresh"
echo
echo -e "${BLUE}6. Update CI/CD:${NC}"
echo -e "   • Update with new credentials"
echo -e "   • Force rebuild of all pipelines"
echo
echo -e "${BLUE}7. Rotate credentials:${NC}"
echo -e "   • Change database passwords"
echo -e "   • Generate new NEXTAUTH_SECRET"
echo -e "   • Update all environments"
echo
echo -e "${YELLOW}⚠️  Backup location: ${CYAN}$BACKUP_DIR${NC}"
echo

