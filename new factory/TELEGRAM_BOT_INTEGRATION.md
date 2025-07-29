# 🤖 **Telegram Bot Swap Integration Guide**

Complete step-by-step procedure to integrate swap functionality into your Telegram bot for the INSOMN token ecosystem.

## 📋 **Table of Contents**

1. [Prerequisites Setup](#prerequisites-setup)
2. [Contract Deployment](#contract-deployment)
3. [Liquidity Provision](#liquidity-provision)
4. [Swap Implementation](#swap-implementation)
5. [Telegram Bot Integration](#telegram-bot-integration)
6. [Environment Setup](#environment-setup)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 **Prerequisites Setup**

### **Required Dependencies**
```bash
npm install node-telegram-bot-api ethers dotenv
```

### **Environment Variables**
Create a `.env` file:
```bash
TELEGRAM_TOKEN=your_telegram_bot_token
PRIVATE_KEY=99f33cb471e638d3d5a7cad46f712f2365710618e9afe3cf3e1c0e94f2c1eb1d
FACTORY_ADDRESS=0x8669cD81994740D517661577A72B84d0a308D8b0
INSOMN_ADDRESS=0xCdaC954Cff3be5eBED645745c85dc13cC2c97836
WETH_ADDRESS=0xd2480162Aa7F02Ead7BF4C127465446150D58452
RPC_URL=https://dream-rpc.somnia.network/
```

---

## 📦 **Contract Deployment**

### **1. Deploy Factory Contract**
```javascript
const { ethers } = require("hardhat");

async function deployFactory() {
    const Factory = await ethers.getContractFactory("Factory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    
    console.log("Factory deployed to:", factoryAddress);
    return factoryAddress;
}
```

### **2. Deploy INSOMN Token**
```javascript
async function deployINSOMN() {
    const INSOMNToken = await ethers.getContractFactory("INSOMNToken");
    const insomnToken = await INSOMNToken.deploy();
    await insomnToken.waitForDeployment();
    const insomnAddress = await insomnToken.getAddress();
    
    console.log("INSOMN Token deployed to:", insomnAddress);
    return insomnAddress;
}
```

### **3. Create Pool**
```javascript
async function createPool(factoryAddress, insomnAddress, wethAddress) {
    const factory = await ethers.getContractAt("Factory", factoryAddress);
    
    const tx = await factory.createPool(insomnAddress, wethAddress, 3000, 60);
    await tx.wait();
    
    const poolAddress = await factory.getPool(insomnAddress, wethAddress, 3000);
    console.log("Pool created at:", poolAddress);
    
    return poolAddress;
}
```

---

## 💧 **Liquidity Provision**

### **Add Initial Liquidity**
```javascript
async function addLiquidity(poolAddress, insomnAddress, insomnLiquidity, sttLiquidity) {
    const [deployer] = await ethers.getSigners();
    const insomnToken = await ethers.getContractAt("INSOMNToken", insomnAddress);
    const pool = await ethers.getContractAt("CustomPool", poolAddress);
    
    // Transfer tokens to pool
    await insomnToken.transfer(poolAddress, insomnLiquidity);
    await deployer.sendTransaction({ to: poolAddress, value: sttLiquidity });
    
    // Update pool's internal liquidity state
    await pool.addLiquidity(insomnLiquidity);
    
    console.log("✅ Liquidity added successfully");
}
```

### **Usage Example**
```javascript
const insomnLiquidity = ethers.parseEther("100000"); // 100k INSOMN
const sttLiquidity = ethers.parseEther("50"); // 50 STT

await addLiquidity(poolAddress, insomnAddress, insomnLiquidity, sttLiquidity);
```

---

## 🔄 **Swap Implementation**

### **1. Factory Contract Setup**
```javascript
const { ethers } = require("ethers");
require("dotenv").config();

// Initialize provider and wallet
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Load Factory ABI and create contract instance
const factoryABI = require('./abi.json');
const factory = new ethers.Contract(process.env.FACTORY_ADDRESS, factoryABI, wallet);
```

### **2. Pool Validation Function**
```javascript
async function validatePool(tokenA, tokenB, fee = 3000) {
    const poolAddress = await factory.getPool(tokenA, tokenB, fee);
    
    if (poolAddress === ethers.ZeroAddress) {
        throw new Error("Pool does not exist");
    }
    
    // Check if pool has liquidity
    const [reserve0, reserve1, liquidity] = await factory.getPoolReserves(poolAddress);
    
    if (reserve0 === 0n || reserve1 === 0n) {
        throw new Error("Pool has no liquidity");
    }
    
    return poolAddress;
}
```

### **3. STT to Token Swap**
```javascript
async function swapSTTForTokens(poolAddress, amountOutMin, tokenOut) {
    const swapAmount = ethers.parseEther("20"); // 20 STT
    
    try {
        const tx = await factory.swapSTTForTokens(
            poolAddress,
            amountOutMin,
            tokenOut,
            { value: swapAmount }
        );
        
        const receipt = await tx.wait();
        console.log("✅ Swap successful:", receipt.hash);
        
        // Get the Swap event
        const swapEvent = receipt.logs.find(log => 
            log.topics[0] === factory.interface.getEventTopic('Swap')
        );
        
        return {
            success: true,
            txHash: receipt.hash,
            amountIn: swapAmount,
            amountOut: swapEvent ? swapEvent.data : null
        };
    } catch (error) {
        console.error("❌ Swap failed:", error.message);
        return { success: false, error: error.message };
    }
}
```

### **4. Token to STT Swap**
```javascript
async function swapTokensForSTT(poolAddress, amountIn, amountOutMin, tokenIn) {
    try {
        // Approve tokens first
        const tokenContract = new ethers.Contract(tokenIn, ERC20_ABI, wallet);
        await tokenContract.approve(poolAddress, amountIn);
        
        const tx = await factory.swapTokensForSTT(
            poolAddress,
            amountIn,
            amountOutMin,
            tokenIn
        );
        
        const receipt = await tx.wait();
        console.log("✅ Reverse swap successful:", receipt.hash);
        
        return {
            success: true,
            txHash: receipt.hash,
            amountIn: amountIn,
            amountOut: receipt.logs[0]?.data || null
        };
    } catch (error) {
        console.error("❌ Reverse swap failed:", error.message);
        return { success: false, error: error.message };
    }
}
```

### **5. Token to Token Swap**
```javascript
async function swapTokensForTokens(poolAddress, amountIn, amountOutMin, tokenIn, tokenOut) {
    try {
        // Approve input token
        const tokenInContract = new ethers.Contract(tokenIn, ERC20_ABI, wallet);
        await tokenInContract.approve(poolAddress, amountIn);
        
        const tx = await factory.swapTokensForTokens(
            poolAddress,
            amountIn,
            amountOutMin,
            tokenIn,
            tokenOut
        );
        
        const receipt = await tx.wait();
        console.log("✅ Token swap successful:", receipt.hash);
        
        return {
            success: true,
            txHash: receipt.hash,
            amountIn: amountIn
        };
    } catch (error) {
        console.error("❌ Token swap failed:", error.message);
        return { success: false, error: error.message };
    }
}
```

---

## 🤖 **Telegram Bot Integration**

### **1. Bot Setup**
```javascript
const TelegramBot = require('node-telegram-bot-api');
const { ethers } = require('ethers');
require('dotenv').config();

// Initialize bot
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// Initialize blockchain connection
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const factory = new ethers.Contract(process.env.FACTORY_ADDRESS, factoryABI, wallet);

// ERC20 ABI (minimal)
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function transfer(address to, uint256 amount) external returns (bool)"
];
```

### **2. Helper Functions**
```javascript
function getTokenAddress(tokenSymbol) {
    const tokens = {
        'STT': ethers.ZeroAddress, // Native token
        'INSOMN': process.env.INSOMN_ADDRESS,
        'WETH': process.env.WETH_ADDRESS
    };
    return tokens[tokenSymbol.toUpperCase()];
}

function calculateMinOutput(amountIn, fromToken, toToken) {
    // Simple slippage calculation (0.5% slippage)
    const slippage = 0.995;
    return amountIn * BigInt(Math.floor(slippage * 1000)) / 1000n;
}

async function getPoolInfo(poolAddress) {
    const [reserve0, reserve1, liquidity] = await factory.getPoolReserves(poolAddress);
    return { reserve0, reserve1, liquidity };
}
```

### **3. Swap Command Handler**
```javascript
bot.onText(/\/swap (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const params = match[1].split(' ');
    
    if (params.length < 3) {
        return bot.sendMessage(chatId, 
            "Usage: /swap <amount> <from_token> <to_token>\n" +
            "Example: /swap 20 STT INSOMN"
        );
    }
    
    const [amount, fromToken, toToken] = params;
    
    try {
        // Send initial message
        const statusMsg = await bot.sendMessage(chatId, "🔄 Processing swap...");
        
        // Validate pool
        const poolAddress = await validatePool(
            getTokenAddress(fromToken), 
            getTokenAddress(toToken)
        );
        
        // Calculate minimum output
        const amountIn = ethers.parseEther(amount);
        const amountOutMin = calculateMinOutput(amountIn, fromToken, toToken);
        
        // Execute swap
        let result;
        if (fromToken === 'STT') {
            result = await swapSTTForTokens(
                poolAddress, 
                amountOutMin, 
                getTokenAddress(toToken)
            );
        } else if (toToken === 'STT') {
            result = await swapTokensForSTT(
                poolAddress,
                amountIn,
                amountOutMin,
                getTokenAddress(fromToken)
            );
        } else {
            result = await swapTokensForTokens(
                poolAddress,
                amountIn,
                amountOutMin,
                getTokenAddress(fromToken),
                getTokenAddress(toToken)
            );
        }
        
        // Update status
        if (result.success) {
            await bot.editMessageText(
                `✅ Swap successful!\n` +
                `Amount: ${amount} ${fromToken}\n` +
                `To: ${toToken}\n` +
                `Tx: https://shannon-explorer.somnia.network/tx/${result.txHash}`,
                { chat_id: chatId, message_id: statusMsg.message_id }
            );
        } else {
            await bot.editMessageText(
                `❌ Swap failed: ${result.error}`,
                { chat_id: chatId, message_id: statusMsg.message_id }
            );
        }
        
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});
```

### **4. Pool Info Command**
```javascript
bot.onText(/\/pool (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const tokens = match[1].split('/');
    
    try {
        const poolAddress = await validatePool(
            getTokenAddress(tokens[0]), 
            getTokenAddress(tokens[1])
        );
        
        const poolInfo = await getPoolInfo(poolAddress);
        
        bot.sendMessage(chatId,
            `📊 Pool Info (${tokens[0]}/${tokens[1]})\n` +
            `Reserve 0: ${ethers.formatEther(poolInfo.reserve0)}\n` +
            `Reserve 1: ${ethers.formatEther(poolInfo.reserve1)}\n` +
            `Liquidity: ${poolInfo.liquidity.toString()}`
        );
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});
```

### **5. Balance Command**
```javascript
bot.onText(/\/balance/, async (msg, match) => {
    const chatId = msg.chat.id;
    
    try {
        const sttBalance = await provider.getBalance(wallet.address);
        const insomnToken = new ethers.Contract(process.env.INSOMN_ADDRESS, ERC20_ABI, wallet);
        const insomnBalance = await insomnToken.balanceOf(wallet.address);
        
        bot.sendMessage(chatId,
            `💰 Wallet Balance\n` +
            `STT: ${ethers.formatEther(sttBalance)}\n` +
            `INSOMN: ${ethers.formatEther(insomnBalance)}`
        );
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});
```

### **6. Help Command**
```javascript
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    
    bot.sendMessage(chatId,
        `🤖 **INSOMN Swap Bot Commands**\n\n` +
        `🔄 **/swap <amount> <from> <to>** - Perform a swap\n` +
        `Example: /swap 20 STT INSOMN\n\n` +
        `📊 **/pool <token1>/<token2>** - Check pool info\n` +
        `Example: /pool INSOMN/WETH\n\n` +
        `💰 **/balance** - Check wallet balance\n\n` +
        `❓ **/help** - Show this help message\n\n` +
        `**Supported Tokens:** STT, INSOMN, WETH`
    );
});
```

---

## ⚙️ **Environment Setup**

### **1. Install Dependencies**
```bash
npm init -y
npm install node-telegram-bot-api ethers dotenv
```

### **2. Create Bot Token**
1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot`
3. Follow instructions to create your bot
4. Copy the token to your `.env` file

### **3. Project Structure**
```
your-bot/
├── .env
├── package.json
├── abi.json
├── bot.js
└── README.md
```

### **4. Complete Bot File (bot.js)**
```javascript
const TelegramBot = require('node-telegram-bot-api');
const { ethers } = require('ethers');
require('dotenv').config();

// Initialize bot
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// Initialize blockchain connection
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const factoryABI = require('./abi.json');
const factory = new ethers.Contract(process.env.FACTORY_ADDRESS, factoryABI, wallet);

// ERC20 ABI
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function transfer(address to, uint256 amount) external returns (bool)"
];

// Helper functions
function getTokenAddress(tokenSymbol) {
    const tokens = {
        'STT': ethers.ZeroAddress,
        'INSOMN': process.env.INSOMN_ADDRESS,
        'WETH': process.env.WETH_ADDRESS
    };
    return tokens[tokenSymbol.toUpperCase()];
}

async function validatePool(tokenA, tokenB, fee = 3000) {
    const poolAddress = await factory.getPool(tokenA, tokenB, fee);
    
    if (poolAddress === ethers.ZeroAddress) {
        throw new Error("Pool does not exist");
    }
    
    const [reserve0, reserve1, liquidity] = await factory.getPoolReserves(poolAddress);
    
    if (reserve0 === 0n || reserve1 === 0n) {
        throw new Error("Pool has no liquidity");
    }
    
    return poolAddress;
}

// Swap functions
async function swapSTTForTokens(poolAddress, amountOutMin, tokenOut) {
    const swapAmount = ethers.parseEther("20");
    
    try {
        const tx = await factory.swapSTTForTokens(
            poolAddress,
            amountOutMin,
            tokenOut,
            { value: swapAmount }
        );
        
        const receipt = await tx.wait();
        return { success: true, txHash: receipt.hash, amountIn: swapAmount };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function swapTokensForSTT(poolAddress, amountIn, amountOutMin, tokenIn) {
    try {
        const tokenContract = new ethers.Contract(tokenIn, ERC20_ABI, wallet);
        await tokenContract.approve(poolAddress, amountIn);
        
        const tx = await factory.swapTokensForSTT(
            poolAddress,
            amountIn,
            amountOutMin,
            tokenIn
        );
        
        const receipt = await tx.wait();
        return { success: true, txHash: receipt.hash, amountIn: amountIn };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Bot commands
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 
        "🚀 Welcome to INSOMN Swap Bot!\n\n" +
        "Use /help to see available commands."
    );
});

bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId,
        `🤖 **INSOMN Swap Bot Commands**\n\n` +
        `🔄 **/swap <amount> <from> <to>** - Perform a swap\n` +
        `Example: /swap 20 STT INSOMN\n\n` +
        `📊 **/pool <token1>/<token2>** - Check pool info\n` +
        `Example: /pool INSOMN/WETH\n\n` +
        `💰 **/balance** - Check wallet balance\n\n` +
        `❓ **/help** - Show this help message\n\n` +
        `**Supported Tokens:** STT, INSOMN, WETH`
    );
});

bot.onText(/\/swap (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const params = match[1].split(' ');
    
    if (params.length < 3) {
        return bot.sendMessage(chatId, 
            "Usage: /swap <amount> <from_token> <to_token>\n" +
            "Example: /swap 20 STT INSOMN"
        );
    }
    
    const [amount, fromToken, toToken] = params;
    
    try {
        const statusMsg = await bot.sendMessage(chatId, "🔄 Processing swap...");
        
        const poolAddress = await validatePool(
            getTokenAddress(fromToken), 
            getTokenAddress(toToken)
        );
        
        const amountIn = ethers.parseEther(amount);
        const amountOutMin = amountIn * 995n / 1000n; // 0.5% slippage
        
        let result;
        if (fromToken === 'STT') {
            result = await swapSTTForTokens(
                poolAddress, 
                amountOutMin, 
                getTokenAddress(toToken)
            );
        } else if (toToken === 'STT') {
            result = await swapTokensForSTT(
                poolAddress,
                amountIn,
                amountOutMin,
                getTokenAddress(fromToken)
            );
        } else {
            bot.sendMessage(chatId, "❌ Token-to-token swaps not implemented yet");
            return;
        }
        
        if (result.success) {
            await bot.editMessageText(
                `✅ Swap successful!\n` +
                `Amount: ${amount} ${fromToken}\n` +
                `To: ${toToken}\n` +
                `Tx: https://shannon-explorer.somnia.network/tx/${result.txHash}`,
                { chat_id: chatId, message_id: statusMsg.message_id }
            );
        } else {
            await bot.editMessageText(
                `❌ Swap failed: ${result.error}`,
                { chat_id: chatId, message_id: statusMsg.message_id }
            );
        }
        
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});

