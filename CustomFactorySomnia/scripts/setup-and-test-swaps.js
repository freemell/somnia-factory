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
  "function name() view returns (string)",
  "function transfer(address, uint256) returns (bool)"
];

const ROUTER_ABI = [
  "function exactInputSingle((address,address,address,address,uint256,uint256,uint256,uint160)) external returns (uint256)",
  "function WNativeToken() external view returns (address)",
  "function factory() external view returns (address)",
  "function exactInput((bytes,address,uint256,uint256,uint256)) external returns (uint256)"
];

const FACTORY_ABI = [
  "function getPool(address, address, uint24) external view returns (address)",
  "function createPool(address, address, uint24) external returns (address)"
];

async function main() {
  console.log("🚀 Setting Up and Testing Swaps for Your Tokens\n");
  
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
  
  console.log("\n🔍 Step 1: Checking Existing Pools");
  await checkAllPools(factory, wNativeAddress);
  
  console.log("\n🏗️  Step 2: Attempting to Create Pools");
  await attemptCreatePools(factory, wNativeAddress);
  
  console.log("\n💡 Step 3: Manual Pool Creation Instructions");
  printManualInstructions(wNativeAddress);
  
  console.log("\n🔄 Step 4: Testing Swaps (if pools exist)");
  await testSwapsIfPoolsExist(router, factory, wNativeAddress, signer);
  
  console.log("\n✅ Setup and testing completed!");
}

async function checkAllPools(factory, wNativeAddress) {
  const pairs = [
    { tokenA: wNativeAddress, tokenB: TOKEN_A, name: "STT ↔ TokenA" },
    { tokenA: wNativeAddress, tokenB: TOKEN_B, name: "STT ↔ TokenB" },
    { tokenA: TOKEN_A, tokenB: TOKEN_B, name: "TokenA ↔ TokenB" }
  ];
  
  for (const pair of pairs) {
    await checkPool(factory, pair.tokenA, pair.tokenB, pair.name);
  }
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

async function attemptCreatePools(factory, wNativeAddress) {
  const pairs = [
    { tokenA: wNativeAddress, tokenB: TOKEN_A, name: "STT ↔ TokenA" },
    { tokenA: wNativeAddress, tokenB: TOKEN_B, name: "STT ↔ TokenB" },
    { tokenA: TOKEN_A, tokenB: TOKEN_B, name: "TokenA ↔ TokenB" }
  ];
  
  const feeTiers = [3000]; // Try with 0.3% fee
  
  for (const fee of feeTiers) {
    console.log(`\n📝 Attempting to create pools with ${fee/10000}% fee:`);
    
    for (const pair of pairs) {
      try {
        // Check if pool already exists
        const existingPool = await factory.getPool(pair.tokenA, pair.tokenB, fee);
        if (existingPool && existingPool !== ethers.ZeroAddress) {
          console.log(`  ⏭️  ${pair.name}: Pool already exists`);
          continue;
        }
        
        console.log(`  🏗️  Creating ${pair.name} pool...`);
        
        const tx = await factory.createPool(pair.tokenA, pair.tokenB, fee, {
          gasLimit: 1000000
        });
        
        console.log(`  ⏳ Pool creation tx: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`  ✅ ${pair.name}: Pool created successfully!`);
        
      } catch (error) {
        console.log(`  ❌ ${pair.name}: Failed to create pool - ${error.message}`);
      }
    }
  }
}

function printManualInstructions(wNativeAddress) {
  console.log("\n📋 Manual Pool Creation Instructions:");
  console.log("Since automatic pool creation failed, you can create pools manually:");
  console.log("\n1. Visit the Somnia DEX interface (if available)");
  console.log("2. Navigate to 'Create Pool' or 'Add Liquidity'");
  console.log("3. Create the following pools:");
  console.log(`   - STT (${wNativeAddress}) ↔ TokenA (${TOKEN_A})`);
  console.log(`   - STT (${wNativeAddress}) ↔ TokenB (${TOKEN_B})`);
  console.log(`   - TokenA (${TOKEN_A}) ↔ TokenB (${TOKEN_B})`);
  console.log("\n4. Add initial liquidity to each pool");
  console.log("5. Run this script again to test swaps");
  
  console.log("\n🔧 Alternative: Use Hardhat Console");
  console.log("You can also try creating pools manually using Hardhat console:");
  console.log("npx hardhat console --network somniaTestnet");
  console.log("Then run the pool creation commands manually.");
}

async function testSwapsIfPoolsExist(router, factory, wNativeAddress, signer) {
  console.log("\n🔍 Checking for existing pools to test swaps...");
  
  const pairs = [
    { tokenA: wNativeAddress, tokenB: TOKEN_A, name: "STT ↔ TokenA" },
    { tokenA: wNativeAddress, tokenB: TOKEN_B, name: "STT ↔ TokenB" },
    { tokenA: TOKEN_A, tokenB: TOKEN_B, name: "TokenA ↔ TokenB" }
  ];
  
  let foundPools = false;
  
  for (const pair of pairs) {
    const poolInfo = await checkPool(factory, pair.tokenA, pair.tokenB, pair.name);
    if (poolInfo) {
      foundPools = true;
      console.log(`\n🔄 Testing swap for ${pair.name}:`);
      await testSwap(router, pair.tokenA, pair.tokenB, signer, poolInfo.fee);
    }
  }
  
  if (!foundPools) {
    console.log("\n❌ No pools found for testing swaps.");
    console.log("Please create pools manually first, then run this script again.");
  }
}

async function testSwap(router, tokenIn, tokenOut, signer, fee) {
  try {
    console.log(`  💰 Testing swap with ${fee/10000}% fee...`);
    
    const isNativeSwap = tokenIn === "0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7" || 
                        tokenOut === "0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7";
    
    if (isNativeSwap) {
      // Test STT swap
      const amountIn = parseUnits("0.001", 18); // Small amount for testing
      const sttBalance = await ethers.provider.getBalance(signer.address);
      
      if (sttBalance < amountIn) {
        console.log(`  ❌ Insufficient STT. Have: ${formatUnits(sttBalance, 18)}, Need: 0.001`);
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
      
      console.log("  ⏳ Executing STT swap...");
      const tx = await router.exactInputSingle(params, {
        value: amountIn,
        gasLimit: 500000
      });
      
      console.log(`  📝 Swap tx: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`  ✅ Swap successful! Block: ${receipt.blockNumber}`);
      
    } else {
      // Test token to token swap
      const tokenContract = new ethers.Contract(tokenIn, ERC20_ABI, signer);
      const amountIn = parseUnits("1", 18);
      const balance = await tokenContract.balanceOf(signer.address);
      
      if (balance < amountIn) {
        console.log(`  ❌ Insufficient tokens. Have: ${formatUnits(balance, 18)}, Need: 1`);
        return;
      }
      
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