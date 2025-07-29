# 🔄 **INSOMN Ecosystem Integration Guide**

Complete integration guide for your existing bot to work with the deployed INSOMN ecosystem contracts.

## 📋 **Contract Addresses**

```javascript
// INSOMN Ecosystem Contracts (Already Deployed)
const INSOMN_ECOSYSTEM = {
  factory: '0x8669cD81994740D517661577A72B84d0a308D8b0',
  insomn: '0xCdaC954Cff3be5eBED645745c85dc13cC2c97836',
  weth: '0xd2480162Aa7F02Ead7BF4C127465446150D58452',
  pool: '0xaA19FBBd3f5FD24cd5Db040364e91b9fa86aa18f'
};
```

## 🚀 **Quick Integration Steps**

### **1. Install Dependencies**
```bash
npm install ethers@6
```

### **2. Add Environment Variables**
```env
# Add to your .env file
PRIVATE_KEY=99f33cb471e638d3d5a7cad46f712f2365710618e9afe3cf3e1c0e94f2c1eb1d
RPC_URL=https://dream-rpc.somnia.network/
```

### **3. Test Integration**
```bash
# Test the INSOMN ecosystem integration
node test-insomn-integration.js
```

## 🔧 **Integration Files**

### **Core Files Created:**
- `utils/insomnSwap.js` - Main swap functionality
- `utils/insomnIntegration.js` - Integration helpers
- `test-insomn-integration.js` - Test script

### **Key Functions Available:**

#### **Swap Functions**
```javascript
// Execute swaps
await executeInsomnSwap(amount, fromToken, toToken, wallet, provider);

// Examples:
await executeInsomnSwap("1", "STT", "INSOMN", wallet, provider);
await executeInsomnSwap("10", "INSOMN", "STT", wallet, provider);
```

#### **Info Functions**
```javascript
// Get token info
const tokenInfo = await getInsomnTokenInfo(tokenAddress, provider);

// Get pool info
const poolInfo = await getInsomnPoolInfo("STT", "INSOMN", provider);

// Get wallet balance
const balance = await getInsomnBalance(wallet, provider);
```

#### **Utility Functions**
```javascript
// Check if token is INSOMN ecosystem
const isInsomn = isInsomnEcosystemToken(tokenAddress);

// Create buy/sell buttons
const buttons = createInsomnButtons("INSOMN");
```

## 🎯 **Supported Operations**

### **✅ Available Swaps**
- STT → INSOMN
- STT → WETH
- INSOMN → STT
- WETH → STT

### **✅ Available Info**
- Pool reserves and liquidity
- Wallet balances (STT, INSOMN)
- Token information
- Transaction status

### **✅ Available Features**
- Real blockchain swaps
- Pool validation
- Slippage protection (0.5%)
- Transaction confirmation
- Error handling

## 🔄 **Integration Examples**

### **For Telegram Bot**
```javascript
// Add to your existing bot handlers
bot.action(/insomn_buy_(.+)_(.+)/, async (ctx) => {
  const [amount, tokenSymbol] = ctx.match.slice(1);
  
  const wallet = await getUserWallet(ctx.from.id);
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  
  const result = await executeInsomnSwap(amount, "STT", tokenSymbol, wallet, provider);
  
  await ctx.reply(result.message);
});

bot.action(/insomn_sell_(.+)_(.+)/, async (ctx) => {
  const [percentage, tokenSymbol] = ctx.match.slice(1);
  
  const wallet = await getUserWallet(ctx.from.id);
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  
  // Calculate amount based on percentage
  const balance = await getInsomnBalance(wallet, provider);
  const amount = (parseFloat(balance.balance.insomn) * parseInt(percentage)) / 100;
  
  const result = await executeInsomnSwap(amount.toString(), tokenSymbol, "STT", wallet, provider);
  
  await ctx.reply(result.message);
});
```

