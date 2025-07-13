const { ethers } = require("hardhat");
const { parseUnits, formatUnits } = require("ethers");
require("dotenv").config();

// Token addresses from deployment
const TOKEN_A = "0x792C721fe2ed8004378A818a32623035b2588325";
const TOKEN_B = "0xD3A6d61dCC7752b0c73F8f5D415F89E82dD80DFd";

// DEX addresses (from main project)
const ALGEBRA_ROUTER = "0xE94de02e52Eaf9F0f6Bf7f16E4927FcBc2c09bC7";
const ALGEBRA_FACTORY = "0x0BFaCE9a5c9F884a4f09fadB83b69e81EA41424B";

// Default fee tier for Algebra V3 (0.3%)
const DEFAULT_FEE = 3000;

// Basic ERC20 ABI for token interactions
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

// Router ABI for swaps
const ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, address deployer, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 limitSqrtPrice)) external returns (uint256 amountOut)",
  "function exactInput((bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum)) external returns (uint256 amountOut)",
  "function WNativeToken() external view returns (address)",
  "function factory() external view returns (address)"
];

// Factory ABI for pool queries
const FACTORY_ABI = [
  "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"
];

async function main() {
  console.log("🚀 Starting Test Swap Script...\n");

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("👤 Signer address:", signer.address);
  console.log("💰 Signer balance:", formatUnits(await ethers.provider.getBalance(signer.address), 18), "STT\n");

  // Initialize contracts
  const router = new ethers.Contract(ALGEBRA_ROUTER, ROUTER_ABI, signer);
  const factory = new ethers.Contract(ALGEBRA_FACTORY, FACTORY_ABI, signer);
  const tokenA = new ethers.Contract(TOKEN_A, ERC20_ABI, signer);
  const tokenB = new ethers.Contract(TOKEN_B, ERC20_ABI, signer);

  // Get WNativeToken address
  let wNativeAddress;
  try {
    wNativeAddress = await router.WNativeToken();
    console.log("🌊 WNativeToken address:", wNativeAddress);
  } catch (error) {
    console.log("⚠️  Could not get WNativeToken address, using default...");
    wNativeAddress = "0x4200000000000000000000000000000000000006"; // Default WETH address
  }

  // Check token balances
  console.log("\n📊 Token Balances:");
  try {
    const tokenABalance = await tokenA.balanceOf(signer.address);
    const tokenBBalance = await tokenB.balanceOf(signer.address);
    const tokenASymbol = await tokenA.symbol();
    const tokenBSymbol = await tokenB.symbol();
    
    console.log(`${tokenASymbol}: ${formatUnits(tokenABalance, 18)}`);
    console.log(`${tokenBSymbol}: ${formatUnits(tokenBBalance, 18)}`);
  } catch (error) {
    console.log("⚠️  Could not get token balances:", error.message);
  }

  // Test 1: Check if pools exist
  console.log("\n🔍 Checking Pool Existence:");
  await checkPoolExistence(factory, TOKEN_A, TOKEN_B);
  await checkPoolExistence(factory, wNativeAddress, TOKEN_A);
  await checkPoolExistence(factory, wNativeAddress, TOKEN_B);

  // Test 2: Try to swap STT to TokenA (if pool exists)
  console.log("\n🔄 Test 1: Swap STT to TokenA");
  await testSwapSTTToToken(router, wNativeAddress, TOKEN_A, signer, "0.01"); // 0.01 STT

  // Test 3: Try to swap TokenA to TokenB (if pool exists)
  console.log("\n🔄 Test 2: Swap TokenA to TokenB");
  await testTokenToToken(router, TOKEN_A, TOKEN_B, signer, "1"); // 1 TokenA

  // Test 4: Try to swap TokenB to STT (if pool exists)
  console.log("\n🔄 Test 3: Swap TokenB to STT");
  await testTokenToSTT(router, TOKEN_B, wNativeAddress, signer, "1"); // 1 TokenB

  console.log("\n✅ Test Swap Script Completed!");
}

async function checkPoolExistence(factory, tokenA, tokenB) {
  try {
    const feeTiers = [500, 3000, 10000]; // 0.05%, 0.3%, 1%
    
    for (const fee of feeTiers) {
      try {
        const pool = await factory.getPool(tokenA, tokenB, fee);
        if (pool && pool !== ethers.ZeroAddress) {
          console.log(`✅ Pool found: ${tokenA.slice(0, 10)}... ↔️ ${tokenB.slice(0, 10)}... (Fee: ${fee})`);
          return { pool, fee };
        }
      } catch (error) {
        // Continue to next fee tier
      }
    }
    
    console.log(`❌ No pool found: ${tokenA.slice(0, 10)}... ↔️ ${tokenB.slice(0, 10)}...`);
    return null;
  } catch (error) {
    console.log(`❌ Error checking pool: ${error.message}`);
    return null;
  }
}

