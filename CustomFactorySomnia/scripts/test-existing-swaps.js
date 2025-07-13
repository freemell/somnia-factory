const { ethers } = require("hardhat");
const { parseUnits, formatUnits } = require("ethers");
require("dotenv").config();

// DEX addresses for Somnia testnet
const ROUTER_ADDRESS = "0xE94de02e52Eaf9F0f6Bf7f16E4927FcBc2c09bC7";
const FACTORY_ADDRESS = "0x0BFaCE9a5c9F884a4f09fadB83b69e81EA41424B";

// Some common token addresses on Somnia testnet (you can replace these with known tokens)
const KNOWN_TOKENS = [
  "0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7", // WNativeToken
  "0x792C721fe2ed8004378A818a32623035b2588325", // Your TokenA
  "0xD3A6d61dCC7752b0c73F8f5D415F89E82dD80DFd"  // Your TokenB
];

// Basic ABIs
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function name() view returns (string)"
];

const ROUTER_ABI = [
  "function exactInputSingle((address,address,address,address,uint256,uint256,uint256,uint160)) external returns (uint256)",
  "function WNativeToken() external view returns (address)",
  "function factory() external view returns (address)"
];

const FACTORY_ABI = [
  "function getPool(address, address, uint24) external view returns (address)"
];

async function main() {
  console.log("🔍 Testing Existing Swaps on Somnia DEX\n");
  
  const [signer] = await ethers.getSigners();
  console.log("👤 Testing with address:", signer.address);
  
  // Initialize contracts
  const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, signer);
  const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);
  
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
  
  // Check token balances
  for (const tokenAddress of KNOWN_TOKENS) {
    try {
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      const balance = await token.balanceOf(signer.address);
      const symbol = await token.symbol();
      const name = await token.name();
      console.log(`${symbol} (${name}): ${formatUnits(balance, 18)}`);
    } catch (error) {
      console.log(`Token ${tokenAddress.slice(0, 10)}...: Error getting info`);
    }
  }
  
  console.log("\n🔍 Scanning for Available Pools:");
  
  // Scan for pools between known tokens
  const availablePools = [];
  
  for (let i = 0; i < KNOWN_TOKENS.length; i++) {
    for (let j = i + 1; j < KNOWN_TOKENS.length; j++) {
      const tokenA = KNOWN_TOKENS[i];
      const tokenB = KNOWN_TOKENS[j];
      
      const poolInfo = await findPool(factory, tokenA, tokenB);
      if (poolInfo) {
        availablePools.push({
          tokenA,
          tokenB,
          pool: poolInfo.pool,
          fee: poolInfo.fee
        });
      }
    }
  }
  
  if (availablePools.length === 0) {
    console.log("❌ No pools found with known tokens");
    console.log("\n💡 Suggestions:");
    console.log("1. Check if there are other tokens with liquidity on Somnia DEX");
    console.log("2. Try creating pools manually through the DEX interface");
    console.log("3. Check if the DEX is fully operational on testnet");
    return;
  }
  
  console.log(`\n✅ Found ${availablePools.length} available pools:`);
  for (const pool of availablePools) {
    console.log(`  - ${pool.tokenA.slice(0, 10)}... ↔️ ${pool.tokenB.slice(0, 10)}... (Fee: ${pool.fee})`);
  }
  
  // Test swaps with available pools
  console.log("\n🔄 Testing Swaps:");
  
  for (const pool of availablePools) {
    await testSwapWithPool(router, pool, signer);
  }
  
  console.log("\n✅ Testing completed!");
}

async function findPool(factory, tokenA, tokenB) {
  const feeTiers = [500, 3000, 10000];
  
  for (const fee of feeTiers) {
    try {
      const pool = await factory.getPool(tokenA, tokenB, fee);
      if (pool && pool !== ethers.ZeroAddress) {
        return { pool, fee };
      }
    } catch (error) {
      // Continue to next fee tier
    }
  }
  
  return null;
}

async function testSwapWithPool(router, poolInfo, signer) {
  try {
    console.log(`\n🔄 Testing swap: ${poolInfo.tokenA.slice(0, 10)}... ↔️ ${poolInfo.tokenB.slice(0, 10)}...`);
    
    const tokenA = new ethers.Contract(poolInfo.tokenA, ERC20_ABI, signer);
    const tokenB = new ethers.Contract(poolInfo.tokenB, ERC20_ABI, signer);
    
    // Check balances
    const balanceA = await tokenA.balanceOf(signer.address);
    const balanceB = await tokenB.balanceOf(signer.address);
    
    console.log(`  Balance A: ${formatUnits(balanceA, 18)}`);
    console.log(`  Balance B: ${formatUnits(balanceB, 18)}`);
    
    // Determine which token to swap from (the one with more balance)
    let tokenIn, tokenOut, amountIn;
    
    if (balanceA > balanceB && balanceA > parseUnits("1", 18)) {
      tokenIn = poolInfo.tokenA;
      tokenOut = poolInfo.tokenB;
      amountIn = parseUnits("1", 18); // Swap 1 token
      console.log("  📤 Swapping from Token A to Token B");
    } else if (balanceB > parseUnits("1", 18)) {
      tokenIn = poolInfo.tokenB;
      tokenOut = poolInfo.tokenA;
      amountIn = parseUnits("1", 18); // Swap 1 token
      console.log("  📤 Swapping from Token B to Token A");
    } else {
      console.log("  ❌ Insufficient balance for swap");
      return;
    }
    
    // Check if it's a native token swap
    const wNativeAddress = await router.WNativeToken();
    const isNativeSwap = tokenIn === wNativeAddress || tokenOut === wNativeAddress;
    
    if (isNativeSwap) {
      // Handle native token swap
      const sttBalance = await ethers.provider.getBalance(signer.address);
      if (sttBalance < amountIn) {
        console.log("  ❌ Insufficient STT for swap");
        return;
      }
      
      const params = {
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        deployer: FACTORY_ADDRESS,
        recipient: signer.address,
        deadline: Math.floor(Date.now() / 1000) + 300,
        amountIn: amountIn,
        amountOutMinimum: 0,
        limitSqrtPrice: 0
      };
      
      console.log("  ⏳ Executing native swap...");
      const tx = await router.exactInputSingle(params, {
        value: amountIn,
        gasLimit: 500000
      });
      
      console.log(`  📝 Swap tx: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`  ✅ Swap successful! Block: ${receipt.blockNumber}`);
      
    } else {
      // Handle ERC20 to ERC20 swap
      const tokenContract = new ethers.Contract(tokenIn, ERC20_ABI, signer);
      
      // Approve router
      console.log("  🔐 Approving router...");
      const approveTx = await tokenContract.approve(router.address, amountIn);
      await approveTx.wait();
      
      const params = {
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        deployer: FACTORY_ADDRESS,
        recipient: signer.address,
        deadline: Math.floor(Date.now() / 1000) + 300,
        amountIn: amountIn,
        amountOutMinimum: 0,
        limitSqrtPrice: 0
      };
      
      console.log("  ⏳ Executing token swap...");
      const tx = await router.exactInputSingle(params, {
        gasLimit: 500000
      });
      
      console.log(`  📝 Swap tx: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`  ✅ Swap successful! Block: ${receipt.blockNumber}`);
    }
    
  } catch (error) {
    console.log(`  ❌ Swap failed: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }); 