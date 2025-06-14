const { Telegraf, Markup } = require('telegraf');
const { createLimitOrder, getUserLimitOrders, cancelLimitOrder } = require('../utils/limitOrders');
const { getTokenPrice } = require('../utils/priceFetcher');

/**
 * Limit order command handler
 */
async function handleLimitOrder(ctx) {
  try {
    await ctx.reply(
      'What would you like to do?',
      Markup.inlineKeyboard([
        [
          Markup.button.callback('📝 New Order', 'limit_new'),
          Markup.button.callback('📋 My Orders', 'limit_list')
        ],
        [Markup.button.callback('❌ Cancel', 'cancel')]
      ])
    );
  } catch (error) {
    console.error('Limit order command error:', error);
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

/**
 * New limit order handler
 */
async function handleNewLimitOrder(ctx) {
  try {
    await ctx.reply(
      'Select token to sell:',
      Markup.inlineKeyboard([
        [
          Markup.button.callback('SOM', 'limit_sell_som'),
          Markup.button.callback('USDT', 'limit_sell_usdt')
        ],
        [Markup.button.callback('❌ Cancel', 'cancel')]
      ])
    );
  } catch (error) {
    console.error('New limit order error:', error);
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

/**
 * Sell token selection handler
 */
async function handleSellToken(ctx) {
  try {
    const token = ctx.match[1];
    
    await ctx.reply(
      'Enter amount to sell:',
      Markup.inlineKeyboard([
        [
          Markup.button.callback('0.1', `limit_amount_${token}_0.1`),
          Markup.button.callback('1', `limit_amount_${token}_1`),
          Markup.button.callback('10', `limit_amount_${token}_10`)
        ],
        [Markup.button.callback('❌ Cancel', 'cancel')]
      ])
    );
  } catch (error) {
    console.error('Sell token selection error:', error);
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

/**
 * Amount selection handler
 */
async function handleAmountSelection(ctx) {
  try {
    const [token, amount] = ctx.match[1].split('_');
    
    await ctx.reply(
      'Select token to receive:',
      Markup.inlineKeyboard([
        [
          Markup.button.callback('SOM', `limit_receive_${token}_${amount}_som`),
          Markup.button.callback('USDT', `limit_receive_${token}_${amount}_usdt`)
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
    
    // Get current price
    const currentPrice = await getTokenPrice(tokenIn);
    
    await ctx.reply(
      'Select price condition:',
      Markup.inlineKeyboard([
        [
          Markup.button.callback('Above', `limit_above_${tokenIn}_${amount}_${tokenOut}`),
          Markup.button.callback('Below', `limit_below_${tokenIn}_${amount}_${tokenOut}`)
        ],
        [Markup.button.callback('❌ Cancel', 'cancel')]
      ])
    );
  } catch (error) {
    console.error('Receive token selection error:', error);
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

/**
 * Price condition handler
 */
async function handlePriceCondition(ctx) {
  try {
    const [condition, tokenIn, amount, tokenOut] = ctx.match[1].split('_');
    const isAbove = condition === 'above';
    
    // Get current price
    const currentPrice = await getTokenPrice(tokenIn);
    
    await ctx.reply(
      `Enter target price (current: $${currentPrice}):`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback('0.1', `limit_price_${tokenIn}_${amount}_${tokenOut}_${isAbove}_0.1`),
          Markup.button.callback('1', `limit_price_${tokenIn}_${amount}_${tokenOut}_${isAbove}_1`),
          Markup.button.callback('10', `limit_price_${tokenIn}_${amount}_${tokenOut}_${isAbove}_10`)
        ],
        [Markup.button.callback('❌ Cancel', 'cancel')]
      ])
    );
  } catch (error) {
    console.error('Price condition error:', error);
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

/**
 * Price selection handler
 */
async function handlePriceSelection(ctx) {
  try {
    const [tokenIn, amount, tokenOut, isAbove, price] = ctx.match[1].split('_');
    
    // Create limit order
    const order = await createLimitOrder(
      ctx.from.id,
      tokenIn,
      tokenOut,
      amount,
      price,
      isAbove === 'true'
    );
    
    await ctx.reply(
      `Limit order created!\n\n` +
      `Sell: ${amount} ${tokenIn}\n` +
      `Receive: ${tokenOut}\n` +
      `Price: $${price} (${isAbove === 'true' ? 'Above' : 'Below'})\n\n` +
      `Order ID: ${order.id}`,
      Markup.inlineKeyboard([
        [Markup.button.callback('📋 View Orders', 'limit_list')],
        [Markup.button.callback('❌ Close', 'cancel')]
      ])
    );
  } catch (error) {
    console.error('Price selection error:', error);
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

/**
 * List orders handler
 */
async function handleListOrders(ctx) {
  try {
    const orders = await getUserLimitOrders(ctx.from.id);
    
    if (orders.length === 0) {
      return ctx.reply(
        'You have no active limit orders.',
        Markup.inlineKeyboard([
          [Markup.button.callback('📝 New Order', 'limit_new')],
          [Markup.button.callback('❌ Close', 'cancel')]
        ])
      );
    }
    
    let message = '📋 Your Active Orders:\n\n';
    
    for (const order of orders) {
      message += `ID: ${order.id}\n` +
        `Sell: ${order.amount} ${order.token_in}\n` +
        `Receive: ${order.token_out}\n` +
        `Price: $${order.price} (${order.is_above ? 'Above' : 'Below'})\n\n`;
    }
    
    await ctx.reply(
      message,
      Markup.inlineKeyboard([
        [Markup.button.callback('📝 New Order', 'limit_new')],
        [Markup.button.callback('❌ Close', 'cancel')]
      ])
    );
  } catch (error) {
    console.error('List orders error:', error);
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

module.exports = {
  handleLimitOrder,
  handleNewLimitOrder,
  handleSellToken,
  handleAmountSelection,
  handleReceiveToken,
  handlePriceCondition,
  handlePriceSelection,
  handleListOrders
}; 