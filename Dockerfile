FROM jenkins/jenkins:lts

# Switch to root to install Node.js
USER root

# Install Node.js 18 and npm
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Verify Node.js installation
RUN node --version && npm --version

# Install global npm packages that might be useful for builds
RUN npm install -g yarn

# Switch back to jenkins user
USER jenkins

# Install essential plugins first
RUN jenkins-plugin-cli --plugins \
    "git" \
    "workflow-aggregator" \
    "credentials-binding" \
    "github" \
    "github-branch-source"

# Install Blue Ocean separately with dependency resolution
RUN jenkins-plugin-cli --plugins "blueocean" || echo "Blue Ocean installation attempted"

# Skip the setup wizard
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false" 