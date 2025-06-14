require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { createNewWallet, importWallet, getWalletForUser } = require('./utils/wallet');
const { supabase } = require('./db/supabase');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Start command handler
bot.command('start', async (ctx) => {
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
});

// Import wallet handler
bot.action('importWallet', async (ctx) => {
  try {
    await ctx.reply(
      'Please send your private key. I will delete it immediately after processing.',
      Markup.inlineKeyboard([
        [Markup.button.callback('❌ Cancel', 'cancel')]
      ])
    );
    
    // Set up one-time message handler
    const messageHandler = async (msgCtx) => {
      if (msgCtx.from.id === ctx.from.id) {
        const privateKey = msgCtx.text;
        
        try {
          const { address, encryptedKey } = await importWallet(privateKey);
          
          // Save to database
          await supabase.from('users').insert({
            id: ctx.from.id,
            address,
            encryptedKey,
            imported: true
          });

          // Delete the message containing private key
          await msgCtx.deleteMessage();
          
          await msgCtx.reply(
            `Wallet imported successfully!\n\nAddress: \`${address}\``,
            { parse_mode: 'Markdown' }
          );
        } catch (error) {
          await msgCtx.reply('Invalid private key. Please try again.');
        }
        
        // Remove the message handler
        bot.telegram.removeListener('message', messageHandler);
      }
    };
    
    bot.on('message', messageHandler);
  } catch (error) {
    console.error('Import wallet error:', error);
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
});

// Cancel handler
bot.action('cancel', async (ctx) => {
  await ctx.deleteMessage();
  await ctx.reply('Operation cancelled.');
});

// Start the bot
bot.launch().then(() => {
  console.log('Bot started successfully');
}).catch((error) => {
  console.error('Failed to start bot:', error);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 