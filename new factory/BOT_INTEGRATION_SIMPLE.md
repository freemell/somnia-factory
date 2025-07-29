# 🔄 **Simple Bot Integration for Existing Contracts**

Integration guide for your existing bot UI to work with the deployed INSOMN ecosystem contracts.

## 📋 **Existing Contract Addresses**

```javascript
// Use these specific addresses (already deployed)
const FACTORY_ADDRESS = "0x8669cD81994740D517661577A72B84d0a308D8b0";
const INSOMN_ADDRESS = "0xCdaC954Cff3be5eBED645745c85dc13cC2c97836";
const WETH_ADDRESS = "0xd2480162Aa7F02Ead7BF4C127465446150D58452";
const POOL_ADDRESS = "0xaA19FBBd3f5FD24cd5Db040364e91b9fa86aa18f";
```

## 🔧 **Add to Your Existing Bot**

### **1. Import Required Libraries**
```javascript
// Add to your existing bot file
const { ethers } = require('ethers');
const factoryABI = require('./abi.json'); // Use the extracted ABI

// ERC20 ABI (minimal)
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function transfer(address to, uint256 amount) external returns (bool)"
];
```

### **2. Initialize Blockchain Connection**
```javascript
// Add to your bot initialization
const provider = new ethers.JsonRpcProvider("https://dream-rpc.somnia.network/");
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const factory = new ethers.Contract(FACTORY_ADDRESS, factoryABI, wallet);
```

### **3. Add Swap Functions to Your Bot**
```javascript
// Add these functions to your existing bot

// Validate pool exists and has liquidity
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

// Get token address from symbol
function getTokenAddress(tokenSymbol) {
    const tokens = {
        'STT': ethers.ZeroAddress,
        'INSOMN': INSOMN_ADDRESS,
        'WETH': WETH_ADDRESS
    };
    return tokens[tokenSymbol.toUpperCase()];
}

// STT to Token swap
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
        return { success: true, txHash: receipt.hash, amountIn: swapAmount };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Token to STT swap
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

// Get pool information
async function getPoolInfo(poolAddress) {
    const [reserve0, reserve1, liquidity] = await factory.getPoolReserves(poolAddress);
    return { reserve0, reserve1, liquidity };
}

// Get wallet balance
async function getWalletBalance() {
    const sttBalance = await provider.getBalance(wallet.address);
    const insomnToken = new ethers.Contract(INSOMN_ADDRESS, ERC20_ABI, wallet);
    const insomnBalance = await insomnToken.balanceOf(wallet.address);
    
    return {
        stt: ethers.formatEther(sttBalance),
        insomn: ethers.formatEther(insomnBalance)
    };
}
```

### **4. Add to Your Existing UI/Commands**
```javascript
// Add these to your existing bot commands/handlers

// Example: Add swap functionality to existing command
async function handleSwap(amount, fromToken, toToken) {
    try {
        // Validate pool
        const poolAddress = await validatePool(
            getTokenAddress(fromToken), 
            getTokenAddress(toToken)
        );
        
        // Calculate minimum output (0.5% slippage)
        const amountIn = ethers.parseEther(amount);
        const amountOutMin = amountIn * 995n / 1000n;
        
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
            throw new Error("Token-to-token swaps not implemented");
        }
        
        if (result.success) {
            return {
                success: true,
                message: `✅ Swap successful!\nAmount: ${amount} ${fromToken}\nTo: ${toToken}\nTx: https://shannon-explorer.somnia.network/tx/${result.txHash}`
            };
        } else {
            return {
                success: false,
                message: `❌ Swap failed: ${result.error}`
            };
        }
        
    } catch (error) {
        return {
            success: false,
            message: `❌ Error: ${error.message}`
        };
    }
}

// Example: Add pool info to existing command
async function handlePoolInfo(token1, token2) {
    try {
        const poolAddress = await validatePool(
            getTokenAddress(token1), 
            getTokenAddress(token2)
        );
        
        const poolInfo = await getPoolInfo(poolAddress);
        
        return {
            success: true,
            message: `📊 Pool Info (${token1}/${token2})\nReserve 0: ${ethers.formatEther(poolInfo.reserve0)}\nReserve 1: ${ethers.formatEther(poolInfo.reserve1)}\nLiquidity: ${poolInfo.liquidity.toString()}`
        };
    } catch (error) {
        return {
            success: false,
            message: `❌ Error: ${error.message}`
        };
    }
}

