const { JsonRpcProvider, Contract, parseUnits } = require('ethers');
const fs = require('fs');
const path = require('path');
const { getTokenMetadata, getTokenBalance } = require('./tokenInfo');
require('dotenv').config();

const provider = new JsonRpcProvider(process.env.RPC_URL);

// Load ABI from utils/abi.json
const abiPath = path.resolve(process.cwd(), 'utils/abi.json');
const abi = require(abiPath);

// --- IMPORTANT: Use correct Algebra V3 DEX addresses for Somnia testnet ---
// SwapRouter: 0xE94de02e52Eaf9F0f6Bf7f16E4927FcBc2c09bC7
// AlgebraFactory: 0x0BFaCE9a5c9F884a4f09fadB83b69e81EA41424B
const ALGEBRA_ROUTER = '0xE94de02e52Eaf9F0f6Bf7f16E4927FcBc2c09bC7';
const ALGEBRA_FACTORY = '0x0BFaCE9a5c9F884a4f09fadB83b69e81EA41424B';

// Default fee tier for Algebra V3 (0.3%)
const DEFAULT_FEE = 3000;

// Override environment variables if they don't match the correct addresses
if (process.env.DEX_ROUTER && process.env.DEX_ROUTER.toLowerCase() !== ALGEBRA_ROUTER.toLowerCase()) {
  console.warn('[DEX] Overriding DEX_ROUTER from .env with correct Algebra router:', ALGEBRA_ROUTER);
}
if (process.env.DEX_FACTORY_ADDRESS && process.env.DEX_FACTORY_ADDRESS.toLowerCase() !== ALGEBRA_FACTORY.toLowerCase()) {
  console.warn('[DEX] Overriding DEX_FACTORY_ADDRESS from .env with correct Algebra factory:', ALGEBRA_FACTORY);
}

const router = new Contract(ALGEBRA_ROUTER, abi, provider);
const factory = new Contract(ALGEBRA_FACTORY, abi, provider);

/**
 * Checks if contracts are deployed
 */
async function checkContractDeployment() {
  try {
    console.log('[DEX] Checking contract deployment...');
    const routerCode = await provider.getCode(ALGEBRA_ROUTER);
    const factoryCode = await provider.getCode(ALGEBRA_FACTORY);
    
    console.log('[DEX] Router bytecode length:', routerCode.length);
    console.log('[DEX] Factory bytecode length:', factoryCode.length);
    
    if (routerCode === '0x') {
      console.error('[DEX] Router contract not deployed at:', ALGEBRA_ROUTER);
      return false;
    }
    
    if (factoryCode === '0x') {
      console.error('[DEX] Factory contract not deployed at:', ALGEBRA_FACTORY);
      return false;
    }
    
    console.log('[DEX] Both router and factory contracts are deployed');
    return true;
  } catch (error) {
    console.error('[DEX] Error checking contract deployment:', error);
    return false;
  }
}

/**
 * Checks if a liquidity pool exists for the given token pair using the factory contract.
 * Returns true if a pool exists, false otherwise.
 * Uses Algebra V3 getPool function with fee parameter.
 */
