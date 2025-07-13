#!/bin/bash

# 🚀 Somnia Trading Bot Railway Deployment Script

echo "🚀 Starting Railway deployment for Somnia Trading Bot..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed. Please install it first:"
    echo "npm install -g @railway/cli"
    echo "Then run: railway login"
    exit 1
fi

# Check if user is logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run: railway login"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found. Make sure to set environment variables in Railway dashboard."
else
    echo "✅ .env file found"
fi

# Check if all required files exist
required_files=("bot.js" "package.json" "railway.json" "Procfile")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Required file missing: $file"
        exit 1
    fi
done

echo "✅ All required files found"

# Deploy to Railway
echo "🚀 Deploying to Railway..."
railway up

echo "✅ Deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Go to your Railway dashboard"
echo "2. Set up environment variables in the Variables tab"
echo "3. Check the deployment logs for any issues"
echo "4. Test your bot on Telegram"
echo ""
echo "🔗 Railway Dashboard: https://railway.app"
echo "📖 Deployment Guide: See RAILWAY_DEPLOYMENT.md" 