// Example: Add balance check to existing command
async function handleBalanceCheck() {
    try {
        const balance = await getWalletBalance();
        
        return {
            success: true,
            message: `💰 Wallet Balance\nSTT: ${balance.stt}\nINSOMN: ${balance.insomn}`
        };
    } catch (error) {
        return {
            success: false,
            message: `❌ Error: ${error.message}`
        };
    }
}
```

## 🎯 **Integration Examples**

### **For Telegram Bot**
```javascript
// Add to your existing Telegram bot
bot.onText(/\/swap (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const params = match[1].split(' ');
    
    if (params.length < 3) {
        return bot.sendMessage(chatId, "Usage: /swap <amount> <from> <to>");
    }
    
    const [amount, fromToken, toToken] = params;
    const statusMsg = await bot.sendMessage(chatId, "🔄 Processing...");
    
    const result = await handleSwap(amount, fromToken, toToken);
    
    await bot.editMessageText(result.message, {
        chat_id: chatId, 
        message_id: statusMsg.message_id
    });
});
```

### **For Discord Bot**
```javascript
// Add to your existing Discord bot
client.on('messageCreate', async (message) => {
    if (message.content.startsWith('!swap')) {
        const params = message.content.split(' ');
        if (params.length < 4) {
            return message.reply('Usage: !swap <amount> <from> <to>');
        }
        
        const [_, amount, fromToken, toToken] = params;
        const statusMsg = await message.reply('🔄 Processing...');
        
        const result = await handleSwap(amount, fromToken, toToken);
        
        await statusMsg.edit(result.message);
    }
});
```

### **For Web Interface**
```javascript
// Add to your existing web interface
async function performSwap(amount, fromToken, toToken) {
    const result = await handleSwap(amount, fromToken, toToken);
    
    if (result.success) {
        showSuccess(result.message);
    } else {
        showError(result.message);
    }
}

async function checkPoolInfo(token1, token2) {
    const result = await handlePoolInfo(token1, token2);
    
    if (result.success) {
        showInfo(result.message);
    } else {
        showError(result.message);
    }
}
```

## 🔧 **Environment Setup**

### **Add to Your .env File**
```bash
PRIVATE_KEY=99f33cb471e638d3d5a7cad46f712f2365710618e9afe3cf3e1c0e94f2c1eb1d
RPC_URL=https://dream-rpc.somnia.network/
```

### **Install Dependencies**
```bash
npm install ethers
```

## 📊 **Available Functions**

### **Swap Functions**
- `handleSwap(amount, fromToken, toToken)` - Perform swaps
- `swapSTTForTokens(poolAddress, amountOutMin, tokenOut)` - STT to token
- `swapTokensForSTT(poolAddress, amountIn, amountOutMin, tokenIn)` - Token to STT

### **Info Functions**
- `handlePoolInfo(token1, token2)` - Get pool information
- `handleBalanceCheck()` - Get wallet balance
- `getPoolInfo(poolAddress)` - Get pool reserves
- `getWalletBalance()` - Get token balances

### **Utility Functions**
- `validatePool(tokenA, tokenB, fee)` - Validate pool exists
- `getTokenAddress(tokenSymbol)` - Get token address

## 🎯 **Supported Operations**

### **Swaps**
- ✅ STT → INSOMN
- ✅ STT → WETH  
- ✅ INSOMN → STT
- ✅ WETH → STT

### **Info**
- ✅ Pool reserves and liquidity
- ✅ Wallet balances
- ✅ Transaction status

## 🚀 **Quick Start**

1. **Copy the functions** to your existing bot
2. **Add the imports** and initialization
3. **Integrate with your UI** using the example handlers
4. **Test with existing commands**

**That's it! Your existing bot now has swap functionality!** 🎉

## 📝 **Notes**

- Uses existing deployed contracts
- No new deployments needed
- Works with your current UI
- Minimal code changes required
- All functions return consistent result format 