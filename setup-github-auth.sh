#!/bin/bash

if [ -z "$1" ]; then
    echo "Please provide your GitHub Personal Access Token as an argument"
    echo "Usage: ./setup-github-auth-fixed.sh YOUR_GITHUB_TOKEN"
    exit 1
fi

GITHUB_TOKEN="$1"
JENKINS_URL="${JENKINS_URL:-http://localhost:9080}"
JENKINS_USER="${JENKINS_USER:-admin}"
JENKINS_PASS="${JENKINS_PASS:-changeme}"

echo "Setting up GitHub Authentication for Jenkins with CSRF protection..."

# Get Jenkins crumb for CSRF protection
echo "Getting Jenkins crumb token..."
CRUMB=$(curl -s -u $JENKINS_USER:$JENKINS_PASS "$JENKINS_URL/crumbIssuer/api/xml?xpath=concat(//crumbRequestField,\":\",//crumb)")

if [ -z "$CRUMB" ]; then
    echo "Error: Could not get Jenkins crumb token. Is Jenkins running?"
    exit 1
fi

echo "Crumb token obtained: $CRUMB"

# Create credentials XML
cat > github-pat-credentials.xml << EOF
<com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl>
  <scope>GLOBAL</scope>
  <id>github-pat</id>
  <description>GitHub Personal Access Token for CI/CD</description>
  <username>sharedoxygen</username>
  <password>$GITHUB_TOKEN</password>
</com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl>
EOF

echo "Adding GitHub credentials to Jenkins..."

# Add credentials to Jenkins with crumb
curl -s -X POST \
  -u $JENKINS_USER:$JENKINS_PASS \
  -H "$CRUMB" \
  -H "Content-Type: application/xml" \
  -d @github-pat-credentials.xml \
  "$JENKINS_URL/credentials/store/system/domain/_/createCredentials"

echo ""
echo "Credentials added! Now updating job configurations..."

# Function to update job configuration with credentials
update_job_config() {
    local job_name=$1
    local branch=$2
    
    echo "Updating $job_name configuration..."
    
    # Get fresh crumb for each request
    local FRESH_CRUMB=$(curl -s -u $JENKINS_USER:$JENKINS_PASS "$JENKINS_URL/crumbIssuer/api/xml?xpath=concat(//crumbRequestField,\":\",//crumb)")
    
    cat > ${job_name}-config.xml << EOF
<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job">
  <actions/>
  <description>Agent Activity Manager CI/CD Pipeline for $branch branch</description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
      <triggers>
        <hudson.triggers.SCMTrigger>
          <spec>H/5 * * * *</spec>
          <ignorePostCommitHooks>false</ignorePostCommitHooks>
        </hudson.triggers.SCMTrigger>
      </triggers>
    </org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition" plugin="workflow-cps">
    <scm class="hudson.plugins.git.GitSCM" plugin="git">
      <configVersion>2</configVersion>
      <userRemoteConfigs>
        <hudson.plugins.git.UserRemoteConfig>
          <url>https://github.com/sharedoxygen/asam-app.git</url>
          <credentialsId>github-pat</credentialsId>
        </hudson.plugins.git.UserRemoteConfig>
      </userRemoteConfigs>
      <branches>
        <hudson.plugins.git.BranchSpec>
          <name>*/$branch</name>
        </hudson.plugins.git.BranchSpec>
      </branches>
      <doGenerateSubmoduleConfigurations>false</doGenerateSubmoduleConfigurations>
      <submoduleCfg class="empty-list"/>
      <extensions/>
    </scm>
    <scriptPath>Jenkinsfile</scriptPath>
    <lightweight>true</lightweight>
  </definition>
  <triggers/>
  <disabled>false</disabled>
</flow-definition>
EOF

    # Update the job configuration with crumb
    curl -s -X POST \
      -u $JENKINS_USER:$JENKINS_PASS \
      -H "$FRESH_CRUMB" \
      -H "Content-Type: application/xml" \
      -d @${job_name}-config.xml \
      "$JENKINS_URL/job/$job_name/config.xml"
    
    echo "✅ $job_name updated"
}

# Update all job configurations
update_job_config "agent-activity-manager" "in-progress"
update_job_config "agent-activity-manager-development" "development"
update_job_config "agent-activity-manager-publish" "publish"
update_job_config "agent-activity-manager-main" "main"

echo ""
echo "🎉 GitHub authentication setup complete!"
echo ""
echo "Testing the setup by triggering a build..."

# Get fresh crumb for build trigger
BUILD_CRUMB=$(curl -s -u $JENKINS_USER:$JENKINS_PASS "$JENKINS_URL/crumbIssuer/api/xml?xpath=concat(//crumbRequestField,\":\",//crumb)")

# Trigger a new build
curl -s -X POST \
  -u $JENKINS_USER:$JENKINS_PASS \
  -H "$BUILD_CRUMB" \
  "$JENKINS_URL/job/agent-activity-manager/build"

echo ""
echo "✅ Build triggered!"
echo ""
echo "Check build status:"
echo "1. Jenkins UI: $JENKINS_URL"
echo "2. Job page: $JENKINS_URL/job/agent-activity-manager/"
echo ""
echo "Cleaning up temporary files..."
rm -f github-pat-credentials.xml *-config.xml

echo "Done! 🚀" 