const { ethers } = require("hardhat");
const { parseUnits, formatUnits } = require("ethers");
require("dotenv").config();

// Target token address
const TARGET_TOKEN = "0xd2480162Aa7F02Ead7BF4C127465446150D58452";

// DEX addresses for Somnia testnet
const ROUTER_ADDRESS = "0xE94de02e52Eaf9F0f6Bf7f16E4927FcBc2c09bC7";
const FACTORY_ADDRESS = "0x0BFaCE9a5c9F884a4f09fadB83b69e81EA41424B";

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
  console.log("🔄 Testing STT to Token Swap\n");
  console.log("=" .repeat(50));
  
  const [signer] = await ethers.getSigners();
  console.log("👤 Testing with address:", signer.address);
  console.log("🎯 Target token:", TARGET_TOKEN);
  
  // Initialize contracts
  const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, signer);
  const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);
  const targetToken = new ethers.Contract(TARGET_TOKEN, ERC20_ABI, signer);
  
  // Get WNativeToken address
  let wNativeAddress;
  try {
    wNativeAddress = await router.WNativeToken();
    console.log("🌊 WNativeToken:", wNativeAddress);
  } catch (error) {
    console.log("⚠️  Using default WETH address");
    wNativeAddress = "0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7";
  }
  
  console.log("\n📊 Current Balances:");
  const sttBalance = await ethers.provider.getBalance(signer.address);
  console.log(`STT: ${formatUnits(sttBalance, 18)}`);
  
  try {
    const tokenBalance = await targetToken.balanceOf(signer.address);
    const tokenSymbol = await targetToken.symbol();
    const tokenName = await targetToken.name();
    console.log(`${tokenSymbol} (${tokenName}): ${formatUnits(tokenBalance, 18)}`);
  } catch (error) {
    console.log(`Target Token: Error getting info - ${error.message}`);
  }
  
  console.log("\n🔍 Step 1: Checking Pool Existence");
  const poolInfo = await findPool(factory, wNativeAddress, TARGET_TOKEN);
  
  if (!poolInfo) {
    console.log("❌ No pool found for STT ↔ Target Token");
    console.log("\n💡 Pool Creation Options:");
    console.log("1. Try creating pool manually:");
    console.log("   npx hardhat console --network somniaTestnet");
    console.log("   const factory = await ethers.getContractAt('Factory', '0x0BFaCE9a5c9F884a4f09fadB83b69e81EA41424B');");
    console.log(`   await factory.createPool('${wNativeAddress}', '${TARGET_TOKEN}', 3000);`);
    console.log("\n2. Check if the token is compatible with the DEX");
    console.log("3. Verify the token address is correct");
    return;
  }
  
  console.log(`✅ Pool found with fee ${poolInfo.fee} (${poolInfo.fee/10000}%)`);
  console.log(`📍 Pool address: ${poolInfo.pool}`);
  
  console.log("\n🔄 Step 2: Testing STT to Token Swap");
  await testSTTToTokenSwap(router, wNativeAddress, TARGET_TOKEN, signer, poolInfo.fee);
  
  console.log("\n✅ Test completed!");
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

async function testSTTToTokenSwap(router, wNativeAddress, tokenAddress, signer, fee) {
  try {
    console.log(`  💰 Testing swap with ${fee/10000}% fee...`);
    
    // Test with a small amount first
    const amountIn = parseUnits("0.001", 18); // 0.001 STT
    const sttBalance = await ethers.provider.getBalance(signer.address);
    
    console.log(`  📊 STT Balance: ${formatUnits(sttBalance, 18)}`);
    console.log(`  💸 Swap Amount: ${formatUnits(amountIn, 18)} STT`);
    
    if (sttBalance < amountIn) {
      console.log(`  ❌ Insufficient STT. Have: ${formatUnits(sttBalance, 18)}, Need: 0.001`);
      return;
    }
    
    // Get initial token balance
    const targetToken = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    let initialTokenBalance;
    try {
      initialTokenBalance = await targetToken.balanceOf(signer.address);
      console.log(`  📊 Initial token balance: ${formatUnits(initialTokenBalance, 18)}`);
    } catch (error) {
      console.log(`  ⚠️  Could not get initial token balance: ${error.message}`);
    }
    
    // Prepare swap parameters
    const params = {
      tokenIn: wNativeAddress,
      tokenOut: tokenAddress,
      deployer: FACTORY_ADDRESS,
      recipient: signer.address,
      deadline: Math.floor(Date.now() / 1000) + 300, // 5 minutes
      amountIn: amountIn,
      amountOutMinimum: 0, // No slippage protection for testing
      limitSqrtPrice: 0
    };
    
    console.log("  📝 Swap parameters:", {
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: formatUnits(params.amountIn, 18),
      recipient: params.recipient
    });
    
    console.log("  ⏳ Executing STT swap...");
    const tx = await router.exactInputSingle(params, {
      value: amountIn, // Send STT with the transaction
      gasLimit: 500000
    });
    
    console.log(`  📝 Swap tx: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`  ✅ Swap successful! Block: ${receipt.blockNumber}`);
    
    // Check new token balance
    try {
      const newTokenBalance = await targetToken.balanceOf(signer.address);
      const tokenSymbol = await targetToken.symbol();
      console.log(`  💎 New ${tokenSymbol} balance: ${formatUnits(newTokenBalance, 18)}`);
      
      if (initialTokenBalance) {
        const tokensReceived = newTokenBalance - initialTokenBalance;
        console.log(`  🎉 Tokens received: ${formatUnits(tokensReceived, 18)} ${tokenSymbol}`);
      }
    } catch (error) {
      console.log(`  ⚠️  Could not get new token balance: ${error.message}`);
    }
    
    // Check new STT balance
    const newSTTBalance = await ethers.provider.getBalance(signer.address);
    console.log(`  💰 New STT balance: ${formatUnits(newSTTBalance, 18)}`);
    
  } catch (error) {
    console.log(`  ❌ Swap failed: ${error.message}`);
    
    // Provide helpful error information
    if (error.message.includes("INSUFFICIENT_OUTPUT_AMOUNT")) {
      console.log("  💡 This usually means insufficient liquidity in the pool");
    } else if (error.message.includes("EXCESSIVE_INPUT_AMOUNT")) {
      console.log("  💡 This usually means the swap amount is too large");
    } else if (error.message.includes("EXPIRED")) {
      console.log("  💡 Transaction deadline expired, try again");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }); 