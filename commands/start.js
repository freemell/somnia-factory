const { Telegraf, Markup } = require('telegraf');
const { createNewWallet, validatePrivateKey } = require('../utils/wallet');
const { supabase } = require('../db/supabase');
const { showMainMenu, showWalletChoiceMenu } = require('../utils/menus');

/**
 * Check if a user exists in the database
 */
async function userExists(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

  return !!data && !error;
}

/**
 * Start command handler
 */
async function handleStart(ctx) {
  try {
    const userId = ctx.from.id;
    const isReturning = await userExists(userId);

    if (!isReturning) {
      // First time user - show wallet choice menu
      return showWalletChoiceMenu(ctx);
    }

    // Returning user - show main menu
    return showMainMenu(ctx);
  } catch (error) {
    console.error('Start command error:', error);
    return ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

/**
 * Handle wallet creation
 */
async function handleCreateWallet(ctx) {
  try {
    const userId = ctx.from.id;
    
    // Create new wallet
    const { address, encryptedKey } = await createNewWallet();
    
    // Save to database
    await supabase.from('users').insert({
      id: userId,
      address,
      encryptedKey,
      imported: false
    });

    // Show success message and main menu
    await ctx.reply(
      `✅ New wallet created successfully!\n\nAddress: \`${address}\``,
      { parse_mode: 'Markdown' }
    );
    
    return showMainMenu(ctx);
  } catch (error) {
    console.error('Create wallet error:', error);
    return ctx.reply('Sorry, something went wrong while creating your wallet. Please try again.');
  }
}

/**
 * Handle wallet import
 */
async function handleImportWallet(ctx) {
  try {
    // Prompt for private key
    await ctx.reply(
      'Please send your private key. I will delete the message immediately after processing.',
      Markup.inlineKeyboard([
        [Markup.button.callback('❌ Cancel', 'cancel')]
      ])
    );
  } catch (error) {
    console.error('Import wallet error:', error);
    return ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

/**
 * Handle private key input
 */
async function handlePrivateKeyInput(ctx) {
  try {
    const userId = ctx.from.id;
    const privateKey = ctx.message.text;

    // Delete the message containing the private key
    await ctx.deleteMessage(ctx.message.message_id);

    // Validate private key
    const isValid = await validatePrivateKey(privateKey);
    if (!isValid) {
      return ctx.reply(
        '❌ Invalid private key. Please try again.',
        Markup.inlineKeyboard([
          [Markup.button.callback('🔐 Import Wallet', 'import_wallet')],
          [Markup.button.callback('❌ Cancel', 'cancel')]
        ])
      );
    }

    // Get wallet address from private key
    const { address, encryptedKey } = await createNewWallet(privateKey);
    
    // Save to database
    await supabase.from('users').insert({
      id: userId,
      address,
      encryptedKey,
      imported: true
    });

    // Show success message and main menu
    await ctx.reply(
      `✅ Wallet imported successfully!\n\nAddress: \`${address}\``,
      { parse_mode: 'Markdown' }
    );
    
    return showMainMenu(ctx);
  } catch (error) {
    console.error('Private key input error:', error);
    return ctx.reply('Sorry, something went wrong while importing your wallet. Please try again.');
  }
}

module.exports = {
  handleStart,
  handleCreateWallet,
  handleImportWallet,
  handlePrivateKeyInput
}; 