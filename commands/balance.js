const { Markup } = require('telegraf');
const { ethers } = require('ethers');
const { getWalletForUser } = require('../utils/wallet');

// Token contract ABIs
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// Define SOM and USDT token addresses as constants
const SOM_TOKEN_ADDRESS = '0x...'; // Replace with actual SOM token address
const USDT_TOKEN_ADDRESS = '0x...'; // Replace with actual USDT token address

/**
 * Gets token balance and symbol for a wallet
 */
async function getTokenBalanceAndSymbol(wallet, tokenAddress) {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet.provider);
    const [balance, decimals, symbol] = await Promise.all([
      tokenContract.balanceOf(wallet.address),
      tokenContract.decimals(),
      tokenContract.symbol()
    ]);
    return {
      balance: ethers.formatUnits(balance, decimals),
      symbol
    };
  } catch (error) {
    console.error('Error getting token balance:', error);
    return { balance: '0', symbol: '' };
  }
}

/**
 * Balance command handler
 */
async function handleBalance(ctx) {
  try {
    // Get user's wallet
    const wallet = await getWalletForUser(ctx.from.id);

    // Get native token balance (SOM native)
    const nativeBalance = await wallet.provider.getBalance(wallet.address);
    const formattedNative = ethers.formatEther(nativeBalance);

    // Get token balances
    const som = await getTokenBalanceAndSymbol(wallet, SOM_TOKEN_ADDRESS);
    const usdt = await getTokenBalanceAndSymbol(wallet, USDT_TOKEN_ADDRESS);

    // Format message
    const message = `💰 Your Balances:\n\n` +
      `SOM (native): ${formattedNative}\n` +
      `${som.symbol}: ${som.balance}\n` +
      `${usdt.symbol}: ${usdt.balance}`;

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

module.exports = {
  handleBalance
};