async function testSwapSTTToToken(router, wNativeAddress, tokenAddress, signer, amountSTT) {
  try {
    console.log(`  💰 Swapping ${amountSTT} STT to token...`);
    
    // Check if we have enough STT
    const sttBalance = await ethers.provider.getBalance(signer.address);
    const amountIn = parseUnits(amountSTT, 18);
    
    if (sttBalance < amountIn) {
      console.log(`  ❌ Insufficient STT balance. Have: ${formatUnits(sttBalance, 18)}, Need: ${amountSTT}`);
      return;
    }

    // Check if pool exists
    const factory = new ethers.Contract(ALGEBRA_FACTORY, FACTORY_ABI, signer);
    const poolInfo = await checkPoolExistence(factory, wNativeAddress, tokenAddress);
    
    if (!poolInfo) {
      console.log("  ❌ No pool exists for this pair");
      return;
    }

    // Prepare swap parameters
    const params = {
      tokenIn: wNativeAddress,
      tokenOut: tokenAddress,
      deployer: ALGEBRA_FACTORY,
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

    // Execute swap
    const tx = await router.exactInputSingle(params, {
      value: amountIn, // Send STT with the transaction
      gasLimit: 500000
    });

    console.log("  ⏳ Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("  ✅ Swap successful! Block:", receipt.blockNumber);

    // Check new balance
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const newBalance = await token.balanceOf(signer.address);
    console.log("  💎 New token balance:", formatUnits(newBalance, 18));

  } catch (error) {
    console.log("  ❌ Swap failed:", error.message);
  }
}

async function testTokenToToken(router, tokenInAddress, tokenOutAddress, signer, amount) {
  try {
    console.log(`  💰 Swapping ${amount} tokens...`);
    
    const tokenIn = new ethers.Contract(tokenInAddress, ERC20_ABI, signer);
    const tokenOut = new ethers.Contract(tokenOutAddress, ERC20_ABI, signer);
    
    // Check balance
    const balance = await tokenIn.balanceOf(signer.address);
    const amountIn = parseUnits(amount, 18);
    
    if (balance < amountIn) {
      console.log(`  ❌ Insufficient token balance. Have: ${formatUnits(balance, 18)}, Need: ${amount}`);
      return;
    }

    // Check if pool exists
    const factory = new ethers.Contract(ALGEBRA_FACTORY, FACTORY_ABI, signer);
    const poolInfo = await checkPoolExistence(factory, tokenInAddress, tokenOutAddress);
    
    if (!poolInfo) {
      console.log("  ❌ No pool exists for this pair");
      return;
    }

    // Approve router to spend tokens
    console.log("  🔐 Approving router to spend tokens...");
    const approveTx = await tokenIn.approve(router.address, amountIn);
    await approveTx.wait();
    console.log("  ✅ Approval confirmed");

    // Prepare swap parameters
    const params = {
      tokenIn: tokenInAddress,
      tokenOut: tokenOutAddress,
      deployer: ALGEBRA_FACTORY,
      recipient: signer.address,
      deadline: Math.floor(Date.now() / 1000) + 300,
      amountIn: amountIn,
      amountOutMinimum: 0,
      limitSqrtPrice: 0
    };

    // Execute swap
    const tx = await router.exactInputSingle(params, {
      gasLimit: 500000
    });

    console.log("  ⏳ Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("  ✅ Swap successful! Block:", receipt.blockNumber);

    // Check new balance
    const newBalance = await tokenOut.balanceOf(signer.address);
    console.log("  💎 New token balance:", formatUnits(newBalance, 18));

  } catch (error) {
    console.log("  ❌ Swap failed:", error.message);
  }
}

async function testTokenToSTT(router, tokenAddress, wNativeAddress, signer, amount) {
  try {
    console.log(`  💰 Swapping ${amount} tokens to STT...`);
    
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    
    // Check balance
    const balance = await token.balanceOf(signer.address);
    const amountIn = parseUnits(amount, 18);
    
    if (balance < amountIn) {
      console.log(`  ❌ Insufficient token balance. Have: ${formatUnits(balance, 18)}, Need: ${amount}`);
      return;
    }

    // Check if pool exists
    const factory = new ethers.Contract(ALGEBRA_FACTORY, FACTORY_ABI, signer);
    const poolInfo = await checkPoolExistence(factory, tokenAddress, wNativeAddress);
    
    if (!poolInfo) {
      console.log("  ❌ No pool exists for this pair");
      return;
    }

    // Approve router to spend tokens
    console.log("  🔐 Approving router to spend tokens...");
    const approveTx = await token.approve(router.address, amountIn);
    await approveTx.wait();
    console.log("  ✅ Approval confirmed");

    // Get initial STT balance
    const initialSTTBalance = await ethers.provider.getBalance(signer.address);

    // Prepare swap parameters
    const params = {
      tokenIn: tokenAddress,
      tokenOut: wNativeAddress,
      deployer: ALGEBRA_FACTORY,
      recipient: signer.address,
      deadline: Math.floor(Date.now() / 1000) + 300,
      amountIn: amountIn,
      amountOutMinimum: 0,
      limitSqrtPrice: 0
    };

    // Execute swap
    const tx = await router.exactInputSingle(params, {
      gasLimit: 500000
    });

    console.log("  ⏳ Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("  ✅ Swap successful! Block:", receipt.blockNumber);

    // Check new STT balance
    const finalSTTBalance = await ethers.provider.getBalance(signer.address);
    const sttReceived = finalSTTBalance - initialSTTBalance;
    console.log("  💎 STT received:", formatUnits(sttReceived, 18));

  } catch (error) {
    console.log("  ❌ Swap failed:", error.message);
  }
}

// Handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }); 