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
  "function decimals() view returns (uint8)"
];

const ROUTER_ABI = [
  "function exactInputSingle((address,address,address,address,uint256,uint256,uint256,uint160)) external returns (uint256)",
  "function WNativeToken() external view returns (address)"
];

const FACTORY_ABI = [
  "function getPool(address, address, uint24) external view returns (address)"
];

async function main() {
  console.log("🔄 Simple Swap Test for Your Tokens\n");
  
  const [signer] = await ethers.getSigners();
  console.log("👤 Testing with address:", signer.address);
  
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
  
  console.log("\n🔍 Checking Pools:");
  
  // Check STT ↔ TokenA pool
  console.log("\n1. STT ↔ TokenA Pool:");
  await checkAndTestPool(factory, router, wNativeAddress, TOKEN_A, signer, "0.001");
  
  // Check STT ↔ TokenB pool  
  console.log("\n2. STT ↔ TokenB Pool:");
  await checkAndTestPool(factory, router, wNativeAddress, TOKEN_B, signer, "0.001");
  
  // Check TokenA ↔ TokenB pool
  console.log("\n3. TokenA ↔ TokenB Pool:");
  await checkAndTestPool(factory, router, TOKEN_A, TOKEN_B, signer, "1");
  
  console.log("\n✅ Test completed!");
}

async function checkAndTestPool(factory, router, tokenIn, tokenOut, signer, testAmount) {
  const feeTiers = [500, 3000, 10000];
  
  for (const fee of feeTiers) {
    try {
      const pool = await factory.getPool(tokenIn, tokenOut, fee);
      if (pool && pool !== ethers.ZeroAddress) {
        console.log(`  ✅ Pool found with fee ${fee} (${fee/10000}%)`);
        
        // Try to swap
        await attemptSwap(router, tokenIn, tokenOut, signer, testAmount, fee);
        return;
      }
    } catch (error) {
      // Continue to next fee tier
    }
  }
  
  console.log("  ❌ No pool found for any fee tier");
}

async function attemptSwap(router, tokenIn, tokenOut, signer, amount, fee) {
  try {
    console.log(`  🔄 Attempting swap: ${amount} tokens...`);
    
    const isNativeSwap = tokenIn === "0x4200000000000000000000000000000000000006" || 
                        tokenOut === "0x4200000000000000000000000000000000000006";
    
    if (isNativeSwap) {
      // STT swap
      const amountIn = parseUnits(amount, 18);
      const sttBalance = await ethers.provider.getBalance(signer.address);
      
      if (sttBalance < amountIn) {
        console.log(`  ❌ Insufficient STT. Have: ${formatUnits(sttBalance, 18)}, Need: ${amount}`);
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
      
      const tx = await router.exactInputSingle(params, {
        value: amountIn,
        gasLimit: 500000
      });
      
      console.log(`  ⏳ Swap tx: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`  ✅ Swap successful! Block: ${receipt.blockNumber}`);
      
    } else {
      // Token to token swap
      const tokenContract = new ethers.Contract(tokenIn, ERC20_ABI, signer);
      const amountIn = parseUnits(amount, 18);
      const balance = await tokenContract.balanceOf(signer.address);
      
      if (balance < amountIn) {
        console.log(`  ❌ Insufficient tokens. Have: ${formatUnits(balance, 18)}, Need: ${amount}`);
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
      
      const tx = await router.exactInputSingle(params, {
        gasLimit: 500000
      });
      
      console.log(`  ⏳ Swap tx: ${tx.hash}`);
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