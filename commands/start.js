const { Telegraf, Markup } = require('telegraf');
const { createNewWallet } = require('../utils/wallet');
const { supabase } = require('../db/supabase');

/**
 * Start command handler
 */
async function handleStart(ctx) {
  try {
    const userId = ctx.from.id;
    
    // Check if user already has a wallet
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (existingUser) {
      return ctx.reply(
        'Welcome back! What would you like to do?',
        Markup.inlineKeyboard([
          [Markup.button.callback('💰 Check Balance', 'balance')],
          [Markup.button.callback('🔄 Trade', 'trade')],
          [Markup.button.callback('⏱️ Limit Order', 'limitOrder')],
          [Markup.button.callback('🌉 Bridge', 'bridge')]
        ])
      );
    }

    // Create new wallet for user
    const { address, encryptedKey } = await createNewWallet();
    
    // Save to database
    await supabase.from('users').insert({
      id: userId,
      address,
      encryptedKey,
      imported: false
    });

    return ctx.reply(
      `Welcome! I've created a new wallet for you:\n\nAddress: \`${address}\`\n\nWhat would you like to do?`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('💰 Check Balance', 'balance')],
          [Markup.button.callback('🔄 Trade', 'trade')],
          [Markup.button.callback('⏱️ Limit Order', 'limitOrder')],
          [Markup.button.callback('🌉 Bridge', 'bridge')],
          [Markup.button.callback('🔑 Import Wallet', 'importWallet')]
        ])
      }
    );
  } catch (error) {
    console.error('Start command error:', error);
    return ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

module.exports = {
  handleStart
}; 