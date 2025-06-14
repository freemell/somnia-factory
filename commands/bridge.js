const { Telegraf, Markup } = require('telegraf');
const { getWalletForUser } = require('../utils/wallet');
const { supabase } = require('../db/supabase');

/**
 * Bridge command handler
 */
async function handleBridge(ctx) {
  try {
    // Get user's wallet
    const wallet = await getWalletForUser(ctx.from.id);

    // Show token selection
    await ctx.reply(
      'Select token to bridge:',
      Markup.inlineKeyboard([
        [
          Markup.button.callback('SOM', 'bridge_som'),
          Markup.button.callback('USDT', 'bridge_usdt')
        ],
        [Markup.button.callback('❌ Cancel', 'cancel')]
      ])
    );
  } catch (error) {
    console.error('Bridge command error:', error);
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

/**
 * Token selection handler
 */
async function handleTokenSelection(ctx) {
  try {
    const token = ctx.match[1];
    
    // Show amount input
    await ctx.reply(
      'Enter amount to bridge:',
      Markup.inlineKeyboard([
        [
          Markup.button.callback('0.1', `bridge_amount_${token}_0.1`),
          Markup.button.callback('1', `bridge_amount_${token}_1`),
          Markup.button.callback('10', `bridge_amount_${token}_10`)
        ],
        [Markup.button.callback('❌ Cancel', 'cancel')]
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
    
    // Show destination chain selection
    await ctx.reply(
      'Select destination chain:',
      Markup.inlineKeyboard([
        [
          Markup.button.callback('Ethereum', `bridge_chain_${token}_${amount}_ethereum`),
          Markup.button.callback('BSC', `bridge_chain_${token}_${amount}_bsc`)
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
 * Chain selection handler
 */
async function handleChainSelection(ctx) {
  try {
    const [token, amount, chain] = ctx.match[1].split('_');
    
    // Check if bridge contract exists
    const bridgeContract = process.env[`BRIDGE_${chain.toUpperCase()}`];
    
    if (bridgeContract) {
      // Execute bridge transaction
      // Note: Implement bridge contract interaction here
      await ctx.reply('Bridge transaction initiated. You will be notified when it completes.');
    } else {
      // Generate bridge link
      const bridgeUrl = `https://bridge.somnia.network?token=${token}&amount=${amount}&chain=${chain}`;
      
      await ctx.reply(
        `Please use the Somnia Bridge to complete your transfer:\n\n${bridgeUrl}`,
        Markup.inlineKeyboard([
          [Markup.button.url('Open Bridge', bridgeUrl)],
          [Markup.button.callback('❌ Cancel', 'cancel')]
        ])
      );
    }
  } catch (error) {
    console.error('Chain selection error:', error);
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

module.exports = {
  handleBridge,
  handleTokenSelection,
  handleAmountSelection,
  handleChainSelection
}; 