async function validatePair(tokenA, tokenB, fee = DEFAULT_FEE) {
  try {
    console.log('[validatePair] Starting validation...');
    console.log('[validatePair] Token A:', tokenA);
    console.log('[validatePair] Token B:', tokenB);
    console.log('[validatePair] Fee tier:', fee);
    
    // First check if contracts are deployed
    if (!(await checkContractDeployment())) {
      console.warn('[validatePair] Contracts not deployed, cannot validate pair');
      return false;
    }
    
    // Try to get pool with default fee tier
    console.log('[validatePair] Calling factory.getPool...');
    let pool = await factory.getPool(tokenA, tokenB, fee);
    console.log('[validatePair] Pool address (A,B):', pool);
    
    if (pool && pool !== '0x0000000000000000000000000000000000000000') {
      console.log('[validatePair] ✅ Pool found with fee tier:', fee);
      return true;
    }
    
    // Try reverse order
    console.log('[validatePair] Trying reverse order...');
    pool = await factory.getPool(tokenB, tokenA, fee);
    console.log('[validatePair] Pool address (B,A):', pool);
    
    if (pool && pool !== '0x0000000000000000000000000000000000000000') {
      console.log('[validatePair] ✅ Pool found with reverse order and fee tier:', fee);
      return true;
    }
    
    // Try different fee tiers if default doesn't work
    const feeTiers = [500, 3000, 10000]; // 0.05%, 0.3%, 1%
    for (const testFee of feeTiers) {
      if (testFee === fee) continue; // Skip the one we already tried
      
      console.log('[validatePair] Trying fee tier:', testFee);
      try {
        pool = await factory.getPool(tokenA, tokenB, testFee);
        console.log('[validatePair] Pool address with fee', testFee, ':', pool);
        
        if (pool && pool !== '0x0000000000000000000000000000000000000000') {
          console.log('[validatePair] ✅ Pool found with fee tier:', testFee);
          return true;
        }
        
        // Try reverse order with this fee
        pool = await factory.getPool(tokenB, tokenA, testFee);
        console.log('[validatePair] Pool address (B,A) with fee', testFee, ':', pool);
        
        if (pool && pool !== '0x0000000000000000000000000000000000000000') {
          console.log('[validatePair] ✅ Pool found with reverse order and fee tier:', testFee);
          return true;
        }
      } catch (error) {
        console.log('[validatePair] Error checking fee tier', testFee, ':', error.message);
      }
    }
    
    console.warn('[validatePair] ❌ No pool found for any fee tier:', { tokenA, tokenB, feeTiers });
    return false;
  } catch (error) {
    console.error('[validatePair] Failed:', { error: error.message, tokenA, tokenB, fee });
    return false;
  }
}

/**
 * Returns the output amount for a swap using Algebra V3 exactInputSingle.
 * Throws if no liquidity exists.
 */
async function getAmountsOut(amountIn, path, fee = DEFAULT_FEE) {
  console.log('[getAmountsOut] Starting amount calculation...');
  console.log('[getAmountsOut] Path:', path);
  console.log('[getAmountsOut] AmountIn:', amountIn.toString());
  console.log('[getAmountsOut] Fee tier:', fee);
  
  // Check if contracts are deployed first
  if (!(await checkContractDeployment())) {
    throw new Error('❌ DEX contracts not deployed on this network');
  }
  
  if (!(await validatePair(path[0], path[1], fee))) {
    throw new Error('❌ No liquidity pool exists');
  }
  
  try {
    // For Algebra V3, we need to use exactInputSingle with params
    const params = {
      tokenIn: path[0],
      tokenOut: path[1],
      deployer: ALGEBRA_FACTORY, // Use factory as deployer
      recipient: '0x0000000000000000000000000000000000000000', // Will be set during swap
      deadline: Math.floor(Date.now() / 1000) + 300, // 5 minutes
      amountIn: amountIn,
      amountOutMinimum: 0, // We're just getting the amount, not executing
      limitSqrtPrice: 0 // No price limit for amount calculation
    };
    
    console.log('[getAmountsOut] Calling router.exactInputSingle with params:', params);
    const amountOut = await router.exactInputSingle(params);
    console.log('[getAmountsOut] Amount out:', amountOut.toString());
    return amountOut;
  } catch (error) {
    console.error('[getAmountsOut] Failed:', { error: error.message, path, amountIn, fee });
    throw new Error('Failed to get output: ' + error.message);
  }
}

/**
 * Swaps tokens using the Algebra V3 router. Throws if no liquidity exists.
 */
