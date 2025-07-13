# Swap Testing for CustomFactorySomnia Tokens

## 🎯 Overview

This project contains comprehensive swap testing scripts for your deployed tokens on the Somnia testnet. Your tokens are successfully deployed and ready for testing, but require liquidity pools to be created first.

## 📊 Token Information

- **TokenA (TTA)**: `0x792C721fe2ed8004378A818a32623035b2588325`
- **TokenB (TTB)**: `0xD3A6d61dCC7752b0c73F8f5D415F89E82dD80DFd`
- **WNativeToken**: `0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7`
- **DEX Router**: `0xE94de02e52Eaf9F0f6Bf7f16E4927FcBc2c09bC7`
- **DEX Factory**: `0x0BFaCE9a5c9F884a4f09fadB83b69e81EA41424B`

## 🚀 Current Status

✅ **Tokens Deployed**: Both tokens are successfully deployed and you have balances
✅ **Scripts Ready**: All swap testing scripts are prepared
❌ **Pools Missing**: No liquidity pools exist yet (this prevents swaps)

## 📁 Available Scripts

### 1. `scripts/swap-summary.js`
**Purpose**: Provides a complete overview of your deployment status and next steps
```bash
npx hardhat run scripts/swap-summary.js --network somniaTestnet
```

### 2. `scripts/simple-swap-test.js`
**Purpose**: Simple swap testing with your specific tokens
```bash
npx hardhat run scripts/simple-swap-test.js --network somniaTestnet
```

### 3. `scripts/test-swap.js`
**Purpose**: Comprehensive swap testing with multiple scenarios
```bash
npx hardhat run scripts/test-swap.js --network somniaTestnet
```

### 4. `scripts/setup-and-test-swaps.js`
**Purpose**: Attempts to create pools and test swaps
```bash
npx hardhat run scripts/setup-and-test-swaps.js --network somniaTestnet
```

### 5. `scripts/create-pools.js`
**Purpose**: Attempts to create liquidity pools
```bash
npx hardhat run scripts/create-pools.js --network somniaTestnet
```

## 🔧 Next Steps to Enable Swaps

### Step 1: Create Liquidity Pools

You need to create pools for these pairs:
- STT ↔ TTA
- STT ↔ TTB  
- TTA ↔ TTB

### Step 2: Manual Pool Creation

Since automatic pool creation is failing, use one of these methods:

#### Option A: Hardhat Console
```bash
npx hardhat console --network somniaTestnet
```

Then run these commands:
```javascript
const factory = await ethers.getContractAt('Factory', '0x0BFaCE9a5c9F884a4f09fadB83b69e81EA41424B');
await factory.createPool('0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7', '0x792C721fe2ed8004378A818a32623035b2588325', 3000);
await factory.createPool('0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7', '0xD3A6d61dCC7752b0c73F8f5D415F89E82dD80DFd', 3000);
await factory.createPool('0x792C721fe2ed8004378A818a32623035b2588325', '0xD3A6d61dCC7752b0c73F8f5D415F89E82dD80DFd', 3000);
```

#### Option B: Somnia DEX Interface
If available, use the DEX web interface to create pools manually.

### Step 3: Add Liquidity

After creating pools, add initial liquidity:
- Add STT and TTA to STT/TTA pool
- Add STT and TTB to STT/TTB pool  
- Add TTA and TTB to TTA/TTB pool

### Step 4: Test Swaps

Once pools are created and have liquidity, run any of the testing scripts:

```bash
# Simple test
npx hardhat run scripts/simple-swap-test.js --network somniaTestnet

# Comprehensive test
npx hardhat run scripts/test-swap.js --network somniaTestnet

# Setup and test
npx hardhat run scripts/setup-and-test-swaps.js --network somniaTestnet
```

## 🧪 What the Scripts Test

The swap testing scripts will attempt:

1. **STT → Token Swaps**: Swap STT for your tokens
2. **Token → STT Swaps**: Swap your tokens for STT
3. **Token → Token Swaps**: Swap between your tokens
4. **Balance Checks**: Verify balances before and after swaps
5. **Pool Validation**: Check if pools exist and have liquidity

## 🔍 Troubleshooting

### Pool Creation Fails
If `factory.createPool()` fails with "execution reverted":

1. **Check Permissions**: Ensure your account has permission to create pools
2. **Verify DEX Status**: Check if the DEX is fully operational on testnet
3. **Try Different Fees**: Test with fee tiers 500, 3000, or 10000
4. **Token Compatibility**: Verify tokens are compatible with the DEX

### Swap Fails
If swaps fail after pools are created:

1. **Check Liquidity**: Ensure pools have sufficient liquidity
2. **Verify Balances**: Check you have enough tokens to swap
3. **Gas Limits**: Increase gas limits if needed
4. **Slippage**: Adjust slippage tolerance if needed

## 📋 Environment Setup

Ensure your `.env` file contains:
```
PRIVATE_KEY=your_private_key_here
RPC_URL=https://dream-rpc.somnia.network/
```

## 🎯 Expected Results

Once pools are created and have liquidity, you should see:
- ✅ Pool creation successful
- ✅ Swap transactions executed
- ✅ Balance changes confirmed
- ✅ Transaction hashes and block numbers

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify your network connection to Somnia testnet
3. Ensure you have sufficient STT for gas fees
4. Try different fee tiers for pool creation

---

**Status**: 🟡 Ready for pool creation and swap testing
**Next Action**: Create liquidity pools manually 