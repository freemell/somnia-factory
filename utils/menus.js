const { Markup } = require('telegraf');
const { getWalletForUser } = require('./wallet');
const { ethers } = require('ethers');

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
    
    if (!wallet) {
      // No wallet found, show wallet creation menu
      return showWalletChoiceMenu(ctx);
    }

    const balance = await wallet.getBalance();

    const welcomeMessage = 
      '🔗 Chain: Somnia · STT\n' +
      `📬 Wallet: \`${formatWalletAddress(wallet.address)}\`\n\n` +
      `💰 Balance: *${parseFloat(ethers.formatUnits(balance, 18)).toFixed(3)} STT*\n\n` +
      '—\n\n' +
      '🔄 Tap *Refresh* to update your current balance.\n\n' +
      '📢 Join the Insomniacs Telegram: @InsomniaHQ\n' +
      'Follow updates on X: https://x.com/InsomniaTestnet\n\n' +
      '💡 You can reuse the *same wallet and settings* across all our testnet bots — optimized for Somnia speed.\n\n' +
      '⚠️ Never click unknown links in ads or popups.\n' +
      'Insomnia Bot will never ask for your private key.';

    const mainMenuButtons = [
      [
        Markup.button.callback('🔄 Buy', 'buy'),
        Markup.button.callback('💰 Fund', 'fund'),
        Markup.button.callback('🌉 Bridge', 'bridge')
      ],
      [
        Markup.button.callback('📊 Trade', 'trade'),
        Markup.button.callback('⏱️ Limits', 'limits'),
        Markup.button.callback('📈 History', 'history')
      ],
      [
        Markup.button.callback('👛 Wallet', 'wallet'),
        Markup.button.callback('🔔 Alerts', 'alerts'),
        Markup.button.callback('❓ Help', 'help')
      ]
    ];

    return ctx.reply(
      welcomeMessage,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(mainMenuButtons)
      }
    );
  } catch (error) {
    console.error('Show main menu error:', error);
    // If there's an error, show wallet creation menu
    return showWalletChoiceMenu(ctx);
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

/**
 * Render buy menu for a token
 */
function renderBuyMenu(tokenInfo, amountEstimates, sttBalance, tokenAddress) {
  const sttBalanceFormatted = ethers.formatUnits(sttBalance, 18);
  
  // Format estimates
  const estimatesFormatted = {};
  for (const [amount, estimate] of Object.entries(amountEstimates)) {
    estimatesFormatted[amount] = ethers.formatUnits(estimate, tokenInfo.decimals);
  }
  
  // Calculate 1 STT ≈ X TOKEN
  const oneSTTEstimate = estimatesFormatted['1'] || '0';
  
  const message = `🔄 *Buy ${tokenInfo.name} ($${tokenInfo.symbol})*\n\n` +
                 `👛 Wallet STT: ${parseFloat(sttBalanceFormatted).toFixed(2)} STT\n` +
                 `💱 1 STT ≈ ${parseFloat(oneSTTEstimate).toLocaleString()} ${tokenInfo.symbol}\n\n` +
                 `Choose an amount to swap:`;
  
  const buttons = [
    [
      Markup.button.callback(`0.1 STT`, `buy_amount_0.1_${tokenAddress}`),
      Markup.button.callback(`1 STT`, `buy_amount_1_${tokenAddress}`),
      Markup.button.callback(`5 STT`, `buy_amount_5_${tokenAddress}`)
    ],
    [
      Markup.button.callback(`🔄 Refresh`, `refresh_token_${tokenAddress}`),
      Markup.button.callback(`⬅️ Back`, `main_menu`),
      Markup.button.callback(`🛒 Swap`, `swap_last_${tokenAddress}`)
    ]
  ];
  
  return {
    message,
    buttons: Markup.inlineKeyboard(buttons)
  };
}

/**
 * Render error message for invalid token
 */
function renderInvalidTokenMessage() {
  const message = `❌ *Invalid Token*\n\n` +
                 `The provided address is not a valid or deployed token on Somnia Testnet.\n\n` +
                 `Please check the address and try again.`;
  
  const buttons = Markup.inlineKeyboard([
    [Markup.button.callback(`⬅️ Back to Menu`, `main_menu`)]
  ]);
  
  return {
    message,
    buttons
  };
}

/**
 * Render swap confirmation message
 */
function renderSwapConfirmation(tokenInfo, amount, estimatedOutput, tokenAddress) {
  const message = `✅ *Swap Confirmation*\n\n` +
                 `📤 Send: ${amount} STT\n` +
                 `📥 Receive: ~${parseFloat(ethers.formatUnits(estimatedOutput, tokenInfo.decimals)).toFixed(6)} ${tokenInfo.symbol}\n` +
                 `💱 Token: ${tokenInfo.name}\n\n` +
                 `Slippage: 1%\n` +
                 `Gas: ~300,000`;
  
  const buttons = Markup.inlineKeyboard([
    [
      Markup.button.callback(`✅ Confirm`, `confirm_swap_${amount}_${tokenAddress}`),
      Markup.button.callback(`❌ Cancel`, `cancel_swap_${tokenAddress}`)
    ],
    [
      Markup.button.callback(`🔄 Refresh`, `refresh_token_${tokenAddress}`),
      Markup.button.callback(`⬅️ Back`, `main_menu`)
    ]
  ]);
  
  return {
    message,
    buttons
  };
}

module.exports = {
  showMainMenu,
  showWalletChoiceMenu,
  renderBuyMenu,
  renderInvalidTokenMessage,
  renderSwapConfirmation
}; 