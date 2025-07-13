const { ethers } = require("ethers");
const fs = require("fs");
require("dotenv").config();

const abi = JSON.parse(fs.readFileSync(process.env.DEX_ABI_PATH, "utf8"));
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, provider);

const factoryAddress = process.env.DEX_FACTORY_ADDRESS;
const factoryAbi = abi.CustomFactory;
const poolAbi = abi.AlgebraPool;
const factory = new ethers.Contract(factoryAddress, factoryAbi, wallet);

const FEE_TIERS = [100, 500, 3000, 10000];

async function validatePair(tokenA, tokenB) {
  for (const fee of FEE_TIERS) {
    const pool = await factory.getPool(tokenA, tokenB, fee);
    if (pool && pool !== ethers.ZeroAddress) {
      return { pool, fee };
    }
  }
  return null;
}

async function createAndInitPool(tokenA, tokenB, fee = 3000, sqrtPriceX96 = (1n << 96n)) {
  // Create pool if it doesn't exist
  let pool = await factory.getPool(tokenA, tokenB, fee);
  if (!pool || pool === ethers.ZeroAddress) {
    const tx = await factory.createPool(tokenA, tokenB, fee);
    await tx.wait();
    pool = await factory.getPool(tokenA, tokenB, fee);
  }
  // Initialize pool (if needed)
  const poolContract = new ethers.Contract(pool, poolAbi, wallet);
  try {
    const initialized = await poolContract.slot0();
    if (!initialized) {
      const tx = await poolContract.initialize(sqrtPriceX96);
      await tx.wait();
    }
  } catch (e) {
    // If initialize fails, log and continue
    console.error("Pool initialization error:", e);
  }
  return pool;
}

module.exports = { validatePair, createAndInitPool }; 