const { Markup } = require('telegraf');
const { getWalletForUser } = require('./wallet');
const { getTokenPrice } = require('./priceFetcher');

/**
 * Format wallet address for display (first 8 + last 6 chars)
 */
function formatWalletAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

/**
 * Show the main menu interface for returning users
 */
async function showMainMenu(ctx) {
  try {
    // Get user's wallet and balance
    const wallet = await getWalletForUser(ctx.from.id);
    const balance = await wallet.getBalance();
    const sttPrice = await getTokenPrice('STT');
    const usdValue = (parseFloat(balance) * sttPrice).toFixed(2);

    const welcomeMessage = 
      '🔗 Chain: Somnia · STT\n' +
      `📬 Wallet: \`${formatWalletAddress(wallet.address)}\`\n\n` +
      `💰 Balance: *${parseFloat(balance).toFixed(3)} STT* (~$${usdValue})\n\n` +
      '—\n\n' +
      '🔄 Tap *Refresh* to update your current balance.\n\n' +
      '📢 Join the Insomniacs Telegram: @InsomniaHQ\n' +
      'Follow updates on X: https://x.com/InsomniaTestnet\n\n' +
      '💡 You can reuse the *same wallet and settings* across all our testnet bots — optimized for Somnia speed.\n\n' +
      '⚠️ Never click unknown links in ads or popups.\n' +
      'Insomnia Bot will never ask for your private key.';

    const mainMenuButtons = [
      [
        Markup.button.callback('Buy', 'buy'),
        Markup.button.callback('Sell', 'sell')
      ],
      [
        Markup.button.callback('Positions', 'positions'),
        Markup.button.callback('Limit Orders', 'limit')
      ],
      [
        Markup.button.callback('DCA Orders', 'dca'),
        Markup.button.callback('Referrals 💰', 'referrals')
      ],
      [
        Markup.button.callback('Watchlist ⭐', 'watchlist'),
        Markup.button.callback('Settings', 'settings')
      ],
      [
        Markup.button.callback('🔄 Refresh', 'refresh')
      ]
    ];

    return ctx.replyWithMarkdownV2(
      welcomeMessage,
      Markup.inlineKeyboard(mainMenuButtons)
    );
  } catch (error) {
    console.error('Error showing main menu:', error);
    return ctx.reply(
      'Sorry, something went wrong while loading your wallet info. Please try again.',
      Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Refresh', 'refresh')]
      ])
    );
  }
}

/**
 * Show the wallet creation choice menu
 */
function showWalletChoiceMenu(ctx) {
  return ctx.reply(
    '👋 Welcome to Insomnia Bot — the fastest way to trade testnet tokens on Somnia.\n\nWould you like to:',
    Markup.inlineKeyboard([
      [
        Markup.button.callback('🧬 Create New Wallet', 'create_wallet'),
        Markup.button.callback('🔐 Import Existing Wallet', 'import_wallet')
      ]
    ])
  );
}

module.exports = {
  showMainMenu,
  showWalletChoiceMenu
}; 