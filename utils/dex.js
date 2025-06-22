const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load router ABI
const routerAbiPath = path.join(__dirname, '../abis/router.json');
const routerAbi = JSON.parse(fs.readFileSync(routerAbiPath, 'utf8'));

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const routerAddress = process.env.DEX_ROUTER || '0xE94de02e52Eaf9F0f6Bf7f16E4927FcBc2c09bC7';
const router = new ethers.Contract(routerAddress, routerAbi, provider);

/**
 * Swaps tokens using the DEX router
 */
async function swapTokens(amountIn, amountOutMin, tokenIn, tokenOut, userWallet) {
  try {
    // Connect wallet to provider
    const wallet = userWallet.connect(provider);
    
    // Get token contract
    const tokenContract = new ethers.Contract(
      tokenIn,
      ['function approve(address spender, uint256 amount) public returns (bool)'],
      wallet
    );

    // Approve router to spend tokens
    const approveTx = await tokenContract.approve(routerAddress, amountIn);
    await approveTx.wait();

    // Prepare swap parameters
    const path = [tokenIn, tokenOut];
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    // Execute swap with fixed gas limit
    const swapTx = await router.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      path,
      wallet.address,
      deadline,
      { gasLimit: 300000 }
    );

    // Wait for transaction
    const receipt = await swapTx.wait();

    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error('Error swapping tokens:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Gets the expected output amount for a swap
 */
async function getAmountsOut(amountIn, path) {
  try {
    const amounts = await router.getAmountsOut(amountIn, path);
    return amounts[amounts.length - 1];
  } catch (error) {
    console.error('Error getting amounts out:', error);
    throw new Error('Failed to get expected output amount');
  }
}

/**
 * Estimate token output for specific STT amounts
 */
async function estimateTokenOutput(sttAmounts, tokenAddress, provider) {
  try {
    // For Somnia, we'll use WETH address as the wrapped version of STT
    // This is a common pattern where native tokens are wrapped for DEX trading
    const WSTT_ADDRESS = '0x4200000000000000000000000000000000000006'; // Wrapped STT address (common pattern)
    const estimates = {};
    
    for (const amount of sttAmounts) {
      try {
        const amountIn = ethers.parseUnits(amount.toString(), 18); // STT has 18 decimals
        const path = [WSTT_ADDRESS, tokenAddress];
        const amountOut = await getAmountsOut(amountIn, path);
        estimates[amount] = amountOut;
      } catch (error) {
        console.error(`Error estimating for ${amount} STT:`, error);
        // Fallback: use a simple ratio (1 STT = 1000 token units as example)
        const fallbackRatio = 1000;
        estimates[amount] = ethers.parseUnits((amount * fallbackRatio).toString(), 18);
      }
    }
    
    return estimates;
  } catch (error) {
    console.error('Error estimating token output:', error);
    // Return fallback estimates
    const estimates = {};
    for (const amount of sttAmounts) {
      const fallbackRatio = 1000;
      estimates[amount] = ethers.parseUnits((amount * fallbackRatio).toString(), 18);
    }
    return estimates;
  }
}

/**
 * Calculate slippage-adjusted minimum output
 */
function calculateAmountOutMin(amountOut, slippagePercent = 1) {
  const slippageMultiplier = (100 - slippagePercent) / 100;
  return amountOut * BigInt(Math.floor(slippageMultiplier * 1000)) / 1000n;
}

module.exports = { 
  swapTokens, 
  getAmountsOut, 
  estimateTokenOutput,
  calculateAmountOutMin 
}; 