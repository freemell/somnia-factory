const { Telegraf, Markup } = require('telegraf');
const { getWalletForUser } = require('../utils/wallet');
const { swapTokens, getAmountsOut } = require('../utils/dex');
const { getTokenPrice } = require('../utils/priceFetcher');
const { generateTradeImage } = require('../utils/imageGen');

/**
 * Trade command handler
 */
async function handleTrade(ctx) {
  try {
    // Show token selection
    await ctx.reply(
      'Select token to trade:',
      Markup.inlineKeyboard([
        [
          Markup.button.callback('Buy 0.1 SOM', 'trade_buy_som_0.1'),
          Markup.button.callback('Buy 0.5 SOM', 'trade_buy_som_0.5'),
          Markup.button.callback('Buy X SOM ✏️', 'trade_buy_som_custom')
        ],
        [
          Markup.button.callback('Sell 50%', 'trade_sell_som_50'),
          Markup.button.callback('Sell 100%', 'trade_sell_som_100'),
          Markup.button.callback('Sell X% ✏️', 'trade_sell_som_custom')
        ],
        [
          Markup.button.callback('Cat Ai ✅', 'trade_cat_ai'),
          Markup.button.callback('NFA', 'trade_nfa'),
          Markup.button.callback('Watchlist ⭐', 'trade_watchlist')
        ],
        [
          Markup.button.callback('← Back', 'back'),
          Markup.button.callback('↻ Refresh', 'refresh'),
          Markup.button.callback('Sort: Value', 'sort_value')
        ]
      ])
    );
  } catch (error) {
    console.error('Trade command error:', error);
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

/**
 * Token selection handler
 */
async function handleTokenSelection(ctx) {
  try {
    const [action, token, amount] = ctx.match[1].split('_');
    
    if (amount === 'custom') {
      // Handle custom amount input
      await ctx.reply(
        `Enter custom ${action} amount for ${token}:`,
        Markup.inlineKeyboard([
          [Markup.button.callback('❌ Cancel', 'cancel')]
        ])
      );
      return;
    }

    // Get user's wallet
    const wallet = await getWalletForUser(ctx.from.id);
    
    // Get current price
    const price = await getTokenPrice(token);
    
    // Calculate expected output based on action and amount
    let amountIn, amountOut;
    if (action === 'buy') {
      amountIn = ethers.parseUnits(amount, 18);
      amountOut = await getAmountsOut(amountIn, [token, 'USDT']);
    } else {
      // For sell actions, calculate percentage of holdings
      const balance = await wallet.getBalance();
      const sellAmount = balance.mul(parseInt(amount)).div(100);
      amountIn = sellAmount;
      amountOut = await getAmountsOut(amountIn, [token, 'USDT']);
    }
    
    // Show confirmation
    await ctx.reply(
      `Confirm ${action}:\n\n${amount} ${token} → ${ethers.formatUnits(amountOut, 18)} USDT\n\nPrice: $${price}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Confirm', `trade_confirm_${action}_${token}_${amount}`),
          Markup.button.callback('❌ Cancel', 'cancel')
        ]
      ])
    );
  } catch (error) {
    console.error('Token selection error:', error);
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

/**
 * Amount selection handler
 */
async function handleAmountSelection(ctx) {
  try {
    const [token, amount] = ctx.match[1].split('_');
    
    // Show destination token selection
    await ctx.reply(
      'Select token to receive:',
      Markup.inlineKeyboard([
        [
          Markup.button.callback('SOM', `trade_receive_${token}_${amount}_som`),
          Markup.button.callback('USDT', `trade_receive_${token}_${amount}_usdt`)
        ],
        [Markup.button.callback('❌ Cancel', 'cancel')]
      ])
    );
  } catch (error) {
    console.error('Amount selection error:', error);
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

/**
 * Receive token selection handler
 */
async function handleReceiveToken(ctx) {
  try {
    const [tokenIn, amount, tokenOut] = ctx.match[1].split('_');
    
    // Get user's wallet
    const wallet = await getWalletForUser(ctx.from.id);
    
    // Get current price
    const price = await getTokenPrice(tokenIn);
    
    // Calculate expected output
    const amountIn = ethers.parseUnits(amount, 18);
    const path = [tokenIn, tokenOut];
    const amountOut = await getAmountsOut(amountIn, path);
    
    // Show confirmation
    await ctx.reply(
      `Confirm trade:\n\n${amount} ${tokenIn} → ${ethers.formatUnits(amountOut, 18)} ${tokenOut}\n\nPrice: $${price}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Confirm', `trade_confirm_${tokenIn}_${amount}_${tokenOut}`),
          Markup.button.callback('❌ Cancel', 'cancel')
        ]
      ])
    );
  } catch (error) {
    console.error('Receive token selection error:', error);
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

/**
 * Trade confirmation handler
 */
async function handleTradeConfirmation(ctx) {
  try {
    const [tokenIn, amount, tokenOut] = ctx.match[1].split('_');
    
    // Get user's wallet
    const wallet = await getWalletForUser(ctx.from.id);
    
    // Execute trade
    const result = await swapTokens(
      ethers.parseUnits(amount, 18),
      0, // No minimum amount
      tokenIn,
      tokenOut,
      wallet
    );
    
    if (result.success) {
      // Generate trade image
      const imagePath = await generateTradeImage({
        tokenIn,
        tokenOut,
        amount,
        price: await getTokenPrice(tokenIn),
        txHash: result.txHash
      });
      
      // Send success message with image
      await ctx.replyWithPhoto(
        { source: imagePath },
        {
          caption: `Trade successful!\n\nTransaction: ${result.txHash}`,
          parse_mode: 'Markdown'
        }
      );
    } else {
      await ctx.reply(
        `Trade failed: ${result.error}`,
        Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Try Again', 'trade')]
        ])
      );
    }
  } catch (error) {
    console.error('Trade confirmation error:', error);
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

module.exports = {
  handleTrade,
  handleTokenSelection,
  handleAmountSelection,
  handleReceiveToken,
  handleTradeConfirmation
}; 