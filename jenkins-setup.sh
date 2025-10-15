#!/bin/bash

# Jenkins Setup Script for Agent Activity Manager
# This script creates Jenkins jobs for all branches

set -e

JENKINS_URL="${JENKINS_URL:-http://localhost:9080}"
JENKINS_CLI_JAR="jenkins-cli.jar"
REPO_URL="https://github.com/sharedoxygen/asam-app.git"
JOB_NAME_PREFIX="agent-activity-manager"
JENKINS_USER="${JENKINS_USER:-admin}"
JENKINS_PASSWORD="${JENKINS_PASSWORD:-changeme}"

echo "Setting up Jenkins CI/CD for Agent Activity Manager..."

# Download Jenkins CLI if it doesn't exist
if [[ ! -f "$JENKINS_CLI_JAR" ]]; then
    echo "Downloading Jenkins CLI..."
    curl -o $JENKINS_CLI_JAR $JENKINS_URL/jnlpJars/jenkins-cli.jar
fi

# Function to create a multibranch pipeline job
create_multibranch_job() {
    local job_name="$1"
    local config_xml="$2"
    
    echo "Creating job: $job_name"
    
    # Create the job using Jenkins CLI with authentication
    java -jar $JENKINS_CLI_JAR -s $JENKINS_URL -auth $JENKINS_USER:$JENKINS_PASSWORD create-job "$job_name" < "$config_xml" || {
        echo "Job $job_name might already exist, updating..."
        java -jar $JENKINS_CLI_JAR -s $JENKINS_URL -auth $JENKINS_USER:$JENKINS_PASSWORD update-job "$job_name" < "$config_xml"
    }
}

# Create multibranch pipeline configuration XML
cat > multibranch-config.xml << 'EOF'
<?xml version='1.1' encoding='UTF-8'?>
<org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject plugin="workflow-multibranch">
  <actions/>
  <description>Agent Activity Manager - Multibranch Pipeline for all branches</description>
  <properties>
    <org.jenkinsci.plugins.pipeline.modeldefinition.config.FolderConfig plugin="pipeline-model-definition">
      <dockerLabel></dockerLabel>
      <registry plugin="docker-commons"/>
    </org.jenkinsci.plugins.pipeline.modeldefinition.config.FolderConfig>
  </properties>
  <folderViews class="jenkins.branch.MultiBranchProjectViewHolder" plugin="branch-api">
    <owner class="org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject" reference="../.."/>
  </folderViews>
  <healthMetrics>
    <com.cloudbees.hudson.plugins.folder.health.WorstChildHealthMetric plugin="cloudbees-folder">
      <nonRecursive>false</nonRecursive>
    </com.cloudbees.hudson.plugins.folder.health.WorstChildHealthMetric>
  </healthMetrics>
  <icon class="jenkins.branch.MetadataActionFolderIcon" plugin="branch-api">
    <owner class="org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject" reference="../.."/>
  </icon>
  <orphanedItemStrategy class="com.cloudbees.hudson.plugins.folder.computed.DefaultOrphanedItemStrategy" plugin="cloudbees-folder">
    <pruneDeadBranches>true</pruneDeadBranches>
    <daysToKeep>-1</daysToKeep>
    <numToKeep>-1</numToKeep>
    <abortBuilds>false</abortBuilds>
  </orphanedItemStrategy>
  <triggers>
    <com.cloudbees.hudson.plugins.folder.computed.PeriodicFolderTrigger plugin="cloudbees-folder">
      <spec>H/5 * * * *</spec>
      <interval>300000</interval>
    </com.cloudbees.hudson.plugins.folder.computed.PeriodicFolderTrigger>
  </triggers>
  <disabled>false</disabled>
  <sources class="jenkins.branch.BranchSource" plugin="branch-api">
    <source class="org.jenkinsci.plugins.github_branch_source.GitHubSCMSource" plugin="github-branch-source">
      <id>github-source</id>
      <apiUri>https://api.github.com</apiUri>
      <repoOwner>sharedoxygen</repoOwner>
      <repository>agent-activity-manager</repository>
      <traits>
        <org.jenkinsci.plugins.github_branch_source.BranchDiscoveryTrait>
          <strategyId>1</strategyId>
        </org.jenkinsci.plugins.github_branch_source.BranchDiscoveryTrait>
        <org.jenkinsci.plugins.github_branch_source.OriginPullRequestDiscoveryTrait>
          <strategyId>1</strategyId>
        </org.jenkinsci.plugins.github_branch_source.OriginPullRequestDiscoveryTrait>
        <org.jenkinsci.plugins.github_branch_source.ForkPullRequestDiscoveryTrait>
          <strategyId>1</strategyId>
          <trust class="org.jenkinsci.plugins.github_branch_source.ForkPullRequestDiscoveryTrait$TrustPermission"/>
        </org.jenkinsci.plugins.github_branch_source.ForkPullRequestDiscoveryTrait>
      </traits>
    </source>
    <strategy class="jenkins.branch.DefaultBranchPropertyStrategy" plugin="branch-api">
      <properties class="empty-list"/>
    </strategy>
  </sources>
  <factory class="org.jenkinsci.plugins.workflow.multibranch.WorkflowBranchProjectFactory" plugin="workflow-multibranch">
    <owner class="org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject" reference="../.."/>
    <scriptPath>Jenkinsfile</scriptPath>
  </factory>
