# 🚀 Deploy Somnia Trading Bot to Railway

## Quick Deployment Guide

### Step 1: Prepare Your Repository

1. **Push your code to GitHub** (if not already done)
2. **Ensure all files are committed**:
   - `bot.js` (main bot file)
   - `package.json` (dependencies)
   - `railway.json` (Railway config)
   - `Procfile` (process definition)
   - `.railwayignore` (exclude files)

### Step 2: Deploy to Railway

1. **Go to [Railway.app](https://railway.app)**
2. **Sign up/Login** with your GitHub account
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Choose your repository** containing the bot code
6. **Wait for Railway to detect the project**

### Step 3: Configure Environment Variables

In your Railway project dashboard:

1. **Go to the "Variables" tab**
2. **Add these environment variables**:

```bash
# Required Variables
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
RPC_URL=https://rpc.somnia.network
WETH_ADDRESS=0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7

# Optional DEX Variables (bot will use defaults if not set)
DEX_ROUTER=0xE94de02e52Eaf9F0f6Bf7f16E4927FcBc2c09bC7
DEX_FACTORY_ADDRESS=0x0BFaCE9a5c9F884a4f09fadB83b69e81EA41424B
```

### Step 4: Get Required Values

#### Telegram Bot Token:
1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot`
3. Follow instructions to create your bot
4. Copy the token provided

#### Supabase Credentials:
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings > API
4. Copy the Project URL and anon/public key

### Step 5: Monitor Deployment

1. **Check the deployment logs** in Railway dashboard
2. **Look for success messages** like:
   - "Build completed successfully"
   - "Deployment successful"
   - "Bot is running and listening for messages"

### Step 6: Test Your Bot

1. **Find your bot on Telegram** using the username you created
2. **Send `/start`** to test the bot
3. **Check Railway logs** for any errors

## 🔍 Health Check

Railway will automatically check your bot's health at:
- `https://your-app.railway.app/health`

You should see:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "Somnia Trading Bot",
  "version": "1.0.0"
}
```

## 🛠️ Troubleshooting

### Common Issues:

1. **Build Fails**:
   - Check Railway logs for specific errors
   - Ensure all dependencies are in `package.json`
   - Verify Node.js version compatibility

2. **Bot Not Responding**:
   - Check if TELEGRAM_BOT_TOKEN is correct
   - Verify bot is not running elsewhere
   - Check Railway logs for errors

3. **Database Issues**:
   - Verify Supabase credentials
   - Check if database tables exist
   - Ensure network connectivity

### View Logs:
- Go to Railway project > Deployments > Latest deployment > View logs
- Look for error messages and debug information

## 🎉 Success!

Once deployed successfully:
- ✅ Your bot runs 24/7 on Railway
- ✅ Automatically scales with traffic
- ✅ Monitored with health checks
- ✅ Accessible via HTTPS
- ✅ Ready to help users trade on Somnia testnet!

## 📞 Support

If you need help:
1. Check Railway documentation: [docs.railway.app](https://docs.railway.app)
2. Review your application logs
3. Verify all environment variables are set correctly

Your Somnia Trading Bot is now ready to go live! 🚀 