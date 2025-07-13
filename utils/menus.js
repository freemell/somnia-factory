const { Markup } = require('telegraf');
const { getWalletForUser } = require('./wallet');
const { ethers } = require('ethers');
const { mainMenuButtons } = require('../handlers/inlineButtons');

/**
 * Show the main menu interface for returning users
 */
async function showMainMenu(ctx) {
  try {
    console.log('🔍 [DEBUG] showMainMenu called for user:', ctx.from.id);
    
    // Get user's wallet
    const wallet = await getWalletForUser(ctx.from.id);
    
    if (!wallet) {
      console.log('🔍 [DEBUG] No wallet found, showing wallet choice menu');
      return showWalletChoiceMenu(ctx);
    }

    console.log('🔍 [DEBUG] Wallet found, address:', wallet.address);

    let balanceFormatted = 'N/A';
    try {
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const balance = await provider.getBalance(wallet.address);
        balanceFormatted = parseFloat(ethers.formatUnits(balance, 18)).toFixed(3);
        console.log('🔍 [DEBUG] Wallet balance:', balanceFormatted);
    } catch (rpcError) {
        console.error('🔍 [DEBUG] Could not fetch balance due to RPC error:', rpcError.shortMessage || rpcError.message);
        balanceFormatted = 'N/A (RPC Down)';
    }

    const welcomeMessage =
      '🔗 *Chain:* Somnia · STT\n' +
      '📬 *Wallet:* `' + wallet.address + '`\n\n' +
      '💰 *Balance:* ' + balanceFormatted + ' STT\n\n' +
      '—\n\n' +
      '🔄 Tap *Refresh* to update your current balance\\.\n\n' +
      '💡 You can reuse the *same wallet and settings* across all our testnet bots — optimized for Somnia speed\\.\n\n' +
      '⚡️ Somnia is a lightning\\-fast L1 testnet for Insomniac traders\\. Gas is subsidized for testnet trades\\.\n\n' +
      '⚠️ Never click unknown links in ads or popups\\.\n' +
      'Insomnia Bot will never ask for your private key\\.';

    console.log('🔍 [DEBUG] Using mainMenuButtons from inlineButtons.js');
    console.log('🔍 [DEBUG] mainMenuButtons structure:', JSON.stringify(mainMenuButtons, null, 2));

    // Create custom buttons with copy address functionality
    const customButtons = [
      [
        Markup.button.callback('📋 Copy Address', `copy_address_${wallet.address}`),
        Markup.button.callback('🔄 Refresh', 'refresh')
      ],
      ...mainMenuButtons.slice(1) // Add the rest of the main menu buttons
    ];

    return ctx.reply(
      welcomeMessage,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(customButtons)
      }
    );
  } catch (error) {
    console.error('🔍 [DEBUG] Show main menu error (outer catch):', error);
    return ctx.reply('An unexpected error occurred. Please try again later.');
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
  
  // Check if there's no liquidity
  if (amountEstimates._noLiquidity || amountEstimates._error) {
    const { getLiquidityGuidance } = require('./dex');
    const guidance = getLiquidityGuidance(tokenAddress, tokenInfo.symbol);
    
    const buttons = [
      [
        Markup.button.callback('🔄 Try Again', `refresh_token_${tokenAddress}`),
        Markup.button.callback('🏠 Main Menu', 'main_menu')
      ],
      [
        Markup.button.callback('🌐 QuickSwap', 'https://quickswap.exchange/#/swap?chain=somnia'),
        Markup.button.callback('🔍 Explorer', 'https://shannon-explorer.somnia.network')
      ]
    ];
    
    return {
      message: guidance,
      buttons: Markup.inlineKeyboard(buttons)
    };
  }
  
  // Format estimates
  const estimatesFormatted = {};
  for (const [amount, estimate] of Object.entries(amountEstimates)) {
    if (estimate) {
      estimatesFormatted[amount] = ethers.formatUnits(estimate, tokenInfo.decimals);
    }
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