### **For Token Scanning**
```javascript
// Add to your token detection logic
async function handleTokenAddressInput(ctx, tokenAddress) {
  // Check if it's an INSOMN ecosystem token
  if (isInsomnEcosystemToken(tokenAddress)) {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const tokenInfo = await getInsomnTokenInfo(tokenAddress, provider);
    
    if (tokenInfo) {
      const buttons = createInsomnButtons(tokenInfo.symbol);
      
      await ctx.reply(
        `🪙 *${tokenInfo.symbol}* — ${tokenInfo.name}\n` +
        `📬 Address: \`${tokenAddress}\`\n` +
        `🎯 INSOMN Ecosystem Token\n\n` +
        `*Real Trading Available*\nSelect an action:`,
        { 
          parse_mode: 'Markdown', 
          ...Markup.inlineKeyboard([...buttons, [Markup.button.callback('🏠 Menu', 'main_menu')]])
        }
      );
      return;
    }
  }
  
  // Continue with existing logic for other tokens...
}
```

## 🧪 **Testing**

### **Run Integration Tests**
```bash
# Test the complete integration
node test-insomn-integration.js
```

**Expected Output:**
```
🧪 Testing INSOMN Ecosystem Integration...

📝 Using wallet: 0x...
🌐 Connected to: https://dream-rpc.somnia.network/

🔍 Test 1: Checking INSOMN ecosystem tokens...
0xCdaC954Cff3be5eBED645745c85dc13cC2c97836: ✅ INSOMN Ecosystem
0xd2480162Aa7F02Ead7BF4C127465446150D58452: ✅ INSOMN Ecosystem
...

📋 Test 2: Getting token information...
✅ INSOMN Token Info:
   Name: Insomn
   Symbol: INSOMN
   Decimals: 18
   Address: 0xCdaC954Cff3be5eBED645745c85dc13cC2c97836
   Ecosystem: INSOMN

🏊 Test 3: Getting pool information...
✅ Pool Info:
📊 Pool Info (STT/INSOMN)
Reserve 0: 1000.0
Reserve 1: 500.0
Liquidity: 500000000000000000000
Pool: 0xaA19FBBd3f5FD24cd5Db040364e91b9fa86aa18f

💰 Test 4: Getting wallet balance...
✅ Wallet Balance:
💰 Wallet Balance
STT: 10.5
INSOMN: 25.0

🎉 INSOMN Ecosystem Integration Test Complete!
```

## 🔍 **Verification Steps**

### **1. Check Contract Deployment**
- Verify contracts on [Somnia Explorer](https://shannon-explorer.somnia.network)
- Check factory address: `0x8669cD81994740D517661577A72B84d0a308D8b0`
- Check INSOMN token: `0xCdaC954Cff3be5eBED645745c85dc13cC2c97836`

### **2. Check Pool Liquidity**
- Verify pool exists: `0xaA19FBBd3f5FD24cd5Db040364e91b9fa86aa18f`
- Check liquidity is sufficient for trading

### **3. Test Bot Integration**
- Scan INSOMN token address in bot
- Test buy/sell operations
- Verify transaction confirmations

## 🛠️ **Troubleshooting**

### **Common Issues:**

#### **1. "Pool does not exist"**
```
❌ Error: Pool does not exist
```
**Solution**: Check if pool was created with correct fee tier (3000)

#### **2. "Pool has no liquidity"**
```
❌ Error: Pool has no liquidity
```
**Solution**: Add liquidity to the pool first

#### **3. "Insufficient balance"**
```
❌ Error: insufficient funds for gas
```
**Solution**: Ensure wallet has enough STT for gas fees

#### **4. "Token approval failed"**
```
❌ Error: ERC20: transfer amount exceeds allowance
```
**Solution**: Approve tokens for factory contract

## 📊 **Monitoring**

### **Track Transactions**
- Monitor swap events on blockchain
- Check transaction status on explorer
- Track pool reserves changes

### **Track Balances**
- Monitor wallet STT balance
- Track INSOMN token holdings
- Check gas fee consumption

## 🎯 **Next Steps**

After successful integration:

1. **Test Real Swaps**: Execute actual STT ↔ INSOMN swaps
2. **Add More Tokens**: Integrate WETH and other tokens
3. **Optimize Gas**: Fine-tune gas settings for better UX
4. **Add Analytics**: Track trading volumes and fees
5. **Scale Up**: Deploy to mainnet when ready

## 📞 **Support**

If you encounter issues:
1. Check the troubleshooting section
2. Verify contract addresses are correct
3. Ensure sufficient liquidity in pools
4. Check wallet has enough STT for gas
5. Review transaction logs for errors

## 🎉 **Success Indicators**

✅ **Integration Complete When:**
- Test script runs without errors
- Token scanning works for INSOMN ecosystem
- Buy/sell buttons appear correctly
- Real swaps execute successfully
- Transactions confirm on blockchain
- Balances update correctly

**Your bot now has full INSOMN ecosystem integration!** 🚀 