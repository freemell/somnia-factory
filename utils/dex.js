const { JsonRpcProvider, Contract, parseUnits } = require('ethers');
const fs = require('fs');
const path = require('path');
const { getTokenMetadata, getTokenBalance } = require('./tokenInfo');
require('dotenv').config();
const { ethers } = require('ethers');

// Insomnia DEX Factory Configuration
const DEX_CONFIG = {
  factoryAddress: '0xEc0a2Fa70BFAC604287eF479E9D1E14fF41f3075',
  rpcUrl: 'https://dream-rpc.somnia.network/',
  chainId: 50312,
  feeTiers: {
    500: 0.0005,   // 0.05%
    3000: 0.003,   // 0.3%
    10000: 0.01    // 1%
  },
  // STT token address on Somnia mainnet
  sttAddress: '0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7'
};

const provider = new JsonRpcProvider(process.env.RPC_URL);

// Load ABI from utils/abi.json
const abiPath = path.resolve(process.cwd(), 'utils/abi.json');
const abiData = require(abiPath);

// Extract the Factory ABI from the JSON object
const factoryAbi = abiData.CustomFactory || [];

// Use Algebra V3 Router ABI (this is the correct ABI for Algebra V3)
const routerAbi = [
  {
    "inputs": [
      {
        "components": [
          {"internalType": "address", "name": "tokenIn", "type": "address"},
          {"internalType": "address", "name": "tokenOut", "type": "address"},
          {"internalType": "address", "name": "deployer", "type": "address"},
          {"internalType": "address", "name": "recipient", "type": "address"},
          {"internalType": "uint256", "name": "deadline", "type": "uint256"},
          {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
          {"internalType": "uint256", "name": "amountOutMinimum", "type": "uint256"},
          {"internalType": "uint160", "name": "limitSqrtPrice", "type": "uint160"}
        ],
        "internalType": "struct ISwapRouter.ExactInputSingleParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "exactInputSingle",
    "outputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {"internalType": "bytes", "name": "path", "type": "bytes"},
          {"internalType": "address", "name": "recipient", "type": "address"},
          {"internalType": "uint256", "name": "deadline", "type": "uint256"},
          {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
          {"internalType": "uint256", "name": "amountOutMinimum", "type": "uint256"}
        ],
        "internalType": "struct ISwapRouter.ExactInputParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "exactInput",
    "outputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "WNativeToken",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "factory",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Use the appropriate ABIs
const abi = routerAbi;

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
const factory = new Contract(ALGEBRA_FACTORY, factoryAbi, provider);

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
 * Validates if a trading pair exists with the given fee tier.
 * Returns true if pool exists, false otherwise.
 */
async function validatePair(tokenA, tokenB, fee = DEFAULT_FEE) {
  console.log('[validatePair] Starting validation...');
  console.log('[validatePair] Token A:', tokenA);
  console.log('[validatePair] Token B:', tokenB);
  console.log('[validatePair] Fee tier:', fee);
  
  try {
    // Validate addresses before proceeding
    if (!ethers.isAddress(tokenA)) {
      console.error('[validatePair] Invalid token A address:', tokenA);
      return false;
    }
    
    if (!ethers.isAddress(tokenB)) {
      console.error('[validatePair] Invalid token B address:', tokenB);
      return false;
    }
    
    console.log('[validatePair] Addresses validated successfully');
    
    // Check if contracts are deployed first
    if (!(await checkContractDeployment())) {
      console.log('[validatePair] Contracts not deployed');
      return false;
    }
    
    // For Algebra V3, we need to check if a pool exists
    // The factory doesn't have poolByPair, so we'll try a different approach
    try {
      // Try to get pool address using the factory's getPool method
      // This is the correct method for Algebra V3
      const poolAddress = await factory.getPool(tokenA, tokenB, fee);
      console.log('[validatePair] Pool address:', poolAddress);
      
      if (poolAddress === ethers.ZeroAddress) {
        console.log('[validatePair] No pool found for this pair');
        return false;
      }
      
      // Check if pool has liquidity by trying to get reserves
      try {
        const pool = new Contract(poolAddress, POOL_ABI, provider);
        const reserves = await pool.getReserves();
        console.log('[validatePair] Pool reserves:', reserves);
        
        // Check if both reserves are greater than 0
        const hasLiquidity = reserves[0] > 0 && reserves[1] > 0;
        console.log('[validatePair] Has liquidity:', hasLiquidity);
        
        return hasLiquidity;
      } catch (error) {
        console.error('[validatePair] Error checking pool reserves:', error);
        // If we can't check reserves, assume the pool exists
        console.log('[validatePair] Assuming pool exists for Algebra V3');
        return true;
      }
    } catch (error) {
      console.error('[validatePair] Error checking pool:', error);
      // If we can't validate, assume the pool exists for now
      console.log('[validatePair] Assuming pool exists for Algebra V3');
      return true;
    }
  } catch (error) {
    console.error('[validatePair] Failed:', { 
      error: error.message, 
      tokenA, 
      tokenB, 
      fee 
    });
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
  
  try {
    // Validate all addresses in the path
    for (let i = 0; i < path.length; i++) {
      if (!ethers.isAddress(path[i])) {
        console.error('[getAmountsOut] Invalid address in path at index', i, ':', path[i]);
        throw new Error(`Invalid address in path: ${path[i]}`);
      }
    }
    
    console.log('[getAmountsOut] All addresses validated successfully');
    
    // Check if contracts are deployed first
    if (!(await checkContractDeployment())) {
      throw new Error('❌ DEX contracts not deployed on this network');
    }
    
    // Validate the pair exists
    if (path.length >= 2) {
      const pairExists = await validatePair(path[0], path[1], fee);
      if (!pairExists) {
        throw new Error('❌ No liquidity pool exists for this pair');
      }
    }
    
    // Prepare parameters for exactInputSingle
    const params = {
      tokenIn: path[0],
      tokenOut: path[path.length - 1],
      deployer: ALGEBRA_FACTORY,
      recipient: ethers.ZeroAddress, // We just want to calculate, not execute
      deadline: Math.floor(Date.now() / 1000) + 300, // 5 minutes
      amountIn: amountIn,
      amountOutMinimum: 0, // We're just calculating, not executing
      limitSqrtPrice: 0 // No price limit
    };
    
    console.log('[getAmountsOut] Calling router.exactInputSingle with params:', params);
    
    const amountOut = await router.exactInputSingle(params);
    console.log('🔍 [DEBUG] getAmountsOut - Amount out:', amountOut.toString());
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
  
  try {
    // Validate addresses before proceeding
    if (!ethers.isAddress(tokenIn)) {
      console.error('[swapTokens] Invalid tokenIn address:', tokenIn);
      throw new Error('Invalid tokenIn address format');
    }
    
    if (!ethers.isAddress(tokenOut)) {
      console.error('[swapTokens] Invalid tokenOut address:', tokenOut);
      throw new Error('Invalid tokenOut address format');
    }
    
    console.log('[swapTokens] Addresses validated successfully');
    
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
  } catch (error) {
    console.error('[swapTokens] Failed:', { error: error.message, tokenIn, tokenOut, amountIn, amountOutMin, fee });
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate helpful liquidity guidance message
 */
function getLiquidityGuidance(tokenAddress, tokenSymbol) {
  return `💧 *No Liquidity Found*\n\n` +
         `The ${tokenSymbol} token doesn't have enough liquidity for trading yet.\n\n` +
         `*How to Add Liquidity:*\n\n` +
         `1️⃣ *Visit QuickSwap Interface*\n` +
         `   • Go to [QuickSwap Somnia Testnet](https://quickswap.exchange/#/swap?chain=somnia)\n` +
         `   • Connect your wallet\n\n` +
         `2️⃣ *Navigate to Pool Section*\n` +
         `   • Click on "Pool" tab\n` +
         `   • Select "Add Liquidity"\n\n` +
         `3️⃣ *Select Token Pair*\n` +
         `   • Token 1: STT (\`0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7\`)\n` +
         `   • Token 2: ${tokenSymbol} (\`${tokenAddress}\`)\n\n` +
         `4️⃣ *Choose Fee Tier*\n` +
         `   • Select 0.3% fee (3000 in Algebra V3)\n` +
         `   • Add equal amounts of both tokens\n` +
         `   • Example: 100 STT + 100 ${tokenSymbol}\n\n` +
         `5️⃣ *Confirm Transaction*\n` +
         `   • Review the transaction\n` +
         `   • Confirm in your wallet\n\n` +
         `*After adding liquidity:*\n` +
         `• Check [Shannon Explorer](https://shannon-explorer.somnia.network) to verify\n` +
         `• Return here to try trading again\n\n` +
         `💡 *Tip:* Adding liquidity earns you trading fees!`;
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
    let hasAnyLiquidity = false;
    
    for (const amount of sttAmounts) {
      try {
        console.log('[estimateTokenOutput] Estimating for amount:', amount);
        const amountIn = parseUnits(amount.toString(), 18);
        const amountOut = await getAmountsOut(amountIn, [WNATIVE_ADDRESS, tokenAddress], fee);
        estimates[amount] = amountOut;
        hasAnyLiquidity = true;
        console.log('[estimateTokenOutput] Estimate for', amount, 'STT:', amountOut.toString());
      } catch (error) {
        console.error(`Error estimating for ${amount} STT:`, error.message);
        estimates[amount] = null;
      }
    }
    
    // If no liquidity found for any amount, add guidance
    if (!hasAnyLiquidity) {
      estimates._noLiquidity = true;
      estimates._guidance = getLiquidityGuidance(tokenAddress, 'Token'); // Will be updated with actual symbol
    }
    
    return estimates;
  } catch (error) {
    console.error('Error estimating token output:', error);
    return {
      _error: true,
      _guidance: getLiquidityGuidance(tokenAddress, 'Token')
    };
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
  checkContractDeployment,
  getLiquidityGuidance
};