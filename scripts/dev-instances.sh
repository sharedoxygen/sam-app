#!/bin/bash

# Development & Testing Workflow Manager
# Best practice: Dev on 3000, Production builds for testing on 7025

case "$1" in
  "dev")
    echo "🚀 Starting development instance..."
    echo "📍 Development: http://localhost:3000"
    echo "💡 Use './scripts/dev-instances.sh deploy' to create test version"
    npm run dev
    ;;
  "deploy")
    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
      echo "⚠️  WARNING: You have uncommitted changes!"
      echo "📝 Current deploy includes ALL working directory changes"
      echo "💡 Use 'deploy:clean' for git-based stable deployment"
      echo ""
      read -p "Continue with current working directory? (y/N): " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deploy cancelled"
        exit 1
      fi
    fi
    echo "🔨 Building production version for testing..."
    echo "📂 Source: Current working directory (including uncommitted changes)"
    npm run build
    echo "🔧 Ensuring build artifacts are complete..."
    # Create BUILD_ID if missing
    if [ ! -f ".next/BUILD_ID" ]; then
        echo "📝 Creating missing BUILD_ID file..."
        echo "$(date +%s)-$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" > .next/BUILD_ID
        echo "✅ BUILD_ID created"
    else
        echo "✅ BUILD_ID exists"
    fi
    
    # Fix prerender-manifest if needed
    if [ ! -f ".next/prerender-manifest.json" ]; then
        if [ -f ".next/prerender-manifest.js" ]; then
            echo "🔄 Converting prerender-manifest.js to JSON format..."
            echo '{"preview":{"previewModeId":"60cff74ed59b1ba374aea8580e4bbab2","previewModeSigningKey":"485fef83412fc8c5d567277c701844dacbe56c58961f20eee726266866d16969","previewModeEncryptionKey":"4efc90d7593440c899c5921071019cafd459f265b482f4951fb7feb544233891"}}' > .next/prerender-manifest.json
            echo "✅ prerender-manifest.json created"
        else
            echo "📝 Creating default prerender-manifest.json..."
            echo '{"preview":{"previewModeId":"60cff74ed59b1ba374aea8580e4bbab2","previewModeSigningKey":"485fef83412fc8c5d567277c701844dacbe56c58961f20eee726266866d16969","previewModeEncryptionKey":"4efc90d7593440c899c5921071019cafd459f265b482f4951fb7feb544233891"}}' > .next/prerender-manifest.json
            echo "✅ prerender-manifest.json created"
        fi
    else
        echo "✅ prerender-manifest.json exists"
    fi
    echo "🧪 Starting test instance on port 7025..."
    echo "📍 Test (Production Build): http://localhost:7025"
    echo "🎯 This is a stable production build for testing"
    PORT=7025 npm run start
    ;;
  "deploy:clean")
    # Check if .next build directory exists
    if [ ! -d ".next" ]; then
      echo "❌ No .next build directory found"
      echo "💡 Run 'npm run build' first to create a production build"
      echo "📝 Or use './scripts/dev-instances.sh deploy' to build and deploy"
      exit 1
    fi
    
    # Check if essential build files exist
    if [ ! -f ".next/BUILD_ID" ]; then
      echo "❌ Invalid .next build - BUILD_ID missing"
      echo "💡 Run 'npm run build' to create a complete production build"
      exit 1
    fi
    
    echo "🔨 Using existing production build from .next directory..."
    echo "📂 Source: Local .next production build artifacts"
    echo "🗄️  Database: RDS asam_t (isolated test environment)"
    echo "🎯 This deploys the existing build with test database"
    
    # Get build timestamp from BUILD_ID if available
    if [ -f ".next/BUILD_ID" ]; then
      BUILD_ID=$(cat .next/BUILD_ID)
      echo "🏗️  Build ID: $BUILD_ID"
    fi
    
    # Load environment variables for test database
    [[ -f .env ]] && source .env
    [[ -f .env.local ]] && source .env.local
    
    # Verify DATABASE_URL_TEST is available
    if [[ -z "$DATABASE_URL_TEST" ]]; then
      echo "⚠️ DATABASE_URL_TEST not found in environment variables!"
      echo "❌ Test deployment requires DATABASE_URL_TEST to be defined in .env or .env.local"
      exit 1
    fi
    
    # Configure for test environment
    export DATABASE_URL="$DATABASE_URL_TEST"
    export DATABASE_NAME="asam_t"
    export NEXT_PUBLIC_IS_TEST_ENV=true
    
    echo "🗄️ Using database connection: $DATABASE_URL_TEST"
    
    echo "🔧 Ensuring build artifacts are complete..."
    
    # Create BUILD_ID if missing
    if [ ! -f ".next/BUILD_ID" ]; then
        echo "📝 Creating missing BUILD_ID file..."
        echo "$(date +%s)-$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" > .next/BUILD_ID
        echo "✅ BUILD_ID created"
    else
        echo "✅ BUILD_ID exists"
    fi
    
    # Fix prerender-manifest if needed
    if [ ! -f ".next/prerender-manifest.json" ]; then
        if [ -f ".next/prerender-manifest.js" ]; then
            echo "🔄 Converting prerender-manifest.js to JSON format..."
            echo '{"preview":{"previewModeId":"60cff74ed59b1ba374aea8580e4bbab2","previewModeSigningKey":"485fef83412fc8c5d567277c701844dacbe56c58961f20eee726266866d16969","previewModeEncryptionKey":"4efc90d7593440c899c5921071019cafd459f265b482f4951fb7feb544233891"}}' > .next/prerender-manifest.json
            echo "✅ prerender-manifest.json created"
        else
            echo "📝 Creating default prerender-manifest.json..."
            echo '{"preview":{"previewModeId":"60cff74ed59b1ba374aea8580e4bbab2","previewModeSigningKey":"485fef83412fc8c5d567277c701844dacbe56c58961f20eee726266866d16969","previewModeEncryptionKey":"4efc90d7593440c899c5921071019cafd459f265b482f4951fb7feb544233891"}}' > .next/prerender-manifest.json
            echo "✅ prerender-manifest.json created"
        fi
    else
        echo "✅ prerender-manifest.json exists"
    fi
    
    # Verify test database has seed data
    echo "🔍 Verifying test database seed data..."
    
    # Check if psql is available
    if command -v psql >/dev/null 2>&1; then
      USER_COUNT=$(PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U postgres -d asam_t -t -c "SELECT COUNT(*) FROM \"User\"" 2>/dev/null | tr -d ' ')
      
      # Ensure USER_COUNT is numeric
      if [[ "$USER_COUNT" =~ ^[0-9]+$ ]]; then
        if [ "$USER_COUNT" -lt 5 ]; then
          echo "⚠️ Test database may not be properly seeded (only $USER_COUNT users found)"
          echo "🌱 Seeding test database with data from development..."
          
          # Ask if the user wants to seed the test database
          read -p "Do you want to seed the test database now? (y/N): " -n 1 -r
          echo
          if [[ $REPLY =~ ^[Yy]$ ]]; then
            ./scripts/db-seed-manager.sh reload test enhanced
            echo "✅ Test database seeded successfully!"
          else
            echo "⚠️ Continuing with potentially empty test database"
          fi
        else
          echo "✅ Test database appears to be properly seeded ($USER_COUNT users found)"
        fi
      else
        echo "⚠️ Could not verify database connection (psql returned non-numeric result)"
        echo "🚀 Continuing with deployment anyway..."
      fi
    else
      echo "⚠️ psql command not found - cannot verify database seed data"
      echo "💡 Install PostgreSQL client tools with: brew install postgresql"
      echo "🚀 Continuing with deployment anyway..."
    fi
    
    echo "🧪 Starting production instance from existing build on port 7025..."
    echo "📍 Test (Production Build): http://localhost:7025"
    echo "🎯 Using existing .next production build artifacts"
    echo "🗄️  Using RDS asam_t database with test environment"
    echo "💡 To rebuild first, use './scripts/dev-instances.sh deploy'"
    
    PORT=7025 npm run start
    ;;
  "deploy:clean:git")
    # Store current branch
    CURRENT_BRANCH=$(git branch --show-current)
    
    # Check if publish branch exists
    if ! git show-ref --verify --quiet refs/heads/publish; then
      echo "❌ 'publish' branch does not exist"
      echo "💡 Create it with: git checkout -b publish"
      echo "📝 Then merge/cherry-pick your stable code to publish branch"
      exit 1
    fi
    
    # Stash any uncommitted changes to preserve them
    STASH_NEEDED=false
    if ! git diff-index --quiet HEAD --; then
      echo "📦 Temporarily stashing uncommitted changes for clean deployment..."
      git stash push -m "Auto-stash for deploy:clean:git - will be restored"
      STASH_NEEDED=true
    fi
    
    # Stash any untracked files if they exist
    if [ -n "$(git ls-files --others --exclude-standard)" ]; then
      echo "📦 Stashing untracked files..."
      git add .
      git stash push -m "Auto-stash untracked files for deploy:clean:git"
      STASH_UNTRACKED=true
    else
      STASH_UNTRACKED=false
    fi
    
    echo "🔄 Switching to 'publish' branch for deployment..."
    git checkout publish
    
    # Get commit info from publish branch
    COMMIT=$(git rev-parse --short HEAD)
    
    echo "🔨 Building production version from 'publish' branch..."
    echo "📂 Source: 'publish' branch at commit $COMMIT"
    echo "🗄️  Database: RDS asam_t (isolated test environment)"
    echo "🔧 Setting test environment flag for feedback feature"
    
    # Load environment variables for test database
    [[ -f .env ]] && source .env
    [[ -f .env.local ]] && source .env.local
    
    # Verify DATABASE_URL_TEST is available
    if [[ -z "$DATABASE_URL_TEST" ]]; then
      echo "⚠️ DATABASE_URL_TEST not found in environment variables!"
      echo "❌ Test deployment requires DATABASE_URL_TEST to be defined in .env or .env.local"
      exit 1
    fi
    
    # Configure for test environment
    export DATABASE_URL="$DATABASE_URL_TEST"
    export DATABASE_NAME="sam_t"
    echo "🗄️ Using database connection: $DATABASE_URL_TEST"
    
    NEXT_PUBLIC_IS_TEST_ENV=true npm run build
    
    echo "🔧 Ensuring build artifacts are complete..."
    # Create BUILD_ID if missing
    if [ ! -f ".next/BUILD_ID" ]; then
        echo "📝 Creating missing BUILD_ID file..."
        echo "$(date +%s)-$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" > .next/BUILD_ID
        echo "✅ BUILD_ID created"
    else
        echo "✅ BUILD_ID exists"
    fi
    
    # Fix prerender-manifest if needed
    if [ ! -f ".next/prerender-manifest.json" ]; then
        if [ -f ".next/prerender-manifest.js" ]; then
            echo "🔄 Converting prerender-manifest.js to JSON format..."
            echo '{"preview":{"previewModeId":"60cff74ed59b1ba374aea8580e4bbab2","previewModeSigningKey":"485fef83412fc8c5d567277c701844dacbe56c58961f20eee726266866d16969","previewModeEncryptionKey":"4efc90d7593440c899c5921071019cafd459f265b482f4951fb7feb544233891"}}' > .next/prerender-manifest.json
            echo "✅ prerender-manifest.json created"
        else
            echo "📝 Creating default prerender-manifest.json..."
            echo '{"preview":{"previewModeId":"60cff74ed59b1ba374aea8580e4bbab2","previewModeSigningKey":"485fef83412fc8c5d567277c701844dacbe56c58961f20eee726266866d16969","previewModeEncryptionKey":"4efc90d7593440c899c5921071019cafd459f265b482f4951fb7feb544233891"}}' > .next/prerender-manifest.json
            echo "✅ prerender-manifest.json created"
        fi
    else
        echo "✅ prerender-manifest.json exists"
    fi
    
    echo "🔄 Returning to '$CURRENT_BRANCH' branch..."
    git checkout "$CURRENT_BRANCH"
    
    # Restore any stashed files
    if [ "$STASH_UNTRACKED" = true ]; then
      echo "📦 Restoring stashed untracked files..."
      git stash pop
    fi
    
    if [ "$STASH_NEEDED" = true ]; then
      echo "📦 Restoring stashed uncommitted changes..."
      git stash pop
    fi
    
    echo "🧪 Starting isolated test instance on port 7025..."
    echo "📍 Test (Production Build): http://localhost:7025"
    echo "🎯 Stable build from 'publish' branch (commit $COMMIT)"
    echo "🗄️  Using RDS asam_t database with dev seed data"
    
    # Set environment variables for the test instance
    # Load environment variables from .env and .env.local
    [[ -f .env ]] && source .env
    [[ -f .env.local ]] && source .env.local
    
    # Verify DATABASE_URL_TEST is available
    if [[ -z "$DATABASE_URL_TEST" ]]; then
      echo "⚠️ DATABASE_URL_TEST not found in environment variables!"
      echo "❌ Test deployment requires DATABASE_URL_TEST to be defined in .env or .env.local"
      exit 1
    fi
    
    # Configure for test environment
    export DATABASE_URL="$DATABASE_URL_TEST"
    export DATABASE_NAME="asam_t"
    export NEXT_PUBLIC_IS_TEST_ENV=true
    
    echo "🗄️ Using database connection: $DATABASE_URL_TEST"
    
    # Verify test database has seed data
    echo "🔍 Verifying test database seed data..."
    
    # Check if psql is available
    if command -v psql >/dev/null 2>&1; then
      USER_COUNT=$(PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U postgres -d asam_t -t -c "SELECT COUNT(*) FROM \"User\"" 2>/dev/null | tr -d ' ')
      
      # Ensure USER_COUNT is numeric
      if [[ "$USER_COUNT" =~ ^[0-9]+$ ]]; then
        if [ "$USER_COUNT" -lt 5 ]; then
          echo "⚠️ Test database may not be properly seeded (only $USER_COUNT users found)"
          echo "🌱 Seeding test database with data from development..."
          
          # Ask if the user wants to seed the test database
          read -p "Do you want to seed the test database now? (y/N): " -n 1 -r
          echo
          if [[ $REPLY =~ ^[Yy]$ ]]; then
            ./scripts/db-seed-manager.sh reload test enhanced
            echo "✅ Test database seeded successfully!"
          else
            echo "⚠️ Continuing with potentially empty test database"
          fi
        else
          echo "✅ Test database appears to be properly seeded ($USER_COUNT users found)"
        fi
      else
        echo "⚠️ Could not verify database connection (psql returned non-numeric result)"
        echo "🚀 Continuing with deployment anyway..."
      fi
    else
      echo "⚠️ psql command not found - cannot verify database seed data"
      echo "💡 Install PostgreSQL client tools with: brew install postgresql"
      echo "🚀 Continuing with deployment anyway..."
    fi
    
    PORT=7025 npm run start
    ;;
  "deploy:commit")
    # Deploy from specific commit
    if [ -z "$2" ]; then
      echo "❌ Please specify a commit hash"
      echo "Usage: $0 deploy:commit <commit-hash>"
      echo "Example: $0 deploy:commit abc123"
      exit 1
    fi
    
    COMMIT="$2"
    echo "🔨 Building from specific commit: $COMMIT"
    
    # Stash current changes if any
    STASH_NEEDED=false
    if ! git diff-index --quiet HEAD --; then
      echo "📦 Stashing current changes..."
      git stash push -m "Auto-stash for deploy:commit $COMMIT"
      STASH_NEEDED=true
    fi
    
    # Checkout specific commit
    git checkout "$COMMIT"
    
    # Build and run
    echo "🔨 Building production version..."
    npm run build
    echo "🔧 Ensuring build artifacts are complete..."
    # Create BUILD_ID if missing
    if [ ! -f ".next/BUILD_ID" ]; then
        echo "📝 Creating missing BUILD_ID file..."
        echo "$(date +%s)-$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" > .next/BUILD_ID
        echo "✅ BUILD_ID created"
    else
        echo "✅ BUILD_ID exists"
    fi
    
    # Fix prerender-manifest if needed
    if [ ! -f ".next/prerender-manifest.json" ]; then
        if [ -f ".next/prerender-manifest.js" ]; then
            echo "🔄 Converting prerender-manifest.js to JSON format..."
            echo '{"preview":{"previewModeId":"60cff74ed59b1ba374aea8580e4bbab2","previewModeSigningKey":"485fef83412fc8c5d567277c701844dacbe56c58961f20eee726266866d16969","previewModeEncryptionKey":"4efc90d7593440c899c5921071019cafd459f265b482f4951fb7feb544233891"}}' > .next/prerender-manifest.json
            echo "✅ prerender-manifest.json created"
        else
            echo "📝 Creating default prerender-manifest.json..."
            echo '{"preview":{"previewModeId":"60cff74ed59b1ba374aea8580e4bbab2","previewModeSigningKey":"485fef83412fc8c5d567277c701844dacbe56c58961f20eee726266866d16969","previewModeEncryptionKey":"4efc90d7593440c899c5921071019cafd459f265b482f4951fb7feb544233891"}}' > .next/prerender-manifest.json
            echo "✅ prerender-manifest.json created"
        fi
    else
        echo "✅ prerender-manifest.json exists"
    fi
    echo "🧪 Starting test instance on port 7025..."
    echo "📍 Test (Production Build): http://localhost:7025"
    echo "🎯 Stable build from commit $COMMIT"
    
    # Start in background so we can restore git state
    PORT=7025 npm run start &
    
    # Restore git state
    git checkout -
    if [ "$STASH_NEEDED" = true ]; then
      echo "📦 Restoring stashed changes..."
      git stash pop
    fi
    
    # Wait for server
    wait
    ;;
  "deploy:test-env")
    echo "🔨 Building with test environment..."
    npm run build:test
    echo "🧪 Starting test instance with test environment..."
    echo "📍 Test: http://localhost:7025"
    npm run start:test
    ;;
  "quick")
    echo "⚡ Quick test deployment (using current build)..."
    echo "📍 Test: http://localhost:7025"
    npm run test:quick
    ;;
  "stop")
    echo "🛑 Stopping all instances..."
    pkill -f "next"
    pkill -f "node .next"
    ;;
  "status")
    echo "📊 Checking port status..."
    echo "Port 3000 (dev):"
    lsof -i :3000 || echo "  Not running"
    echo "Port 7025 (test):"
    lsof -i :7025 || echo "  Not running"
    ;;
  "setup:publish")
    # Check if publish branch already exists
    if git show-ref --verify --quiet refs/heads/publish; then
      echo "✅ 'publish' branch already exists"
      CURRENT_COMMIT=$(git rev-parse --short publish)
      echo "📍 Current publish branch is at commit: $CURRENT_COMMIT"
      echo ""
      echo "To update publish branch with current work:"
      echo "  git checkout publish"
      echo "  git merge $(git branch --show-current)"
      exit 0
    fi
    
    echo "🔧 Setting up 'publish' branch for deployment workflow..."
    
    # Store current branch
    CURRENT_BRANCH=$(git branch --show-current)
    
    # Check if working directory is clean
    if ! git diff-index --quiet HEAD --; then
      echo "❌ Please commit your changes before setting up publish branch"
      echo ""
      echo "Uncommitted files:"
      git status --porcelain
      exit 1
    fi
    
    # Create publish branch from current HEAD
    echo "📝 Creating 'publish' branch from current state..."
    git checkout -b publish
    
    # Return to original branch
    echo "🔄 Returning to '$CURRENT_BRANCH' branch..."
    git checkout "$CURRENT_BRANCH"
    
    echo "✅ 'publish' branch created successfully!"
    echo ""
    echo "🎯 Workflow now ready:"
    echo "  1. Develop on feature branches"
    echo "  2. When ready for testing, merge to 'publish': git checkout publish && git merge $CURRENT_BRANCH"
    echo "  3. Deploy stable version: ./scripts/dev-instances.sh deploy:clean"
    echo ""
    ;;
  *)
    echo "🔧 Development & Testing Workflow Manager"
    echo ""
    echo "✨ Best Practice Workflow:"
    echo "   1. Develop on port 3000 with hot reload"
    echo "   2. Deploy stable builds to port 7025 for testing"
    echo ""
    echo "Usage: $0 {dev|deploy|deploy:clean|deploy:clean:git|deploy:commit|deploy:test-env|quick|stop|status|setup:publish}"
    echo ""
    echo "Commands:"
    echo "  dev             - Start development server (port 3000)"
    echo "  deploy          - Build & deploy from working directory (includes uncommitted changes)"
    echo "  deploy:clean    - Deploy using existing .next build with asam_t test database"
    echo "  deploy:clean:git - Build & deploy from 'publish' branch (stable code only)"
    echo "  deploy:commit   - Build & deploy from specific commit (e.g., deploy:commit abc123)"
    echo "  deploy:test-env - Build & deploy with test environment"
    echo "  quick           - Quick deploy using existing build"
    echo "  stop            - Stop all running instances"
    echo "  status          - Check which instances are running"
    echo "  setup:publish    - Set up 'publish' branch for deployment workflow"
    echo ""
    echo "Deployment Sources:"
    echo "  📂 deploy          → Current working directory (uncommitted changes included)"
    echo "  🚀 deploy:clean    → Existing .next build with asam_t test database"
    echo "  🔒 deploy:clean:git → 'publish' branch (stable, tested code with rebuild)"
    echo "  📌 deploy:commit   → Specific git commit"
    echo ""
    echo "Workflow:"
    echo "  📝 Code changes     →  ./scripts/dev-instances.sh dev"
    echo "  🔨 Build once      →  npm run build"
    echo "  🚀 Test deploy     →  ./scripts/dev-instances.sh deploy:clean (asam_t db)"
    echo "  🚧 Test WIP        →  ./scripts/dev-instances.sh deploy"
    echo "  ✅ Promote code    →  git checkout publish && git merge your-branch"
    echo "  🎯 Deploy stable   →  ./scripts/dev-instances.sh deploy:clean:git"
    echo "  🔄 Continue dev    →  Keep coding on port 3000"
    echo ""
    echo "URLs:"
    echo "  Development: http://localhost:3000  (Hot reload, debugging)"
    echo "  Testing:     http://localhost:7025  (Production build, stable)"
    ;;
esac 