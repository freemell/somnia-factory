# Configure and Add Liquidity to INSOM/STT Pool on Somnia Testnet

## 1. Prerequisites
- Node.js and npm installed
- Hardhat project set up
- Wallet: 0x35DaDAb2bb21A6d4e20beC3F603B8426Dc124004 (owner of CustomFactory)

## 2. Check Wallet Balance
- Visit [Shannon Explorer](https://shannon-explorer.somnia.network/) and search for your wallet address to ensure you have enough STT and INSOM.

## 3. Install Dependencies
```
npm install @openzeppelin/contracts@5.3.0 @cryptoalgebra/integral-core@1.2.8 @nomicfoundation/hardhat-ethers hardhat dotenv
```

## 4. Compile Contracts
```
npx hardhat compile
```

## 5. Configure and Add Liquidity
- Update your `.env` with:
  ```
  PRIVATE_KEY=6db2f8420a8388c0fe02f021c5ce1c1b5aa7e18fb8a2c57eb6f2092d4822d92d
  RPC_URL=https://dream-rpc.somnia.network
  ```
- Run the script:
  ```
  npx hardhat run scripts/configure-and-add-liquidity.js --network somnia
  ```
- This will:
  - Ensure CustomPoolDeployer is configured
  - Create the INSOM/STT pool if needed
  - Approve tokens
  - Add liquidity
  - Save results to `configure-and-add-liquidity.json`

## 6. Verify on Explorer
- [Shannon Explorer](https://shannon-explorer.somnia.network/)
- [QuickSwap Somnia Testnet](https://quickswap.exchange/)

## 7. Troubleshooting
- **Bytecode not set:** Only the owner can set pool bytecode. Use the provided script.
- **Factory not linked:** Only the owner can link the factory. Use the script.
- **Not enough tokens:** Use the faucet or mint more tokens to your wallet.
- **Contract errors:** Ensure your `.env` is set and dependencies are installed.
- **Explorer not showing updates:** Wait a few minutes or refresh.

## 8. Useful Addresses
- **CustomFactory:** 0x0C2bBdd5C86C874BB37120121468D2ba9726FAd7
- **NonfungiblePositionManager:** 0x37A4950b4ea0C46596404895c5027B088B0e70e7
- **QuickSwap Router:** 0xE94de02e52Eaf9F0f6Bf7f16E4927FcBc2c09bC7
- **STT Token:** 0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7
- **INSOM Token:** 0x0c726e446865ffB19Cc13F21abf0f515106c9662

## 9. Run Tests
```
npx hardhat test test/CustomFactory.js --network somnia
```

## 10. Test Swaps
- Use `simple-swap-test.js` to test swaps with the new pool.

---
For more help, check the README or contact the Somnia Testnet community. 