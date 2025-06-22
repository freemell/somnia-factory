const { ethers } = require('ethers');
const { Markup } = require('telegraf');
const { createLimitOrder, getUserLimitOrders, cancelLimitOrder } = require('../utils/limitOrders');
const { getTokenMetadata } = require('../utils/tokenInfo');
const { getAmountsOut } = require('../utils/dex');
const { limitOrderButtons, persistentButtons, mainMenuButtons } = require('../handlers/inlineButtons');

// Testnet token addresses
const TOKENS = {
  'USDT.g': '0x1234567890123456789012345678901234567890',
  'NIA': '0x2345678901234567890123456789012345678901',
  'PING': '0x3456789012345678901234567890123456789012',
  'PONG': '0x4567890123456789012345678901234567890123'
};

/**
 * Limit order command handler
 */
async function handleLimitOrder(ctx) {
  try {
    await ctx.editMessageText(
      '⏱️ *Limit Orders*\n\nCreate, view, or cancel limit orders:',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(limitOrderButtons)
      }
    );
  } catch (error) {
    console.error('Limit order command error:', error);
    await ctx.editMessageText(
      '❌ Error loading limit orders. Please try again.',
      Markup.inlineKeyboard(persistentButtons)
    );
  }
}

/**
 * Create limit order handler
 */
async function handleCreateLimitOrder(ctx) {
  try {
    await ctx.editMessageText(
      '📝 *Create Limit Order*\n\nSelect token to trade:',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('💰 USDT.g', 'limit_token_USDT.g'),
            Markup.button.callback('🚀 NIA', 'limit_token_NIA'),
            Markup.button.callback('🏓 PING', 'limit_token_PING')
          ],
          [
            Markup.button.callback('🏓 PONG', 'limit_token_PONG'),
            Markup.button.callback('🔄 Refresh', 'refresh'),
            Markup.button.callback('🏠 Menu', 'main_menu')
          ]
        ])
      }
    );
  } catch (error) {
    console.error('Create limit order error:', error);
    await ctx.editMessageText(
      '❌ Error creating limit order. Please try again.',
      Markup.inlineKeyboard(persistentButtons)
    );
  }
}

/**
 * Token selection for limit order
 */
async function handleLimitTokenSelection(ctx) {
  try {
    const tokenSymbol = ctx.match[1];
    const tokenAddress = TOKENS[tokenSymbol];
    
    if (!tokenAddress) {
      await ctx.editMessageText(
        `❌ Token ${tokenSymbol} not found on testnet.`,
        Markup.inlineKeyboard(persistentButtons)
      );
      return;
    }

    await ctx.editMessageText(
      `📝 *Limit Order - ${tokenSymbol}*\n\nSelect order type:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('📈 Buy Limit', `limit_buy_${tokenAddress}`),
            Markup.button.callback('📉 Sell Limit', `limit_sell_${tokenAddress}`),
            Markup.button.callback('⚙️ Settings', 'limit_settings')
          ],
          [
            Markup.button.callback('🔄 Refresh', 'refresh'),
            Markup.button.callback('📊 Info', `info_${tokenAddress}`),
            Markup.button.callback('🏠 Menu', 'main_menu')
          ]
        ])
      }
    );
  } catch (error) {
    console.error('Limit token selection error:', error);
    await ctx.editMessageText(
      '❌ Error selecting token. Please try again.',
      Markup.inlineKeyboard(persistentButtons)
    );
  }
}

/**
 * Buy/Sell limit order handler
 */
async function handleLimitOrderType(ctx) {
  try {
    const orderType = ctx.match[1]; // 'buy' or 'sell'
    const tokenAddress = ctx.match[2];
    
    // Get token metadata
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const tokenInfo = await getTokenMetadata(tokenAddress, provider);
    
    await ctx.editMessageText(
      `📝 *${orderType.toUpperCase()} Limit Order*\n\nSelect amount:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('💰 0.1', `limit_amount_0.1_${orderType}_${tokenAddress}`),
            Markup.button.callback('💰 0.5', `limit_amount_0.5_${orderType}_${tokenAddress}`),
            Markup.button.callback('💰 1.0', `limit_amount_1.0_${orderType}_${tokenAddress}`)
          ],
          [
            Markup.button.callback('💰 2.0', `limit_amount_2.0_${orderType}_${tokenAddress}`),
            Markup.button.callback('💰 5.0', `limit_amount_5.0_${orderType}_${tokenAddress}`),
            Markup.button.callback('💰 10.0', `limit_amount_10.0_${orderType}_${tokenAddress}`)
          ],
          [
            Markup.button.callback('✏️ Custom', `limit_custom_${orderType}_${tokenAddress}`),
            Markup.button.callback('🔄 Refresh', 'refresh'),
            Markup.button.callback('🏠 Menu', 'main_menu')
          ]
        ])
      }
    );
  } catch (error) {
    console.error('Limit order type error:', error);
    await ctx.editMessageText(
      '❌ Error processing limit order type. Please try again.',
      Markup.inlineKeyboard(persistentButtons)
    );
  }
}

