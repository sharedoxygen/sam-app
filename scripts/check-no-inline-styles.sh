#!/bin/bash

# Check for inline styles in the codebase
# Can be used as a pre-commit hook or CI check

echo "🔍 Checking for inline styles..."

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check for style jsx
STYLE_JSX_COUNT=$(grep -r "<style jsx>" src/ --include="*.tsx" --include="*.jsx" 2>/dev/null | wc -l | tr -d ' ')

# Check for inline style attributes
INLINE_STYLE_COUNT=$(grep -r "style={{" src/ --include="*.tsx" --include="*.jsx" 2>/dev/null | wc -l | tr -d ' ')

# Check for styled-jsx imports
STYLED_JSX_IMPORTS=$(grep -r "from 'styled-jsx" src/ --include="*.tsx" --include="*.jsx" 2>/dev/null | wc -l | tr -d ' ')

TOTAL_VIOLATIONS=$((STYLE_JSX_COUNT + INLINE_STYLE_COUNT + STYLED_JSX_IMPORTS))

if [ $TOTAL_VIOLATIONS -gt 0 ]; then
    echo -e "${RED}❌ Found inline style violations!${NC}"
    echo ""
    
    if [ $STYLE_JSX_COUNT -gt 0 ]; then
        echo -e "${YELLOW}Found $STYLE_JSX_COUNT files with <style jsx> blocks:${NC}"
        grep -l "<style jsx>" src/**/*.tsx src/**/*.jsx 2>/dev/null | head -10
        if [ $STYLE_JSX_COUNT -gt 10 ]; then
            echo "... and $((STYLE_JSX_COUNT - 10)) more"
        fi
        echo ""
    fi
    
    if [ $INLINE_STYLE_COUNT -gt 0 ]; then
        echo -e "${YELLOW}Found $INLINE_STYLE_COUNT inline style={{ }} attributes:${NC}"
        grep -n "style={{" src/**/*.tsx src/**/*.jsx 2>/dev/null | head -5
        if [ $INLINE_STYLE_COUNT -gt 5 ]; then
            echo "... and $((INLINE_STYLE_COUNT - 5)) more"
        fi
        echo ""
    fi
    
    if [ $STYLED_JSX_IMPORTS -gt 0 ]; then
        echo -e "${YELLOW}Found $STYLED_JSX_IMPORTS styled-jsx imports${NC}"
        echo ""
    fi
    
    echo -e "${RED}Please convert all inline styles to CSS modules!${NC}"
    echo "See PROJECT_STANDARDS.md for guidelines"
    exit 1
else
    echo -e "${GREEN}✅ No inline styles found! All styles use CSS modules.${NC}"
    exit 0
fi 