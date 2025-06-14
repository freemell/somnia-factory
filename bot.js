require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { mainMenuButtons, persistentButtons } = require('./handlers/inlineButtons');
const { handleContractAddress, handleBuyAmount } = require('./handlers/inputHandler');
const { detectContractAddress } = require('./utils/caDetector');

// Initialize bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Start command
bot.command('start', async (ctx) => {
  await ctx.reply(
    'Welcome to Somnia Trading Bot! 🚀\n\n' +
    'Send me a token contract address to get started.',
    Markup.inlineKeyboard(mainMenuButtons)
  );
});

// Help command
bot.command('help', async (ctx) => {
  await ctx.reply(
    '*Somnia Trading Bot Help*\n\n' +
    '1. Send a token contract address to view token info\n' +
    '2. Use the buttons below to navigate\n' +
    '3. Click "Buy" to start trading\n' +
    '4. Set up alerts for price changes\n' +
    '5. Manage your wallet and settings\n\n' +
    'Need more help? Contact @support',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(mainMenuButtons)
    }
  );
});

// Handle contract address input
bot.on('text', async (ctx) => {
  const address = detectContractAddress(ctx.message.text);
  if (address) {
    await handleContractAddress(ctx);
  }
});

// Handle buy amount selection
bot.action(/buy_(\d+)_(.+)/, async (ctx) => {
  await handleBuyAmount(ctx);
});

// Handle main menu buttons
bot.action('main_menu', async (ctx) => {
  await ctx.editMessageText(
    'Welcome to Somnia Trading Bot! 🚀\n\n' +
    'Send me a token contract address to get started.',
    Markup.inlineKeyboard(mainMenuButtons)
  );
});

// Handle buy button
bot.action('buy', async (ctx) => {
  await ctx.editMessageText(
    'Enter a token contract address to buy:',
    Markup.inlineKeyboard(persistentButtons)
  );
});

// Handle fund button
bot.action('fund', async (ctx) => {
  await ctx.editMessageText(
    'Send SOM to this address to fund your wallet:\n\n' +
    '`0x...`\n\n' +
    'Minimum deposit: 0.1 SOM',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(persistentButtons)
    }
  );
});

// Handle alerts button
bot.action('alerts', async (ctx) => {
  await ctx.editMessageText(
    'Set up price alerts for your favorite tokens:\n\n' +
    '1. Send a token contract address\n' +
    '2. Choose alert type\n' +
    '3. Set price target\n\n' +
    'You will be notified when the price reaches your target.',
    Markup.inlineKeyboard(persistentButtons)
  );
});

// Handle help button
bot.action('help', async (ctx) => {
  await ctx.editMessageText(
    '*Somnia Trading Bot Help*\n\n' +
    '1. Send a token contract address to view token info\n' +
    '2. Use the buttons below to navigate\n' +
    '3. Click "Buy" to start trading\n' +
    '4. Set up alerts for price changes\n' +
    '5. Manage your wallet and settings\n\n' +
    'Need more help? Contact @support',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(persistentButtons)
    }
  );
});

// Handle referrals button
bot.action('referrals', async (ctx) => {
  await ctx.editMessageText(
    'Invite friends to earn rewards!\n\n' +
    'Your referral link:\n' +
    '`https://t.me/your_bot?start=ref_${ctx.from.id}`\n\n' +
    'Earn 1% of all trades made by your referrals!',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(persistentButtons)
    }
  );
});

// Handle notifications button
bot.action('notifications', async (ctx) => {
  await ctx.editMessageText(
    'Notification Settings:\n\n' +
    '1. Price alerts\n' +
    '2. Trade confirmations\n' +
    '3. Wallet updates\n' +
    '4. System announcements\n\n' +
    'Click the buttons below to toggle settings.',
    Markup.inlineKeyboard(persistentButtons)
  );
});

// Handle wallet button
bot.action('wallet', async (ctx) => {
  await ctx.editMessageText(
    'Your Wallet:\n\n' +
    'Balance: 0 SOM\n' +
    'Pending: 0 SOM\n' +
    'Total Value: $0.00\n\n' +
    'Click "Fund" to add SOM to your wallet.',
    Markup.inlineKeyboard(persistentButtons)
  );
});

// Handle settings button
bot.action('settings', async (ctx) => {
  await ctx.editMessageText(
    'Settings:\n\n' +
    '1. Slippage tolerance\n' +
    '2. Default gas price\n' +
    '3. Language\n' +
    '4. Theme\n\n' +
    'Click the buttons below to change settings.',
    Markup.inlineKeyboard(persistentButtons)
  );
});

// Handle refresh button
bot.action('refresh', async (ctx) => {
  await ctx.editMessageText(
    'Refreshing...',
    Markup.inlineKeyboard(persistentButtons)
  );
  
  // Refresh token info if available
  const message = ctx.callbackQuery.message;
  if (message && message.text) {
    const address = detectContractAddress(message.text);
    if (address) {
      await handleContractAddress(ctx);
    }
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply(
    'Sorry, something went wrong. Please try again.',
    Markup.inlineKeyboard(persistentButtons)
  );
});

// Start bot
bot.launch().then(() => {
  console.log('Bot started successfully!');
}).catch((err) => {
  console.error('Failed to start bot:', err);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 