/**
 * Amount selection for limit order
 */
async function handleLimitAmountSelection(ctx) {
  try {
    const amount = ctx.match[1];
    const orderType = ctx.match[2];
    const tokenAddress = ctx.match[3];
    
    // Get token metadata
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const tokenInfo = await getTokenMetadata(tokenAddress, provider);
    
    // Get current price
    const path = orderType === 'buy' ? ['USDT.g', tokenAddress] : [tokenAddress, 'USDT.g'];
    const amountIn = ethers.parseUnits('1', 18);
    const amountOut = await getAmountsOut(amountIn, path);
    const currentPrice = parseFloat(ethers.formatUnits(amountOut, 18));
    
    await ctx.editMessageText(
      `📝 *Limit Order Preview*\n\n` +
      `Type: ${orderType.toUpperCase()}\n` +
      `Token: ${tokenInfo.symbol}\n` +
      `Amount: ${amount}\n` +
      `Current Price: $${currentPrice.toFixed(6)}\n\n` +
      `Set target price:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('📈 +10%', `limit_price_${amount}_${orderType}_${tokenAddress}_${(currentPrice * 1.1).toFixed(6)}`),
            Markup.button.callback('📈 +5%', `limit_price_${amount}_${orderType}_${tokenAddress}_${(currentPrice * 1.05).toFixed(6)}`),
            Markup.button.callback('📉 -5%', `limit_price_${amount}_${orderType}_${tokenAddress}_${(currentPrice * 0.95).toFixed(6)}`)
          ],
          [
            Markup.button.callback('📉 -10%', `limit_price_${amount}_${orderType}_${tokenAddress}_${(currentPrice * 0.9).toFixed(6)}`),
            Markup.button.callback('✏️ Custom', `limit_custom_price_${amount}_${orderType}_${tokenAddress}`),
            Markup.button.callback('🔄 Refresh', 'refresh')
          ],
          [
            Markup.button.callback('❌ Cancel', 'limit_cancel'),
            Markup.button.callback('📊 Info', `info_${tokenAddress}`),
            Markup.button.callback('🏠 Menu', 'main_menu')
          ]
        ])
      }
    );
  } catch (error) {
    console.error('Limit amount selection error:', error);
    await ctx.editMessageText(
      '❌ Error calculating price. Please try again.',
      Markup.inlineKeyboard(persistentButtons)
    );
  }
}

/**
 * Price selection for limit order
 */
async function handleLimitPriceSelection(ctx) {
  try {
    const amount = ctx.match[1];
    const orderType = ctx.match[2];
    const tokenAddress = ctx.match[3];
    const targetPrice = ctx.match[4];
    
    // Get token metadata
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const tokenInfo = await getTokenMetadata(tokenAddress, provider);
    
    // Create limit order
    const order = await createLimitOrder(
      ctx.from.id,
      orderType === 'buy' ? 'USDT.g' : tokenAddress,
      orderType === 'buy' ? tokenAddress : 'USDT.g',
      amount,
      targetPrice,
      orderType
    );
    
    await ctx.editMessageText(
      `✅ *Limit Order Created!*\n\n` +
      `Type: ${orderType.toUpperCase()}\n` +
      `Token: ${tokenInfo.symbol}\n` +
      `Amount: ${amount}\n` +
      `Target Price: $${targetPrice}\n` +
      `Order ID: \`${order.id}\`\n\n` +
      `Order will execute when price conditions are met.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('👁️ View Orders', 'limit_view'),
            Markup.button.callback('📝 New Order', 'limit_create'),
            Markup.button.callback('📊 History', 'limit_history')
          ],
          [
            Markup.button.callback('🔄 Refresh', 'refresh'),
            Markup.button.callback('📈 Chart', `chart_${tokenAddress}`),
            Markup.button.callback('🏠 Menu', 'main_menu')
          ]
        ])
      }
    );
  } catch (error) {
    console.error('Limit price selection error:', error);
    await ctx.editMessageText(
      '❌ Error creating limit order. Please try again.',
      Markup.inlineKeyboard(persistentButtons)
    );
  }
}

/**
 * View limit orders handler
 */
async function handleViewLimitOrders(ctx) {
  try {
    const orders = await getUserLimitOrders(ctx.from.id);
    
    if (orders.length === 0) {
      await ctx.editMessageText(
        '📋 *Your Limit Orders*\n\nNo active limit orders found.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback('📝 Create Order', 'limit_create'),
              Markup.button.callback('📊 History', 'limit_history'),
              Markup.button.callback('🔄 Refresh', 'refresh')
            ],
            [
              Markup.button.callback('🏠 Menu', 'main_menu')
            ]
          ])
        }
      );
      return;
    }
    
    let message = '📋 *Your Active Limit Orders*\n\n';
    
    for (const order of orders) {
      const date = new Date(order.created_at).toLocaleDateString();
      message += `🆔 \`${order.id}\`\n`;
      message += `📊 ${order.order_type.toUpperCase()} ${order.amount}\n`;
      message += `💰 Target: $${order.target_price}\n`;
      message += `📅 ${date}\n\n`;
    }
    
    await ctx.editMessageText(
      message,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('❌ Cancel Order', 'limit_cancel'),
            Markup.button.callback('📝 New Order', 'limit_create'),
            Markup.button.callback('📊 History', 'limit_history')
          ],
          [
            Markup.button.callback('🔄 Refresh', 'refresh'),
            Markup.button.callback('⚙️ Settings', 'limit_settings'),
            Markup.button.callback('🏠 Menu', 'main_menu')
          ]
        ])
      }
    );
  } catch (error) {
    console.error('View limit orders error:', error);
    await ctx.editMessageText(
      '❌ Error loading limit orders. Please try again.',
      Markup.inlineKeyboard(persistentButtons)
    );
  }
}

/**
 * Cancel limit order handler
 */
async function handleCancelLimitOrder(ctx) {
  try {
    const orderId = ctx.match[1];
    
    const result = await cancelLimitOrder(orderId, ctx.from.id);
    
    await ctx.editMessageText(
      `✅ *Limit Order Cancelled*\n\nOrder ID: \`${orderId}\`\nStatus: Cancelled`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('👁️ View Orders', 'limit_view'),
            Markup.button.callback('📝 New Order', 'limit_create'),
            Markup.button.callback('📊 History', 'limit_history')
          ],
          [
            Markup.button.callback('🔄 Refresh', 'refresh'),
            Markup.button.callback('🏠 Menu', 'main_menu')
          ]
        ])
      }
    );
  } catch (error) {
    console.error('Cancel limit order error:', error);
    await ctx.editMessageText(
      '❌ Error cancelling limit order. Please try again.',
      Markup.inlineKeyboard(persistentButtons)
    );
  }
}

module.exports = {
  handleLimitOrder,
  handleCreateLimitOrder,
  handleLimitTokenSelection,
  handleLimitOrderType,
  handleLimitAmountSelection,
  handleLimitPriceSelection,
  handleViewLimitOrders,
  handleCancelLimitOrder
}; 