</org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject>
EOF

# Create the multibranch pipeline job
create_multibranch_job "$JOB_NAME_PREFIX" "multibranch-config.xml"

echo "Creating individual branch jobs for specific workflows..."

# Function to create individual pipeline jobs
create_pipeline_job() {
    local job_name="$1"
    local branch="$2"
    local description="$3"
    
    cat > "${job_name}-config.xml" << EOF
<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job">
  <actions/>
  <description>$description</description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
      <triggers>
        <com.cloudbees.hudson.plugins.folder.computed.PeriodicFolderTrigger plugin="cloudbees-folder">
          <spec>H/5 * * * *</spec>
          <interval>300000</interval>
        </com.cloudbees.hudson.plugins.folder.computed.PeriodicFolderTrigger>
      </triggers>
    </org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition" plugin="workflow-cps">
    <scm class="hudson.plugins.git.GitSCM" plugin="git">
      <configVersion>2</configVersion>
      <userRemoteConfigs>
        <hudson.plugins.git.UserRemoteConfig>
          <url>$REPO_URL</url>
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

    create_multibranch_job "$job_name" "${job_name}-config.xml"
    rm "${job_name}-config.xml"
}

# Create individual jobs for each branch
create_pipeline_job "${JOB_NAME_PREFIX}-main" "main" "Production deployment pipeline (Golden Copy)"
create_pipeline_job "${JOB_NAME_PREFIX}-development" "development" "Development environment pipeline (Integration Testing)"
create_pipeline_job "${JOB_NAME_PREFIX}-publish" "publish" "Staging environment pipeline (Current Revision)"
create_pipeline_job "${JOB_NAME_PREFIX}-in-progress" "in-progress" "In-progress development pipeline (Build & Test)"

echo "Setting up webhook for automatic triggering..."

# Instructions for webhook setup
cat << EOF

=================================================================
Jenkins CI/CD Setup Complete!
=================================================================

Jobs Created:
1. $JOB_NAME_PREFIX (Multibranch Pipeline)
2. $JOB_NAME_PREFIX-main (Production - Golden Copy)
3. $JOB_NAME_PREFIX-development (Development - Integration Testing)
4. $JOB_NAME_PREFIX-publish (Staging - Current Revision)
5. $JOB_NAME_PREFIX-in-progress (In-Progress - Build & Test)

Promotion Strategy:
in-progress → development → publish → main

Next Steps:
1. Go to Jenkins: $JENKINS_URL
2. Install required plugins if not already installed:
   - GitHub Branch Source Plugin
   - Pipeline Plugin
   - Docker Plugin
   - HTML Publisher Plugin

3. Set up GitHub Webhook:
   - Go to your GitHub repo: https://github.com/sharedoxygen/agent-activity-manager
   - Settings > Webhooks > Add webhook
   - Payload URL: $JENKINS_URL/github-webhook/
   - Content type: application/json
   - Events: Push events, Pull requests

4. Configure Jenkins credentials if needed:
   - GitHub Personal Access Token
   - Docker registry credentials (if using external registry)

Environment URLs after deployment:
- Development: http://localhost:3001 (Integration Testing)
- Staging: http://localhost:3002 (Current Revision)
- Production: http://localhost:3000 (Golden Copy)

=================================================================
EOF

# Cleanup
rm multibranch-config.xml
rm $JENKINS_CLI_JAR

echo "Setup completed successfully!" 