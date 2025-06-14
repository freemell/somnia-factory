const { supabase } = require('../db/supabase');
const { isPriceAtTarget } = require('./priceFetcher');
const { swapTokens } = require('./dex');
const { getWalletForUser } = require('./wallet');
const { generateTradeImage } = require('./imageGen');

/**
 * Creates a new limit order
 */
async function createLimitOrder(userId, tokenIn, tokenOut, amount, price, isAbove = true) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        token_in: tokenIn,
        token_out: tokenOut,
        amount,
        price,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // Start monitoring the order
    monitorLimitOrder(data.id);

    return data;
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
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!order || order.status !== 'pending') return;

    // Check if price target is reached
    const targetReached = await isPriceAtTarget(
      order.token_in,
      order.price,
      order.is_above
    );

    if (targetReached) {
      // Get user's wallet
      const wallet = await getWalletForUser(order.user_id);

      // Execute the trade
      const result = await swapTokens(
        order.amount,
        0, // No minimum amount for limit orders
        order.token_in,
        order.token_out,
        wallet
      );

      if (result.success) {
        // Update order status
        await supabase
          .from('orders')
          .update({
            status: 'executed',
            executed_at: new Date().toISOString()
          })
          .eq('id', orderId);

        // Generate trade image
        const imagePath = await generateTradeImage({
          tokenIn: order.token_in,
          tokenOut: order.token_out,
          amount: order.amount,
          price: order.price,
          txHash: result.txHash
        });

        // Send notification to user
        // Note: You'll need to implement a way to send messages to users
        // This could be through a message queue or direct Telegram API call
        await sendTradeNotification(order.user_id, {
          success: true,
          imagePath,
          txHash: result.txHash
        });
      } else {
        // Update order status to failed
        await supabase
          .from('orders')
          .update({
            status: 'failed',
            executed_at: new Date().toISOString()
          })
          .eq('id', orderId);

        // Send failure notification
        await sendTradeNotification(order.user_id, {
          success: false,
          error: result.error
        });
      }
    } else {
      // Continue monitoring
      setTimeout(() => monitorLimitOrder(orderId), 60000); // Check every minute
    }
  } catch (error) {
    console.error('Error monitoring limit order:', error);
    // Update order status to failed
    await supabase
      .from('orders')
      .update({
        status: 'failed',
        executed_at: new Date().toISOString()
      })
      .eq('id', orderId);
  }
}

/**
 * Gets all pending limit orders for a user
 */
async function getUserLimitOrders(userId) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
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
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        executed_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error cancelling limit order:', error);
    throw new Error('Failed to cancel limit order');
  }
}

module.exports = {
  createLimitOrder,
  getUserLimitOrders,
  cancelLimitOrder
}; 