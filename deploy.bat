@echo off
echo 🚀 Starting Railway deployment for Somnia Trading Bot...

REM Check if Railway CLI is installed
railway --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Railway CLI is not installed. Please install it first:
    echo npm install -g @railway/cli
    echo Then run: railway login
    pause
    exit /b 1
)

REM Check if user is logged in to Railway
railway whoami >nul 2>&1
if errorlevel 1 (
    echo ❌ Not logged in to Railway. Please run: railway login
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist .env (
    echo ⚠️  Warning: .env file not found. Make sure to set environment variables in Railway dashboard.
) else (
    echo ✅ .env file found
)

REM Check if all required files exist
if not exist bot.js (
    echo ❌ Required file missing: bot.js
    pause
    exit /b 1
)

if not exist package.json (
    echo ❌ Required file missing: package.json
    pause
    exit /b 1
)

if not exist railway.json (
    echo ❌ Required file missing: railway.json
    pause
    exit /b 1
)

if not exist Procfile (
    echo ❌ Required file missing: Procfile
    pause
    exit /b 1
)

echo ✅ All required files found

REM Deploy to Railway
echo 🚀 Deploying to Railway...
railway up

echo ✅ Deployment completed!
echo.
echo 📋 Next steps:
echo 1. Go to your Railway dashboard
echo 2. Set up environment variables in the Variables tab
echo 3. Check the deployment logs for any issues
echo 4. Test your bot on Telegram
echo.
echo 🔗 Railway Dashboard: https://railway.app
echo 📖 Deployment Guide: See RAILWAY_DEPLOYMENT.md
pause 