bot.onText(/\/pool (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const tokens = match[1].split('/');
    
    try {
        const poolAddress = await validatePool(
            getTokenAddress(tokens[0]), 
            getTokenAddress(tokens[1])
        );
        
        const [reserve0, reserve1, liquidity] = await factory.getPoolReserves(poolAddress);
        
        bot.sendMessage(chatId,
            `📊 Pool Info (${tokens[0]}/${tokens[1]})\n` +
            `Reserve 0: ${ethers.formatEther(reserve0)}\n` +
            `Reserve 1: ${ethers.formatEther(reserve1)}\n` +
            `Liquidity: ${liquidity.toString()}`
        );
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});

bot.onText(/\/balance/, async (msg, match) => {
    const chatId = msg.chat.id;
    
    try {
        const sttBalance = await provider.getBalance(wallet.address);
        const insomnToken = new ethers.Contract(process.env.INSOMN_ADDRESS, ERC20_ABI, wallet);
        const insomnBalance = await insomnToken.balanceOf(wallet.address);
        
        bot.sendMessage(chatId,
            `💰 Wallet Balance\n` +
            `STT: ${ethers.formatEther(sttBalance)}\n` +
            `INSOMN: ${ethers.formatEther(insomnBalance)}`
        );
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});

console.log('🤖 Bot is running...');
```

---

## 🧪 **Testing**

### **1. Start the Bot**
```bash
node bot.js
```

### **2. Test Commands**
Send these commands to your bot:

1. **Start the bot:**
   ```
   /start
   ```

2. **Get help:**
   ```
   /help
   ```

3. **Check balance:**
   ```
   /balance
   ```

4. **Check pool info:**
   ```
   /pool INSOMN/WETH
   ```

5. **Perform a swap:**
   ```
   /swap 20 STT INSOMN
   ```

6. **Reverse swap:**
   ```
   /swap 5000 INSOMN STT
   ```

### **3. Expected Responses**
- ✅ Successful swaps with transaction hash
- 📊 Pool information with reserves
- 💰 Wallet balances
- ❌ Error messages for invalid operations

---

## 🔧 **Troubleshooting**

### **Common Issues**

1. **"Pool does not exist"**
   - Ensure the pool was created correctly
   - Check token addresses in `.env`

2. **"Pool has no liquidity"**
   - Add liquidity to the pool first
   - Check if liquidity was added correctly

3. **"Insufficient balance"**
   - Check wallet balance with `/balance`
   - Ensure sufficient STT for gas fees

4. **"Transaction failed"**
   - Check gas price settings
   - Verify network connection
   - Check for sufficient STT balance

### **Debug Commands**
```javascript
// Add to bot.js for debugging
bot.onText(/\/debug/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        const balance = await provider.getBalance(wallet.address);
        const nonce = await provider.getTransactionCount(wallet.address);
        
        bot.sendMessage(chatId,
            `🔧 Debug Info\n` +
            `Address: ${wallet.address}\n` +
            `Balance: ${ethers.formatEther(balance)} STT\n` +
            `Nonce: ${nonce}`
        );
    } catch (error) {
        bot.sendMessage(chatId, `❌ Debug error: ${error.message}`);
    }
});
```

---

## 🎯 **Key Success Factors**

1. **✅ Proper Liquidity**: Ensure pools have sufficient liquidity
2. **✅ Token Approvals**: Always approve tokens before swapping
3. **✅ Slippage Protection**: Calculate minimum output amounts
4. **✅ Error Handling**: Comprehensive error handling
5. **✅ Gas Management**: Monitor gas prices
6. **✅ Pool Validation**: Check pool existence and liquidity

---

## 🚀 **Production Considerations**

1. **Security**: Use environment variables for sensitive data
2. **Monitoring**: Add logging and monitoring
3. **Rate Limiting**: Implement rate limiting for commands
4. **Backup**: Regular backups of bot state
5. **Updates**: Keep dependencies updated

---

## 📞 **Support**

If you encounter issues:
1. Check the troubleshooting section
2. Verify all environment variables
3. Ensure contracts are deployed correctly
4. Check network connectivity

---

**🎉 Your Telegram bot is now ready to perform swaps on the INSOMN ecosystem!** 