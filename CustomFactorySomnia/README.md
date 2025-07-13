# CustomFactorySomnia DEX Factory (Somnia Testnet)

## Overview
A production-grade Uniswap V3-style DEX factory and pool system for the Somnia Testnet, compatible with QuickSwap’s SwapRouter and NonfungiblePositionManager.

## Compile
```
npx hardhat compile
```

## Deploy
```
npx hardhat run scripts/deploy-algebra.js --network somniaTestnet
```

## Test
```
npx hardhat test --network somniaTestnet
```

## .env Example (UTF-8, no BOM)
```
DEX_FACTORY_ADDRESS=[YourCustomFactoryAddress]
DEX_ROUTER=0xE94de02e52Eaf9F0f6Bf7f16E4927FcBc2c09bC7
POSITION_MANAGER=0x37A4950b4ea0C46596404895c5027B088B0e70e7
RPC_URL=https://dream-rpc.somnia.network
DEX_ABI_PATH=./utils/abi.json
WALLET_ADDRESS=0x35DaDAb2bb21A6d4e20beC3F603B8426Dc124004
WALLET_PRIVATE_KEY=[YourPrivateKey]
```
- Ensure .env is saved as UTF-8 (no BOM). In PowerShell: `Set-Content -Encoding UTF8 .env`.
- If PowerShell fails, use Git Bash or WSL.

## Bot Integration
- Update `utils/abi.json` with CustomFactory and AlgebraPool ABIs.
- Update `utils/dex.js` to check fee tiers, create/init pool if none exists, and use the correct wallet.
- Test via Telegram bot (swap 0.1 STT).

## Debug Tips
- **Reverts:** Check contract permissions, fee tiers, and pool existence.
- **Gas issues:** Increase gas limit in deployment script if needed.
- **QuickSwap permissions:** Ensure factory and pools are compatible; contact developers@somnia.network if issues persist.
- **Wallet:** Ensure it has STT from [testnet.somnia.network](https://testnet.somnia.network).

## Notes
- Uses Algebra V3 pool bytecode for SwapRouter compatibility.
- Pool initialization: use `sqrtPriceX96 = 2**96` (price = 1:1).
- Treat as a production project: robust, secure, and well-documented.
