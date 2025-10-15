# 🚀 Sales Activity Manager - CI/CD Dashboard

**Professional Jenkins CI/CD Dashboard with Enhanced Error Analysis**

[![Jenkins](https://img.shields.io/badge/Jenkins-Ready-brightgreen)](http://localhost:9080)
[![Node.js](https://img.shields.io/badge/Node.js-18+-blue)](https://nodejs.org/)
[![Dashboard](https://img.shields.io/badge/Dashboard-Online-success)](http://localhost:7005)

## 🌟 **Recent Optimizations (2025-06-06)**

✅ **Fixed TypeScript/Prisma Type Error** - Resolved build failures caused by PrismaClient type inference issues  
✅ **Enhanced Build Pipeline** - Added Prisma-aware error handling and diagnostics  
✅ **Improved Error Analysis** - Real-time build log analysis with actionable suggestions  
✅ **Better Authentication** - Confirmed `admin:admin` credentials throughout infrastructure  
✅ **Advanced Diagnostics** - Automatic error categorization and fix suggestions  

---

## 🏗️ **Build Infrastructure Overview**

### **Current Branch Structure**
- **`in-progress`** → Active development → Auto-promotes to `development`
- **`development`** → Integration testing → Manual promote to `publish`  
- **`publish`** → Staging environment → Manual promote to `main`
- **`main`** → Production deployment

### **Port Allocation**
- **Production (main)**: `localhost:3000`
- **Staging (publish)**: `localhost:3002`
- **Testing (development)**: `localhost:3001`
- **Jenkins**: `localhost:9080`
- **CI Dashboard**: `localhost:7005`

---

## 🚀 **Quick Start**

### **1. Start the Dashboard**
```bash
cd ci-dashboard
./start.sh
```

### **2. Access the Dashboard**
Open [http://localhost:7005](http://localhost:7005) in your browser

### **3. Trigger Builds**
```bash
# From project root
./trigger-builds.sh status          # View current status with diagnostics
./trigger-builds.sh main            # Trigger main branch build
./trigger-builds.sh development     # Trigger development build
./trigger-builds.sh all             # Trigger all builds sequentially
```

---

## 🔧 **Key Features**

### **Enhanced Error Analysis** 🔍
The dashboard now automatically analyzes build failures and provides:
- **Error Type Detection**: Prisma, TypeScript, Dependencies, Build issues
- **Actionable Suggestions**: Step-by-step fix instructions
- **Quick Commands**: Copy-paste terminal commands
- **Visual Indicators**: Color-coded status with emoji icons

### **Real-time Monitoring** 📊
- Live build status updates every 10 seconds
- Build progress indicators with ETA
- Auto-refresh toggle (ON/OFF)
- Historical activity logging

### **Professional Controls** ⚙️
- Individual branch build triggers
- Bulk operations (trigger all, abort all)
- Log viewing with syntax highlighting
- Download build logs as files

---

## 🛠️ **Troubleshooting Guide**

### **Common Build Failures**

#### **🗄️ Prisma Type Errors**
**Symptoms**: `Type error: Argument of type 'Omit<PrismaClient<...>' is not assignable`

**Solution**:
```bash
# Regenerate Prisma client
npx prisma generate

# Clean build
rm -rf .next node_modules/.prisma
npm run build
```

#### **📝 TypeScript Compilation Errors**
**Symptoms**: Type checking failures, import/export issues

**Solution**:
```bash
# Check types without building
npx tsc --noEmit

# Fix and rebuild
npm run lint:fix
npm run build
```

#### **📦 Dependency Issues**
**Symptoms**: npm install failures, missing packages

**Solution**:
```bash
# Complete dependency reset
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### **Dashboard Issues**

#### **❌ Jenkins Connection Failed**
1. Verify Jenkins is running: `curl http://localhost:9080/api/json`
2. Check credentials are `admin:admin`
3. Restart Jenkins if needed

#### **🔌 Proxy Server Issues**
1. Stop existing processes: `pkill -f "node jenkins-proxy"`
2. Restart dashboard: `./start.sh`
3. Check port 7005 is available: `lsof -i :7005`

---

## 🔐 **Authentication & Security**

### **Current Credentials**
- **Username**: `admin`
- **Password**: `admin`

These credentials are configured in:
- `trigger-builds.sh` (line 7-8)
- `ci-dashboard/jenkins-proxy.js` (line 11-12)

### **CSRF Protection**
The system uses Jenkins CSRF tokens for security:
- Tokens are automatically obtained and refreshed
- Session cookies are maintained across requests
- Same authentication method as `trigger-builds.sh`

---

## 📊 **Build Status Indicators**

| Status | Icon | Description |
|--------|------|-------------|
| **SUCCESS** | ✅ | Build completed successfully |
| **FAILED** | ❌ | Build failed - check diagnostics |
| **BUILDING** | 🔨 | Build currently in progress |
| **PREPARING** | ⏳ | Build queued/starting |
| **ABORTED** | 🛑 | Build was manually stopped |
| **UNKNOWN** | ❓ | Status unclear - may need refresh |

---

## 🚀 **Advanced Usage**

### **Batch Operations**
```bash
# Trigger all builds with monitoring
./trigger-builds.sh all

# Monitor specific build
./trigger-builds.sh monitor development

# Get detailed status with error analysis
./trigger-builds.sh status
```

### **Dashboard Keyboard Shortcuts**
- **Ctrl/Cmd + R**: Refresh status
- **Ctrl/Cmd + T**: Trigger all builds
- **Ctrl/Cmd + A**: Abort all builds

### **API Endpoints**
The dashboard exposes these proxy endpoints:
- `GET /jenkins-proxy/api/json` - Jenkins status
- `GET /jenkins-proxy/job/{jobName}/api/json` - Job information
- `POST /jenkins-proxy/job/{jobName}/build` - Trigger build
- `GET /jenkins-proxy/job/{jobName}/{buildNumber}/consoleText` - Build logs

---

## 🔄 **Workflow Integration**

### **Recommended Development Flow**
1. **Make changes** in `in-progress` branch
2. **Commit and push**: `git add . && git commit -m "feature: description" && git push`
3. **Trigger build**: `./trigger-builds.sh in-progress`
4. **Monitor progress** in dashboard
5. **Auto-promotion** to `development` on success
6. **Manual promotion** through remaining stages

### **Git Sync Verification**
The system checks for:
- ✅ Uncommitted local changes
- ✅ Unpushed commits
- ✅ Branch existence on GitHub
- ✅ Sync status with remote

---

## 📝 **Logs & Debugging**

### **Dashboard Logs**
```bash
# View real-time dashboard logs
tail -f ci-dashboard/logs/dashboard-console.log

# Check last 50 lines
tail -50 ci-dashboard/logs/dashboard-console.log
```

### **Jenkins Build Logs**
Access through:
- **Dashboard UI**: Click log button for any build
- **Direct URL**: `http://localhost:9080/job/{jobName}/{buildNumber}/console`
- **API**: `curl http://localhost:9080/job/{jobName}/{buildNumber}/consoleText --user admin:admin`

---

## 💡 **Tips & Best Practices**

### **🎯 Performance Optimization**
- Use `npm ci` instead of `npm install` when `package-lock.json` exists
- Clear `.next` and `node_modules/.prisma` for clean builds
- Monitor build times and optimize slow stages

### **🔧 Maintenance**
- Regularly check dashboard logs for proxy issues
- Keep Node.js and npm updated
- Monitor disk space in Jenkins workspace

### **🚀 Deployment**
- Always test in `development` before promoting
- Use `publish` branch for staging validation
- Deploy to `main` only after thorough testing

---

## 📚 **Additional Resources**

- **Jenkins Console**: [http://localhost:9080](http://localhost:9080)
- **CI Dashboard**: [http://localhost:7005](http://localhost:7005)
- **GitHub Repository**: Update with your repo URL
- **Project Documentation**: Main README.md

---

## 🤝 **Support**

If you encounter issues:
1. **Check this troubleshooting guide**
2. **Review dashboard logs**: `ci-dashboard/logs/dashboard-console.log`
3. **Run diagnostics**: `./trigger-builds.sh status`
4. **Contact development team** with error details

---

*Dashboard last updated: 2025-06-06 - Enhanced with Prisma error resolution and advanced diagnostics*
