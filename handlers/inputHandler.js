const { Markup } = require('telegraf');
const { ethers } = require('ethers');
const { getTokenInfo } = require('../utils/caDetector');
const { swapTokens } = require('../utils/dex');
const { generateTradeImage } = require('../utils/imageGen');
const { tokenInfoButtons, persistentButtons } = require('./inlineButtons');

/**
 * Handles contract address input
 */
async function handleContractAddress(ctx) {
  try {
    const address = ctx.message.text;
    
    // Validate address format
    if (!ethers.isAddress(address)) {
      return ctx.reply(
        'Invalid contract address format. Please provide a valid Ethereum address.',
        Markup.inlineKeyboard(persistentButtons)
      );
    }

    // Get token info
    const tokenInfo = await getTokenInfo(address);
    
    if (!tokenInfo) {
      return ctx.reply(
        'Could not fetch token information. Please check the address and try again.',
        Markup.inlineKeyboard(persistentButtons)
      );
    }

    // Format token info message
    const message = formatTokenInfo(tokenInfo);
    
    // Send token info with buttons
    await ctx.reply(
      message,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          ...tokenInfoButtons(address),
          ...persistentButtons
        ])
      }
    );

    // Delete the original message containing the address
    await ctx.deleteMessage();
  } catch (error) {
    console.error('Contract address handler error:', error);
    await ctx.reply(
      'Sorry, something went wrong. Please try again.',
      Markup.inlineKeyboard(persistentButtons)
    );
  }
}

/**
 * Handles buy amount selection
 */
async function handleBuyAmount(ctx) {
  try {
    const [tokenAddress, amount] = ctx.match[1].split('_');
    
    // Get user's wallet
    const wallet = await getWalletForUser(ctx.from.id);
    
    // Execute swap
    const result = await swapTokens(
      ethers.parseUnits(amount, 18),
      0, // No minimum amount
      process.env.SOM_TOKEN_ADDRESS,
      tokenAddress,
      wallet
    );
    
    if (result.success) {
      // Generate trade image
      const imagePath = await generateTradeImage({
        tokenIn: 'SOM',
        tokenOut: tokenAddress,
        amount,
        price: await getTokenPrice(tokenAddress),
        txHash: result.txHash
      });
      
      // Send success message with image
      await ctx.replyWithPhoto(
        { source: imagePath },
        {
          caption: `Trade successful!\n\nTransaction: ${result.txHash}`,
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            ...tokenInfoButtons(tokenAddress),
            ...persistentButtons
          ])
        }
      );
    } else {
      await ctx.reply(
        `Trade failed: ${result.error}`,
        Markup.inlineKeyboard([
          ...tokenInfoButtons(tokenAddress),
          ...persistentButtons
        ])
      );
    }
  } catch (error) {
    console.error('Buy amount handler error:', error);
    await ctx.reply(
      'Sorry, something went wrong. Please try again.',
      Markup.inlineKeyboard(persistentButtons)
    );
  }
}

/**
 * Formats token information for display
 */
function formatTokenInfo(tokenInfo) {
  return `*${tokenInfo.name} | ${tokenInfo.symbol} | ${tokenInfo.address.slice(0, 6)}...${tokenInfo.address.slice(-4)}*\n\n` +
    `Price: $${tokenInfo.price}\n` +
    `5m: ${tokenInfo.change5m > 0 ? '+' : ''}${tokenInfo.change5m}%, ` +
    `1h: ${tokenInfo.change1h > 0 ? '+' : ''}${tokenInfo.change1h}%, ` +
    `24h: ${tokenInfo.change24h > 0 ? '+' : ''}${tokenInfo.change24h}%\n` +
    `Market Cap: $${formatNumber(tokenInfo.marketCap)}\n` +
    `Price Impact (5 SOM): ${tokenInfo.priceImpact}%\n` +
    `Wallet Balance: ${tokenInfo.walletBalance} SOM`;
}

/**
 * Formats large numbers for display
 */
function formatNumber(num) {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
}

module.exports = {
  handleContractAddress,
  handleBuyAmount
}; 