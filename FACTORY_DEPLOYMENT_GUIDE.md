# 🏭 Factory Deployment Guide

This guide will help you deploy your own CustomFactory and related contracts for the trading bot.

## 📋 Prerequisites

### **1. Environment Setup**
```bash
# Ensure you have the required dependencies
npm install

# Compile contracts
npx hardhat compile
```

### **2. Environment Variables**
Create/update your `.env` file:
```env
# Network Configuration
RPC_URL=https://dream-rpc.somnia.network
PRIVATE_KEY=your_private_key_here

# Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

### **3. Account Requirements**
- **Minimum Balance**: At least 1 STT for gas fees
- **Private Key**: Must be the deployer account
- **Network**: Somnia Testnet (Chain ID: 50312)

## 🚀 Deployment Steps

### **Step 1: Deploy Factory Contracts**
```bash
# Deploy CustomFactory and related contracts
npx hardhat run scripts/deploy-factory.js --network somniaTestnet
```

**Expected Output:**
```
🚀 Starting factory deployment...
📝 Deploying contracts with account: 0x...
💰 Account balance: 10.000 STT

📦 Deploying CustomPoolDeployer...
✅ CustomPoolDeployer deployed to: 0x...

🏭 Deploying CustomFactory...
✅ CustomFactory deployed to: 0x...

⚙️ Configuring CustomPoolDeployer...
✅ CustomPoolDeployer configured with factory address

🪙 Deploying test tokens...
✅ TokenA deployed to: 0x...
✅ TokenB deployed to: 0x...

🏊 Creating test pool...
✅ Test pool created
📍 Pool address: 0x...

🎉 Factory deployment completed!
📄 Deployment info saved to: deployment-factory.json
```

### **Step 2: Add Initial Liquidity**
```bash
# Add liquidity to the test pool
npx hardhat run scripts/add-liquidity-factory.js --network somniaTestnet
```

**Expected Output:**
```
🏊 Starting liquidity addition...
📝 Using account: 0x...

🪙 Minting tokens...
✅ TokenA minted
✅ TokenB minted

📍 Pool address: 0x...

✅ Approving tokens...
✅ TokenA approved
✅ TokenB approved

💧 Adding liquidity...
✅ Liquidity added successfully!

📊 Final balances:
TokenA: 900.0
TokenB: 900.0
```

### **Step 3: Update Bot Configuration**
The bot will automatically load the factory configuration from `deployment-factory.json`.

## 🔧 Configuration Files

### **deployment-factory.json**
This file is automatically created after deployment:
```json
{
  "network": "somnia-testnet",
  "deployer": "0x...",
  "contracts": {
    "customPoolDeployer": "0x...",
    "customFactory": "0x...",
    "tokenA": "0x...",
    "tokenB": "0x...",
    "testPool": "0x..."
  },
  "deploymentTime": "2024-01-01T00:00:00.000Z"
}
```

## 🧪 Testing Your Deployment

### **1. Test Pool Creation**
```bash
# Test creating a new pool
npx hardhat run scripts/test-pool-creation.js --network somniaTestnet
```

### **2. Test Swap Execution**
```bash
# Test executing a swap
npx hardhat run scripts/test-swap-execution.js --network somniaTestnet
```

### **3. Test Bot Integration**
```bash
# Start the bot with your factory
node bot.js
```

## 🔍 Verification Steps

### **1. Check Contract Deployment**
- Verify contracts on [Somnia Explorer](https://shannon-explorer.somnia.network)
- Check contract addresses match `deployment-factory.json`

### **2. Check Pool Creation**
- Verify pool exists for TokenA/TokenB pair
- Check liquidity is added correctly

### **3. Check Bot Integration**
- Scan your deployed tokens in the bot
- Test buy/sell operations
- Verify balance updates

## 🛠️ Troubleshooting

### **Common Issues:**

#### **1. Insufficient Gas**
```
Error: insufficient funds for gas
```
**Solution**: Ensure your account has enough STT for gas fees.

#### **2. Contract Already Deployed**
```
Error: contract already deployed
```
**Solution**: Use existing deployment or deploy to a different network.

#### **3. Pool Creation Fails**
```
Error: execution reverted
```
**Solution**: Check if CustomPoolDeployer is properly configured.

#### **4. Liquidity Addition Fails**
```
Error: insufficient allowance
```
**Solution**: Ensure tokens are approved for the pool contract.

## 📊 Monitoring

### **1. Contract Events**
Monitor these events for debugging:
- `PoolCreated` - When new pools are created
- `Swap` - When swaps are executed
- `Mint` - When liquidity is added

### **2. Balance Tracking**
- Monitor deployer account balance
- Track token balances in pools
- Check liquidity provider positions

## 🔄 Updating Factory

### **To Update Factory Address:**
1. Deploy new factory contracts
2. Update `deployment-factory.json`
3. Restart the bot

### **To Add New Tokens:**
1. Deploy new token contracts
2. Create pools using your factory
3. Add initial liquidity
4. Update bot configuration

## 🎯 Next Steps

After successful deployment:

1. **Test with Real Tokens**: Deploy your own tokens and create pools
2. **Add More Liquidity**: Increase liquidity for better trading
3. **Monitor Performance**: Track swap volumes and fees
4. **Scale Up**: Deploy to mainnet when ready

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section
2. Verify all prerequisites are met
3. Review contract logs for errors
4. Ensure proper network configuration 