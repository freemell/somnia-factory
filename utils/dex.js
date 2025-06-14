const { ethers } = require('ethers');
const fs = require('fs').promises;

// Load DEX router ABI
let routerABI;
try {
  routerABI = JSON.parse(await fs.readFile(process.env.DEX_ABI_PATH, 'utf8'));
} catch (error) {
  console.error('Error loading DEX ABI:', error);
  throw new Error('Failed to load DEX ABI');
}

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const routerAddress = process.env.DEX_ROUTER;
const router = new ethers.Contract(routerAddress, routerABI, provider);

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

    // Estimate gas
    const gasEstimate = await router.swapExactTokensForTokens.estimateGas(
      amountIn,
      amountOutMin,
      path,
      wallet.address,
      deadline
    );

    // Execute swap
    const swapTx = await router.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      path,
      wallet.address,
      deadline,
      { gasLimit: gasEstimate.mul(120).div(100) } // Add 20% buffer
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

module.exports = {
  swapTokens,
  getAmountsOut
}; 