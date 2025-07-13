# 🚀 Railway Deployment Guide for Somnia Trading Bot

This guide will help you deploy your Somnia Trading Bot to Railway, a modern platform for deploying applications.

## 📋 Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your bot code should be in a GitHub repository
3. **Environment Variables**: Prepare your environment variables

## 🔧 Environment Variables Setup

Before deploying, you need to set up these environment variables in Railway:

### Required Environment Variables

```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Supabase Database Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key

# Blockchain Configuration
RPC_URL=https://rpc.somnia.network
WETH_ADDRESS=0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7

# DEX Configuration (Optional - bot will use defaults)
DEX_ROUTER=0xE94de02e52Eaf9F0f6Bf7f16E4927FcBc2c09bC7
DEX_FACTORY_ADDRESS=0x0BFaCE9a5c9F884a4f09fadB83b69e81EA41424B
```

### How to Get These Values

1. **TELEGRAM_BOT_TOKEN**: 
   - Message [@BotFather](https://t.me/botfather) on Telegram
   - Create a new bot with `/newbot`
   - Copy the token provided

2. **SUPABASE_URL & SUPABASE_KEY**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Go to Settings > API
   - Copy the Project URL and anon/public key

3. **RPC_URL**: Use the official Somnia testnet RPC

## 🚀 Deployment Steps

### Step 1: Connect Your Repository

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository containing the bot code

### Step 2: Configure Environment Variables

1. In your Railway project dashboard, go to the "Variables" tab
2. Add all the required environment variables listed above
3. Make sure to use the exact variable names (case-sensitive)

### Step 3: Deploy

1. Railway will automatically detect the Node.js project
2. It will use the `railway.json` configuration
3. The deployment will start automatically
4. Monitor the build logs for any issues

### Step 4: Verify Deployment

1. Check the deployment logs for success messages
2. Visit your Railway app URL to see the health check endpoint
3. Test your bot on Telegram

## 📁 Project Structure

The following files are important for Railway deployment:

```
somnia-trading-bot/
├── bot.js                 # Main bot file
├── package.json           # Dependencies and scripts
├── railway.json          # Railway configuration
├── Procfile              # Process definition
├── .railwayignore        # Files to exclude from deployment
└── utils/                # Bot utilities
    ├── dex.js            # DEX integration
    ├── database.js       # Database operations
    ├── walletManager.js  # Wallet management
    └── ...
```

## 🔍 Health Checks

Railway will automatically check the health of your application at:
- `https://your-app.railway.app/health`

The health endpoint returns:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "Somnia Trading Bot",
  "version": "1.0.0"
}
```

## 🛠️ Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check that all dependencies are in `package.json`
   - Ensure Node.js version is compatible (>=18.0.0)

2. **Environment Variables**:
   - Verify all required variables are set
   - Check for typos in variable names
   - Ensure values are correct

3. **Bot Not Responding**:
   - Check Railway logs for errors
   - Verify TELEGRAM_BOT_TOKEN is correct
   - Ensure bot is not already running elsewhere

4. **Database Connection Issues**:
   - Verify Supabase credentials
   - Check if database tables exist
   - Ensure network connectivity

### Logs and Monitoring

1. **View Logs**: Go to your Railway project > Deployments > Latest deployment > View logs
2. **Real-time Logs**: Use Railway CLI: `railway logs`
3. **Metrics**: Monitor CPU, memory, and network usage in Railway dashboard

## 🔄 Continuous Deployment

Railway automatically redeploys when you push changes to your GitHub repository. To disable this:

1. Go to your Railway project settings
2. Disable "Auto Deploy" if needed

## 📊 Scaling

Railway automatically scales your application based on traffic. You can also manually adjust:

1. Go to your Railway project
2. Click on your service
3. Adjust the number of instances

## 🔒 Security Considerations

1. **Environment Variables**: Never commit sensitive data to your repository
2. **Bot Token**: Keep your Telegram bot token secure
3. **Database Access**: Use Supabase Row Level Security (RLS)
4. **HTTPS**: Railway automatically provides HTTPS

## 🆘 Support

If you encounter issues:

1. Check Railway documentation: [docs.railway.app](https://docs.railway.app)
2. Review your application logs
3. Verify all environment variables are set correctly
4. Test locally before deploying

## 🎉 Success!

Once deployed successfully, your bot will be:
- ✅ Running 24/7 on Railway's infrastructure
- ✅ Automatically scaled based on demand
- ✅ Monitored with health checks
- ✅ Accessible via HTTPS
- ✅ Ready to handle Telegram users

Your Somnia Trading Bot is now live and ready to help users trade on the Somnia testnet! 🚀 