async function swapTokens(amountIn, amountOutMin, tokenIn, tokenOut, userWallet, fee = DEFAULT_FEE) {
  console.log('[swapTokens] Starting swap...');
  console.log('[swapTokens] Params:', { 
    amountIn: amountIn.toString(), 
    amountOutMin: amountOutMin.toString(), 
    tokenIn, 
    tokenOut,
    fee 
  });
  
  // Check if contracts are deployed first
  if (!(await checkContractDeployment())) {
    throw new Error('❌ DEX contracts not deployed on this network');
  }
  
  if (!(await validatePair(tokenIn, tokenOut, fee))) {
    throw new Error('❌ No liquidity pool exists');
  }
  
  try {
    // Connect wallet to provider
    const wallet = userWallet.connect(provider);
    
    // Approve router to spend tokens
    const tokenContract = new Contract(
      tokenIn,
      ['function approve(address spender, uint256 amount) public returns (bool)'],
      wallet
    );
    
    console.log('[swapTokens] Approving router to spend tokens...');
    const approveTx = await tokenContract.approve(router.address, amountIn);
    await approveTx.wait();
    console.log('[swapTokens] Approval confirmed');
    
    // Prepare swap parameters for Algebra V3
    const params = {
      tokenIn: tokenIn,
      tokenOut: tokenOut,
      deployer: ALGEBRA_FACTORY,
      recipient: wallet.address,
      deadline: Math.floor(Date.now() / 1000) + 300, // 5 minutes
      amountIn: amountIn,
      amountOutMinimum: amountOutMin,
      limitSqrtPrice: 0 // No price limit
    };
    
    console.log('[swapTokens] Executing swap with params:', params);
    
    // Execute swap using exactInputSingle
    const swapTx = await router.connect(wallet).exactInputSingle(params, { 
      gasLimit: 500000 // Higher gas limit for Algebra V3
    });
    
    console.log('[swapTokens] Swap transaction sent:', swapTx.hash);
    const receipt = await swapTx.wait();
    console.log('[swapTokens] Swap confirmed in block:', receipt.blockNumber);
    
    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error('[swapTokens] Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Estimate token output for specific STT amounts using Algebra V3
 */
async function estimateTokenOutput(sttAmounts, tokenAddress, provider, fee = DEFAULT_FEE) {
  try {
    console.log('[estimateTokenOutput] Starting estimation...');
    console.log('[estimateTokenOutput] Token address:', tokenAddress);
    console.log('[estimateTokenOutput] Fee tier:', fee);
    
    // Use the WNativeToken address from .env
    const WNATIVE_ADDRESS = process.env.WETH_ADDRESS;
    if (!WNATIVE_ADDRESS) {
      console.error('WETH_ADDRESS not found in .env file. Price estimates will fail.');
      return {};
    }

    const estimates = {};
    
    for (const amount of sttAmounts) {
      try {
        console.log('[estimateTokenOutput] Estimating for amount:', amount);
        const amountIn = parseUnits(amount.toString(), 18);
        const amountOut = await getAmountsOut(amountIn, [WNATIVE_ADDRESS, tokenAddress], fee);
        estimates[amount] = amountOut;
        console.log('[estimateTokenOutput] Estimate for', amount, 'STT:', amountOut.toString());
      } catch (error) {
        console.error(`Error estimating for ${amount} STT:`, error.message);
        estimates[amount] = null;
      }
    }
    
    return estimates;
  } catch (error) {
    console.error('Error estimating token output:', error);
    return {};
  }
}

/**
 * Calculate slippage-adjusted minimum output
 */
function calculateAmountOutMin(amountOut, slippagePercent = 1) {
  const slippageMultiplier = (100 - slippagePercent) / 100;
  return amountOut * BigInt(Math.floor(slippageMultiplier * 1000)) / 1000n;
}

// Simple test to verify if the DEX router is correct
async function testDexRouter() {
  try {
    console.log('[DEX TEST] Testing Algebra V3 router...');
    
    // Check contract deployment
    if (!(await checkContractDeployment())) {
      console.log('[DEX TEST] Contracts not deployed');
      return;
    }
    
    // Test WNativeToken function
    try {
      const wNative = await router.WNativeToken();
      console.log('[DEX TEST] WNativeToken address:', wNative);
    } catch (error) {
      console.log('[DEX TEST] WNativeToken function failed:', error.message);
    }
    
    // Test factory function
    try {
      const factoryAddress = await router.factory();
      console.log('[DEX TEST] Factory address from router:', factoryAddress);
    } catch (error) {
      console.log('[DEX TEST] Factory function failed:', error.message);
    }
    
    // Test poolDeployer function
    try {
      const poolDeployer = await router.poolDeployer();
      console.log('[DEX TEST] PoolDeployer address:', poolDeployer);
    } catch (error) {
      console.log('[DEX TEST] PoolDeployer function failed:', error.message);
    }
    
  } catch (e) {
    console.error('[DEX TEST] Unexpected error:', e.message);
  }
}

// Export functions
module.exports = { 
  getAmountsOut, 
  swapTokens, 
  validatePair, 
  estimateTokenOutput,
  calculateAmountOutMin,
  testDexRouter,
  checkContractDeployment
}; 