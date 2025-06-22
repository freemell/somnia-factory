const { supabase } = require('../db/supabase');
const { ethers } = require('ethers');
const { 
  saveLimitOrder, 
  getLimitOrders, 
  updateLimitOrder 
} = require('./database');
const { swapTokens, getAmountsOut } = require('./dex');
const { getWalletForUser } = require('./wallet');
const { generateTradeImage } = require('./imageGen');

// Testnet token addresses
const TOKENS = {
  'USDT.g': '0x1234567890123456789012345678901234567890',
  'NIA': '0x2345678901234567890123456789012345678901',
  'PING': '0x3456789012345678901234567890123456789012',
  'PONG': '0x4567890123456789012345678901234567890123'
};

/**
 * Creates a new limit order
 */
async function createLimitOrder(userId, tokenIn, tokenOut, amount, targetPrice, orderType = 'buy') {
  try {
    const orderData = {
      user_id: userId,
      token_in: tokenIn,
      token_out: tokenOut,
      amount: amount,
      target_price: targetPrice,
      order_type: orderType, // 'buy' or 'sell'
      status: 'pending'
    };

    const order = await saveLimitOrder(orderData);
    
    // Start monitoring the order
    setTimeout(() => monitorLimitOrder(order.id), 5000); // Check after 5 seconds

    return order;
  } catch (error) {
    console.error('Error creating limit order:', error);
    throw new Error('Failed to create limit order');
  }
}

/**
 * Monitors a limit order and executes it when conditions are met
 */
async function monitorLimitOrder(orderId) {
  try {
    // Get the order
    const { data: order } = await supabase
      .from('limit_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!order || order.status !== 'pending') return;

    // Get current price
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const path = [order.token_in, order.token_out];
    const amountIn = ethers.parseUnits('1', 18); // 1 token for price calculation
    
    try {
      const amountOut = await getAmountsOut(amountIn, path);
      const currentPrice = parseFloat(ethers.formatUnits(amountOut, 18));
      const targetPrice = parseFloat(order.target_price);

      // Check if conditions are met
      let shouldExecute = false;
      if (order.order_type === 'buy' && currentPrice <= targetPrice) {
        shouldExecute = true;
      } else if (order.order_type === 'sell' && currentPrice >= targetPrice) {
        shouldExecute = true;
      }

      if (shouldExecute) {
        // Execute the order
        const wallet = await getWalletForUser(order.user_id);
        if (!wallet) {
          await updateLimitOrder(orderId, { 
            status: 'failed', 
            error: 'Wallet not found' 
          });
          return;
        }

        const result = await swapTokens(
          ethers.parseUnits(order.amount, 18),
          0, // No minimum amount for limit orders
          order.token_in,
          order.token_out,
          wallet
        );

        if (result.success) {
          // Mark as executed
          await updateLimitOrder(orderId, { 
            status: 'executed', 
            tx_hash: result.txHash,
            executed_at: new Date().toISOString()
          });

          // Generate and send notification image
          const imagePath = await generateTradeImage({
            tokenIn: order.token_in,
            tokenOut: order.token_out,
            amount: order.amount,
            price: currentPrice.toString(),
            txHash: result.txHash,
            type: 'limit_' + order.order_type
          });

          // Note: In a real implementation, you'd send this to the user via Telegram
          console.log(`Limit order ${orderId} executed successfully: ${result.txHash}`);
        } else {
          await updateLimitOrder(orderId, { 
            status: 'failed', 
            error: result.error 
          });
        }
      } else {
        // Continue monitoring (check again in 30 seconds)
        setTimeout(() => monitorLimitOrder(orderId), 30000);
      }
    } catch (error) {
      console.error('Error checking price for limit order:', error);
      // Continue monitoring despite error
      setTimeout(() => monitorLimitOrder(orderId), 60000);
    }
  } catch (error) {
    console.error('Error monitoring limit order:', error);
  }
}

/**
 * Gets all pending limit orders for a user
 */
async function getUserLimitOrders(userId) {
  try {
    return await getLimitOrders(userId);
  } catch (error) {
    console.error('Error getting user limit orders:', error);
    throw new Error('Failed to get limit orders');
  }
}

/**
 * Cancels a limit order
 */
async function cancelLimitOrder(orderId, userId) {
  try {
    const result = await updateLimitOrder(orderId, {
      status: 'cancelled',
      cancelled_at: new Date().toISOString()
    });

    return result;
  } catch (error) {
    console.error('Error cancelling limit order:', error);
    throw new Error('Failed to cancel limit order');
  }
}

/**
 * Gets limit order by ID
 */
async function getLimitOrder(orderId) {
  try {
    const { data, error } = await supabase
      .from('limit_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting limit order:', error);
    throw new Error('Failed to get limit order');
  }
}

/**
 * Background process to check all pending limit orders
 */
async function checkAllLimitOrders() {
  try {
    const { data: orders, error } = await supabase
      .from('limit_orders')
      .select('*')
      .eq('status', 'pending');

    if (error) throw error;

    for (const order of orders) {
      monitorLimitOrder(order.id);
    }
  } catch (error) {
    console.error('Error checking all limit orders:', error);
  }
}

/**
 * Start background monitoring
 */
function startLimitOrderMonitoring() {
  // Check all orders every 5 minutes
  setInterval(checkAllLimitOrders, 5 * 60 * 1000);
  console.log('Limit order monitoring started');
}

module.exports = {
  createLimitOrder,
  getUserLimitOrders,
  cancelLimitOrder,
  getLimitOrder,
  startLimitOrderMonitoring,
  checkAllLimitOrders
}; 