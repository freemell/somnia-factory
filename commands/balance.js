const { Telegraf, Markup } = require('telegraf');
const { ethers } = require('ethers');
const { getWalletForUser } = require('../utils/wallet');

// Token contract ABIs
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

/**
 * Balance command handler
 */
async function handleBalance(ctx) {
  try {
    // Get user's wallet
    const wallet = await getWalletForUser(ctx.from.id);
    
    // Get native token balance
    const nativeBalance = await wallet.provider.getBalance(wallet.address);
    
    // Get token balances
    const somBalance = await getTokenBalance(wallet, process.env.SOM_TOKEN_ADDRESS);
    const usdtBalance = await getTokenBalance(wallet, process.env.USDT_TOKEN_ADDRESS);
    
    // Format message
    const message = `💰 Your Balances:\n\n` +
      `SOM: ${ethers.formatEther(nativeBalance)}\n` +
      `SOM Token: ${somBalance}\n` +
      `USDT: ${usdtBalance}`;
    
    await ctx.reply(
      message,
      Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Refresh', 'balance')],
        [Markup.button.callback('❌ Close', 'cancel')]
      ])
    );
  } catch (error) {
    console.error('Balance command error:', error);
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

/**
 * Gets token balance for a wallet
 */
async function getTokenBalance(wallet, tokenAddress) {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet.provider);
    const balance = await tokenContract.balanceOf(wallet.address);
    const decimals = await tokenContract.decimals();
    return ethers.formatUnits(balance, decimals);
  } catch (error) {
    console.error('Error getting token balance:', error);
    return '0';
  }
}

module.exports = {
  handleBalance
}; 