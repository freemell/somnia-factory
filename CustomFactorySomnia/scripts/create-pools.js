const { ethers } = require("hardhat");
const { parseUnits, formatUnits } = require("ethers");
require("dotenv").config();

// Your deployed token addresses
const TOKEN_A = "0x792C721fe2ed8004378A818a32623035b2588325";
const TOKEN_B = "0xD3A6d61dCC7752b0c73F8f5D415F89E82dD80DFd";

// DEX addresses for Somnia testnet
const ROUTER_ADDRESS = "0xE94de02e52Eaf9F0f6Bf7f16E4927FcBc2c09bC7";
const FACTORY_ADDRESS = "0x0BFaCE9a5c9F884a4f09fadB83b69e81EA41424B";

// Basic ABIs
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function transfer(address, uint256) returns (bool)"
];

const ROUTER_ABI = [
  "function exactInputSingle((address,address,address,address,uint256,uint256,uint256,uint160)) external returns (uint256)",
  "function WNativeToken() external view returns (address)",
  "function exactInput((bytes,address,uint256,uint256,uint256)) external returns (uint256)"
];

const FACTORY_ABI = [
  "function getPool(address, address, uint24) external view returns (address)",
  "function createPool(address, address, uint24) external returns (address)"
];

async function main() {
  console.log("🏊 Creating Liquidity Pools for Your Tokens\n");
  
  const [signer] = await ethers.getSigners();
  console.log("👤 Using address:", signer.address);
  
  // Initialize contracts
  const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, signer);
  const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);
  const tokenA = new ethers.Contract(TOKEN_A, ERC20_ABI, signer);
  const tokenB = new ethers.Contract(TOKEN_B, ERC20_ABI, signer);
  
  // Get WNativeToken address
  let wNativeAddress;
  try {
    wNativeAddress = await router.WNativeToken();
    console.log("🌊 WNativeToken:", wNativeAddress);
  } catch (error) {
    console.log("⚠️  Using default WETH address");
    wNativeAddress = "0x4200000000000000000000000000000000000006";
  }
  
  console.log("\n📊 Current Balances:");
  const sttBalance = await ethers.provider.getBalance(signer.address);
  console.log(`STT: ${formatUnits(sttBalance, 18)}`);
  
  try {
    const tokenABalance = await tokenA.balanceOf(signer.address);
    const tokenASymbol = await tokenA.symbol();
    console.log(`${tokenASymbol}: ${formatUnits(tokenABalance, 18)}`);
  } catch (error) {
    console.log("TokenA: Error getting balance");
  }
  
  try {
    const tokenBBalance = await tokenB.balanceOf(signer.address);
    const tokenBSymbol = await tokenB.symbol();
    console.log(`${tokenBSymbol}: ${formatUnits(tokenBBalance, 18)}`);
  } catch (error) {
    console.log("TokenB: Error getting balance");
  }
  
  console.log("\n🔍 Checking Existing Pools:");
  
  // Check existing pools
  await checkPool(factory, wNativeAddress, TOKEN_A, "STT ↔ TokenA");
  await checkPool(factory, wNativeAddress, TOKEN_B, "STT ↔ TokenB");
  await checkPool(factory, TOKEN_A, TOKEN_B, "TokenA ↔ TokenB");
  
  console.log("\n🏗️  Creating Pools (if they don't exist):");
  
  // Create pools with different fee tiers
  const feeTiers = [3000]; // Start with 0.3% fee
  
  for (const fee of feeTiers) {
    console.log(`\n📝 Creating pools with ${fee/10000}% fee:`);
    
    // Create STT ↔ TokenA pool
    await createPool(factory, wNativeAddress, TOKEN_A, fee, "STT ↔ TokenA");
    
    // Create STT ↔ TokenB pool
    await createPool(factory, wNativeAddress, TOKEN_B, fee, "STT ↔ TokenB");
    
    // Create TokenA ↔ TokenB pool
    await createPool(factory, TOKEN_A, TOKEN_B, fee, "TokenA ↔ TokenB");
  }
  
  console.log("\n✅ Pool creation completed!");
}

async function checkPool(factory, tokenA, tokenB, pairName) {
  const feeTiers = [500, 3000, 10000];
  
  for (const fee of feeTiers) {
    try {
      const pool = await factory.getPool(tokenA, tokenB, fee);
      if (pool && pool !== ethers.ZeroAddress) {
        console.log(`  ✅ ${pairName}: Pool exists with fee ${fee} (${fee/10000}%)`);
        return { pool, fee };
      }
    } catch (error) {
      // Continue to next fee tier
    }
  }
  
  console.log(`  ❌ ${pairName}: No pool found`);
  return null;
}

async function createPool(factory, tokenA, tokenB, fee, pairName) {
  try {
    // Check if pool already exists
    const existingPool = await factory.getPool(tokenA, tokenB, fee);
    if (existingPool && existingPool !== ethers.ZeroAddress) {
      console.log(`  ⏭️  ${pairName}: Pool already exists with fee ${fee}`);
      return existingPool;
    }
    
    console.log(`  🏗️  Creating ${pairName} pool with fee ${fee}...`);
    
    // Create the pool
    const tx = await factory.createPool(tokenA, tokenB, fee, {
      gasLimit: 1000000
    });
    
    console.log(`  ⏳ Pool creation tx: ${tx.hash}`);
    const receipt = await tx.wait();
    
    // Get the pool address from the event
    const poolCreatedEvent = receipt.logs.find(log => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed.name === "PoolCreated";
      } catch {
        return false;
      }
    });
    
    if (poolCreatedEvent) {
      const parsed = factory.interface.parseLog(poolCreatedEvent);
      const poolAddress = parsed.args.pool;
      console.log(`  ✅ ${pairName}: Pool created at ${poolAddress}`);
      return poolAddress;
    } else {
      console.log(`  ✅ ${pairName}: Pool created (address not found in logs)`);
    }
    
  } catch (error) {
    console.log(`  ❌ ${pairName}: Failed to create pool - ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }); 