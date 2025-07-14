# Add Liquidity to INSOM/STT Pool on Somnia Testnet

This guide explains how to add liquidity to the INSOM/STT pool using your Hardhat project, CustomFactory, and QuickSwap’s NonfungiblePositionManager on the Somnia Testnet.

---

## 1. Prerequisites

- Node.js and npm installed
- Hardhat project set up
- Wallet with STT and INSOM tokens (see below for testnet faucet)

---

## 2. Environment Setup

Update your `.env` file with:

```
PRIVATE_KEY=6db2f8420a8388c0fe02f021c5ce1c1b5aa7e18fb8a2c57eb6f2092d4822d92d
RPC_URL=https://dream-rpc.somnia.network
```

---

## 3. Install Dependencies

```
npm install @openzeppelin/contracts@5.3.0 @cryptoalgebra/integral-core@1.2.8 @nomicfoundation/hardhat-ethers hardhat dotenv
```

---

## 4. Compile Contracts

```
npx hardhat compile
```

---

## 5. Add Liquidity Script

Run the script to add liquidity to the INSOM/STT pool:

```
npx hardhat run scripts/add-liquidity-stt-insom.js --network somnia
```

- The script will:
  - Check your INSOM balance and mint if needed
  - Create the INSOM/STT pool if it does not exist
  - Approve tokens for the NonfungiblePositionManager
  - Add 100 INSOM and 100 STT as liquidity
  - Save results to `add-liquidity-stt-insom.json`

---

## 6. Verify on Explorer

- [Shannon Explorer](https://shannon-explorer.somnia.network/)
- [QuickSwap Somnia Testnet](https://quickswap.exchange/)

---

## 7. Get STT for Testing

- Request STT from the [Somnia Testnet Faucet](https://testnet.somnia.network/)

---

## 8. Troubleshooting

- **Insufficient STT/INSOM:** Use the faucet or mint more INSOM with the script.
- **Pool already exists:** The script will detect and use the existing pool.
- **Contract errors:** Ensure your `.env` is set and dependencies are installed.
- **Explorer not showing updates:** Wait a few minutes or refresh.

---

## 9. Useful Addresses

- **CustomFactory:** 0x0C2bBdd5C86C874BB37120121468D2ba9726FAd7
- **NonfungiblePositionManager:** 0x37A4950b4ea0C46596404895c5027B088B0e70e7
- **QuickSwap Router:** 0xE94de02e52Eaf9F0f6Bf7f16E4927FcBc2c09bC7
- **STT Token:** 0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7
- **INSOM Token:** (see deployment-insomiacs.json or script output)

---

## 10. Run Tests

```
npx hardhat test test/CustomFactory.js --network somnia
```

---

## 11. Support

- For more help, check the README or contact the Somnia Testnet community. 