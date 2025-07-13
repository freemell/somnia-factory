# 🚀 Somnia Trading Bot - Railway Deployment

A Telegram bot for trading tokens on the Somnia testnet with liquidity guidance and copyable wallet addresses.

## ✨ Features

- **🪙 Token Trading**: Buy and sell tokens on Somnia testnet
- **💧 Liquidity Guidance**: Helpful instructions when no liquidity exists
- **📋 Copyable Addresses**: Easy wallet address copying
- **🌉 Bridge Support**: Cross-chain token bridging
- **⏱️ Limit Orders**: Advanced trading features
- **📊 Trade History**: Track your trading activity

## 🚀 Quick Deploy to Railway

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

### 2. Deploy on Railway
1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Add environment variables (see below)

### 3. Environment Variables
Add these in Railway dashboard:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
RPC_URL=https://rpc.somnia.network
WETH_ADDRESS=0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7
```

## 📁 Project Structure

```
somnia-trading-bot/
├── bot.js                 # Main bot file
├── package.json           # Dependencies
├── railway.json          # Railway config
├── Procfile              # Process definition
├── utils/                # Bot utilities
│   ├── dex.js            # DEX integration
│   ├── database.js       # Database operations
│   ├── walletManager.js  # Wallet management
│   └── imageGen.js       # Trade image generation
└── commands/             # Bot commands
    ├── trade.js          # Trading functionality
    ├── bridge.js         # Bridge operations
    └── limitOrder.js     # Limit orders
```

## 🔧 Configuration Files

- **`railway.json`**: Railway deployment configuration
- **`Procfile`**: Process definition for Railway
- **`.railwayignore`**: Files to exclude from deployment
- **`package.json`**: Node.js dependencies and scripts

## 🏥 Health Check

Railway monitors your bot at:
```
https://your-app.railway.app/health
```

## 📖 Documentation

- **Full Deployment Guide**: [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md)
- **Quick Deploy Guide**: [DEPLOY_TO_RAILWAY.md](DEPLOY_TO_RAILWAY.md)

## 🎯 What's New

### Liquidity Guidance
When users try to trade tokens with no liquidity, the bot provides step-by-step instructions for adding liquidity to QuickSwap.

### Copyable Wallet Addresses
All wallet addresses are now displayed in a copyable format, making it easy for users to copy and paste addresses.

## 🚀 Ready to Deploy!

Your bot is configured and ready for Railway deployment. Follow the quick deploy guide above to get started!

---

**Built for Somnia Testnet** 🧠 | **Powered by Railway** 🚂 