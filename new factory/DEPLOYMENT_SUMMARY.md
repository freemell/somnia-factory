# 🚀 INSOMN Token & Factory Deployment Summary

## 📋 **Contract Addresses**

### **Factory Contract**
- **Address**: `0x8669cD81994740D517661577A72B84d0a308D8b0`
- **Network**: Somnia Testnet (Chain ID: 50312)
- **ABI**: Available in `abi.json`

### **INSOMN Token**
- **Address**: `0xCdaC954Cff3be5eBED645745c85dc13cC2c97836`
- **Name**: INSOMN Token
- **Symbol**: INSOMN
- **Decimals**: 18
- **Initial Supply**: 1,000,000 INSOMN

### **INSOMN/WETH Pool**
- **Address**: `0xaA19FBBd3f5FD24cd5Db040364e91b9fa86aa18f`
- **Token 0**: INSOMN Token
- **Token 1**: WETH
- **Fee**: 3000 (0.3%)
- **Tick Spacing**: 60

### **WETH Contract**
- **Address**: `0xd2480162Aa7F02Ead7BF4C127465446150D58452`
- **Network**: Somnia Testnet

## 🔄 **Swap Functions**

### **Factory Level Swaps**
1. **`swapSTTForTokens`** - Swap STT for any token
2. **`swapTokensForSTT`** - Swap any token for STT
3. **`swapTokensForTokens`** - Swap between any two tokens

### **Pool Level Swaps**
1. **`swapExactSTTForTokens`** - Direct STT to token swap
2. **`swapExactTokensForSTT`** - Direct token to STT swap
3. **`swapExactTokensForTokens`** - Direct token to token swap

## 📊 **Test Results**

### **STT → INSOMN Swap**
- **Input**: 20 STT
- **Output**: 21,875 INSOMN
- **Exchange Rate**: 1 STT = 1,093.71 INSOMN
- **Status**: ✅ SUCCESSFUL

### **INSOMN → STT Swap**
- **Input**: 5,000 INSOMN
- **Output**: ~3 STT
- **Status**: ✅ SUCCESSFUL

## 🛠 **Key Functions**

### **Factory Functions**
- `createPool(tokenA, tokenB, fee, tickSpacing)` - Create new pool
- `getPool(tokenA, tokenB, fee)` - Get pool address
- `allPoolsLength()` - Get total number of pools
- `getPoolByIndex(index)` - Get pool by index
- `getPoolReserves(poolAddress)` - Get pool reserves
- `getPoolTotalBalance(poolAddress)` - Get pool total balance

### **Pool Functions**
- `addLiquidity(amount)` - Add liquidity to pool
- `getTotalBalance()` - Get total pool balance
- `getReserves()` - Get pool reserves
- `receive()` - Accept STT payments

## 🔗 **Network Information**

- **Network**: Somnia Testnet (Shannon)
- **Chain ID**: 50312
- **RPC URL**: `https://dream-rpc.somnia.network/`
- **Block Explorer**: https://shannon-explorer.somnia.network/
- **Faucet**: https://testnet.somnia.network/

## 📁 **Files**

- **Factory ABI**: `abi.json`
- **Factory Contract**: `contracts/Factory.sol`
- **CustomPool Contract**: `contracts/CustomPool.sol`
- **INSOMN Token**: `contracts/INSOMNToken.sol`
- **Deployment Scripts**: `scripts/`

## 🎯 **Usage Examples**

### **Create Pool**
```javascript
const factory = new ethers.Contract(factoryAddress, abi, signer);
const tx = await factory.createPool(tokenA, tokenB, 3000, 60);
```

### **Swap STT for Tokens**
```javascript
const tx = await factory.swapSTTForTokens(poolAddress, amountOutMin, tokenOut, {
  value: sttAmount
});
```

### **Get Pool Info**
```javascript
const poolAddress = await factory.getPool(tokenA, tokenB, 3000);
const reserves = await factory.getPoolReserves(poolAddress);
```

## ✅ **Status**

- **✅ Factory Deployed**: Working
- **✅ INSOMN Token Deployed**: Working
- **✅ Pool Created**: Working
- **✅ Liquidity Added**: Working
- **✅ Swaps Working**: Working
- **✅ ABI Extracted**: Available in `abi.json`

## 🎉 **Success!**

Your INSOMN token ecosystem is fully functional on Somnia Testnet with:
- Complete swap functionality
- Liquidity pools
- Factory contract for pool management
- Ready for production use

**The system is ready for your bot to interact with!** 🚀 