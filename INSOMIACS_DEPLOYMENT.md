# Insomiacs Token & Pool Deployment Guide (Somnia Testnet)

## Overview
This guide walks you through deploying the Insomiacs ERC-20 token, creating an INSOM/STT pool, and adding liquidity on the Somnia Testnet using Hardhat, Algebra V3, and QuickSwap.

---

## Prerequisites
- Node.js & npm installed
- Hardhat project set up
- The following dependencies:
  - `@openzeppelin/contracts@5.3.0`
  - `@cryptoalgebra/integral-core@1.2.8`
  - `@nomicfoundation/hardhat-ethers`
  - `hardhat`
- A funded testnet wallet (see faucet info below)

---

## Key Addresses
- **Deployer/Owner:** `0x14FD085974c62315fd5a02Eb6DB3ba950644B70b`
- **Private Key:** `e0ca98f46499e6813ace8282687dc6c36aa026356f02bb922ab763cd0ed4dd75`
- **Somnia Testnet RPC:** `https://dream-rpc.somnia.network`
- **Chain ID:** `50312`
- **STT Token:** `0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7`
- **CustomFactory:** `0x0C2bBdd5C86C874BB37120121468D2ba9726FAd7`
- **NonfungiblePositionManager:** `0x37A4950b4ea0C46596404895c5027B088B0e70e7`
- **QuickSwap Router:** `0xE94de02e52Eaf9F0f6Bf7f16E4927FcBc2c09bC7`

---

## 1. Install Dependencies
```bash
npm install --save-dev @openzeppelin/contracts@5.3.0 @cryptoalgebra/integral-core@1.2.8 @nomicfoundation/hardhat-ethers hardhat
```

---

## 2. Configure Environment
Create a `.env` file in your project root:
```
PRIVATE_KEY=e0ca98f46499e6813ace8282687dc6c36aa026356f02bb922ab763cd0ed4dd75
RPC_URL=https://dream-rpc.somnia.network
```

---

## 3. Compile Contracts
```bash
npx hardhat compile
```

---

## 4. Deploy Insomiacs Token & Create Pool
```bash
npx hardhat run scripts/deploy-insomiacs.js --network somnia
```
- This script will:
  - Deploy the Insomiacs token to the specified owner
  - Create the INSOM/STT pool using CustomFactory
  - Approve and add liquidity (100 INSOM + 100 STT)
  - Save deployment info to `deployment-insomiacs.json`

---

## 5. Run Tests
```bash
npx hardhat test test/CustomFactory.js --network somnia
```
- Verifies pool creation and correct addresses.

---

## 6. Test Swaps (Optional)
If you have a swap script (e.g., `simple-swap-test.js`):
```bash
npx hardhat run scripts/simple-swap-test.js --network somnia
```

---

## 7. Verify Contracts
- Use [Shannon Explorer](https://shannon-explorer.somnia.network/) to verify contract addresses and transactions.
- You can verify source code if needed via the explorer’s contract verification UI.

---

## 8. Get Testnet STT
- Visit [testnet.somnia.network](https://testnet.somnia.network/) and request STT for your wallet address.

---

## Troubleshooting
- **Out of gas:** Ensure your wallet has enough testnet ETH for gas.
- **Pool not found:** Double-check addresses and fee tier (should be 3000 for 0.3%).
- **Token not visible:** Add the INSOM token address to your wallet.
- **Explorer not updating:** Wait a few minutes or refresh.
- **Contract verification fails:** Ensure you use the correct Solidity version and constructor arguments.

---

## Useful Links
- [Shannon Explorer](https://shannon-explorer.somnia.network/)
- [QuickSwap Somnia Testnet](https://quickswap.exchange/)
- [Somnia Testnet Faucet](https://testnet.somnia.network/)

---

## Contact
For help, reach out to the Somnia or QuickSwap communities. 