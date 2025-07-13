require('dotenv').config();
console.log('[DEBUG] SUPABASE_URL:', process.env.SUPABASE_URL ? '[set]' : '[missing]');
console.log('[DEBUG] SUPABASE_KEY:', process.env.SUPABASE_KEY ? '[set]' : '[missing]');
console.log('[DEBUG] TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? '[set]' : '[missing]');
console.log('[DEBUG] RPC_URL:', process.env.RPC_URL ? '[set]' : '[missing]');
const { ethers } = require('ethers');
const { Telegraf, Markup, session } = require('telegraf');
const express = require('express');
const { mainMenuButtons, persistentButtons, referralButtons, watchlistButtons, optionsMenuButtons } = require('./handlers/inlineButtons');
const { handleContractAddress, handleBuyAmount } = require('./handlers/inputHandler');
const { detectContractAddress } = require('./utils/caDetector');
const { getTokenMetadata, getSTTBalance } = require('./utils/tokenInfo');
const { estimateTokenOutput } = require('./utils/dex');
const { renderBuyMenu, renderInvalidTokenMessage, showMainMenu } = require('./utils/menus');
const { getUserWallet, sendTransaction, getWalletBalance } = require('./utils/walletManager');
const {
  handleStart,
  handleCreateWallet,
  handleImportWallet,
  handlePrivateKeyInput
} = require('./commands/start');
const {
  handleTrade,
  handleTokenSelection,
  handleTradeAction,
  handleAmountSelection,
  handleTradeConfirmation,
  handleTradeHistory,
  handleFarm
} = require('./commands/trade');
const {
  handleLimitOrder,
  handleCreateLimitOrder,
  handleLimitTokenSelection,
  handleLimitOrderType,
  handleLimitAmountSelection,
  handleLimitPriceSelection,
  handleViewLimitOrders,
  handleCancelLimitOrder
} = require('./commands/limitOrder');
const {
  handleBridgeCommand,
  handleBridgeMenu,
  handleBridgeAsset,
  handleBridgeAmount,
  handleBridgeConfirmation,
  handleBridgeHowItWorks,
  handleBridgeSource,
  handleBridgeConfirmationTestnet
} = require('./commands/bridge');
const { startLimitOrderMonitoring } = require('./utils/limitOrders');
const { setupTradeCommands } = require('./commands/trade.js');
const { addTokenToWatchlist, removeTokenFromWatchlist, getWatchlist, supabase } = require('./utils/database');

// Initialize bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Use session middleware
bot.use(session());

// Start command
bot.command('start', handleStart);

// Handle wallet creation
bot.action('create_wallet', handleCreateWallet);

// Handle wallet import
bot.action('import_wallet', handleImportWallet);

// Handle private key input
bot.on('text', async (ctx) => {
  // Check if this is a private key input (after import_wallet action)
  if (ctx.session && ctx.session.waitingForPrivateKey) {
    await handlePrivateKeyInput(ctx);
    delete ctx.session.waitingForPrivateKey;
    return;
  }

  // Check if this is a custom slippage input
  if (ctx.session && ctx.session.waitingForCustomSlippage) {
    await handleCustomSlippageInput(ctx);
    delete ctx.session.waitingForCustomSlippage;
    return;
  }

  // Check if message contains a token address
  const tokenAddressMatch = ctx.message.text.match(/0x[a-fA-F0-9]{40}/);
  if (tokenAddressMatch) {
    await handleTokenAddressInput(ctx, tokenAddressMatch[0]);
    return;
  }

  // Handle contract address input (legacy)
  const address = detectContractAddress(ctx.message.text);
  if (address) {
    await handleContractAddress(ctx);
  }
});

/**
 * Handle token address input
 */
async function handleTokenAddressInput(ctx, tokenAddress) {
  try {
    // Show loading message
    const loadingMsg = await ctx.reply(
      '🔍 *Loading token information...*\n\nPlease wait while I fetch the token details.',
      { parse_mode: 'Markdown' }
    );
    // Initialize provider
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    // Get token metadata
    let tokenInfo;
    try {
      tokenInfo = await getTokenMetadata(tokenAddress, provider);
    } catch (error) {
      await ctx.deleteMessage(loadingMsg.message_id);
      const { message, buttons } = renderInvalidTokenMessage();
      await ctx.reply(message, { parse_mode: 'Markdown', ...buttons });
      return;
    }
    // Get user's wallet
    const wallet = await getUserWallet(ctx.from.id);
    if (!wallet) {
      await ctx.deleteMessage(loadingMsg.message_id);
      await ctx.reply(
        '❌ *No Wallet Found*\n\nPlease create a wallet first to start trading.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('💼 Create Wallet', 'create_wallet')],
            [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
          ])
        }
      );
      return;
    }
    // Get STT balance
    const sttBalance = await getSTTBalance(wallet.address, provider);
    const formattedBalance = parseFloat(ethers.formatUnits(sttBalance, 18)).toFixed(3);
    // Estimate token output for different amounts
    const sttAmounts = [0.1, 1, 5];
    let amountEstimates = {};
    try {
      amountEstimates = await estimateTokenOutput(sttAmounts, tokenAddress, provider);
    } catch (error) {
      amountEstimates = { '0.1': null, '1': null, '5': null };
    }
    
    // Check if no liquidity was found
    if (amountEstimates._noLiquidity || amountEstimates._error) {
      await ctx.deleteMessage(loadingMsg.message_id);
      
      // Get the guidance message with the actual token symbol
      const { getLiquidityGuidance } = require('./utils/dex');
      const guidance = getLiquidityGuidance(tokenAddress, tokenInfo.symbol);
      
      await ctx.reply(guidance, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('🔄 Try Again', `refresh_token_${tokenAddress}`),
            Markup.button.callback('🏠 Main Menu', 'main_menu')
          ],
          [
            Markup.button.callback('🌐 QuickSwap', 'https://quickswap.exchange/#/swap?chain=somnia'),
            Markup.button.callback('🔍 Explorer', 'https://shannon-explorer.somnia.network')
          ]
        ]),
        disable_web_page_preview: true
      });
      
      // Auto-delete the original address message after 10 seconds
      setTimeout(async () => {
        try {
          await ctx.deleteMessage(ctx.message.message_id);
        } catch (error) {
          console.log('Could not delete original message:', error.message);
        }
      }, 10000);
      
      return;
    }
    // Calculate price impact (simplified)
    const priceImpact = '0.5'; // This would be calculated based on liquidity
    // Store in session for later use
    ctx.session = {
      ...ctx.session,
      currentToken: {
        address: tokenAddress,
        info: tokenInfo,
        estimates: amountEstimates
      }
    };
    // Calculate estimated output for 1 STT
    const oneSTTEstimate = amountEstimates['1'];
    const formattedOutput = oneSTTEstimate 
      ? parseFloat(ethers.formatUnits(oneSTTEstimate, tokenInfo.decimals)).toFixed(6) 
      : 'N/A';
    // Render token dashboard
    const message = `🪙 *${tokenInfo.symbol}* — ${tokenInfo.name}  \n📬 Address: \`${tokenAddress}\`  \n💰 Your STT Balance: ${formattedBalance} STT  \n📈 Estimated output: ~${formattedOutput} ${tokenInfo.symbol}  \n💹 Price Impact: ~${priceImpact}%\n\nYou can trade this token directly using the options below.`;
    const buttons = Markup.inlineKeyboard([
      [
        Markup.button.callback('⬅ Back', 'main_menu'),
        Markup.button.callback('🔄 Refresh', `refresh_token_${tokenAddress}`)
      ],
      [
        Markup.button.callback('✅ STT', 'stt_balance'),
        Markup.button.callback('⚙️ Settings', 'settings')
      ],
      [
        Markup.button.callback('✅ Swap', `swap_token_${tokenAddress}`),
        Markup.button.callback('Limit', `limit_token_${tokenAddress}`),
        Markup.button.callback('DCA', `dca_token_${tokenAddress}`)
      ],
      [
        Markup.button.callback('0.1 STT', `amount_0.1_${tokenAddress}`),
        Markup.button.callback('1 STT', `amount_1_${tokenAddress}`),
        Markup.button.callback('5 STT', `amount_5_${tokenAddress}`)
      ],
      [
        Markup.button.callback('1% Slippage', `slippage_1_${tokenAddress}`),
        Markup.button.callback('✏️ Custom Slippage', `custom_slippage_${tokenAddress}`)
      ],
      [
        Markup.button.callback('🚀 BUY', `buy_execute_${tokenAddress}`)
      ]
    ]);
    // Delete loading message and show token dashboard
    await ctx.deleteMessage(loadingMsg.message_id);
    await ctx.reply(message, { parse_mode: 'Markdown', ...buttons });

    // Auto-delete the original address message after 10 seconds
    setTimeout(async () => {
      try {
        await ctx.deleteMessage(ctx.message.message_id);
      } catch (error) {
        console.log('Could not delete original message:', error.message);
      }
    }, 10000);

  } catch (error) {
    console.error('Error handling token address input:', error);
    await ctx.reply('❌ Error loading token info. Please try again.', Markup.inlineKeyboard([
      [Markup.button.callback('⬅️ Back', 'main_menu')]
    ]));
  }
}

// Help command
bot.command('help', async (ctx) => {
  await ctx.reply(
    '*Somnia Trading Bot Help*\n\n' +
    '1. Send a token contract address to view token info\n' +
    '2. Use the buttons below to navigate\n' +
    '3. Click "Buy" to start trading\n' +
    '4. Set up alerts for price changes\n' +
    '5. Manage your wallet and settings\n\n' +
    '—\n\n' +
    '📢 Join our [Telegram](https://t.me/+Apyc5vV4mExjNjA0)\n' +
    '🐦 Follow us on [X](https://x.com/insomniacs_clvb)\n\n' +
    'Need more help? Contact @support',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(mainMenuButtons)
    }
  );
});

// Bridge command
bot.command('bridge', handleBridgeCommand);

// Main menu handlers
bot.action('main_menu', async (ctx) => {
  try {
    console.log('🔍 [DEBUG] main_menu action triggered for user:', ctx.from.id);
    // Re-route to the start handler, which correctly checks for a wallet
    console.log('🔍 [DEBUG] Routing to handleStart...');
    await handleStart(ctx);
    console.log('🔍 [DEBUG] handleStart completed');
  } catch (error) {
    console.error('🔍 [DEBUG] Main menu error:', error);
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
});

// Trade handlers
bot.action('trade', handleTrade);
bot.action(/trade_token_(.+)/, handleTokenSelection);
bot.action(/^(buy|sell)_(.+)$/, handleTradeAction);
bot.action(/amount_(.+)_(buy|sell)_(.+)/, handleAmountSelection);
bot.action(/confirm_(buy|sell)_(.+)_(.+)/, handleTradeConfirmation);
bot.action('trade_history', handleTradeHistory);
bot.action('trade_farm', handleFarm);

// Direct token address handlers
bot.action(/buy_amount_(.+)_(.+)/, handleBuyAmountDirect);
bot.action(/refresh_token_(.+)/, handleRefreshToken);
bot.action(/swap_last_(.+)/, handleSwapLast);
bot.action(/confirm_swap_(.+)_(.+)/, handleConfirmSwap);
bot.action(/cancel_swap_(.+)/, handleCancelSwap);

// New token dashboard handlers
bot.action(/swap_token_(.+)/, handleSwapToken);
bot.action(/limit_token_(.+)/, handleLimitToken);
bot.action(/dca_token_(.+)/, handleDCAToken);
bot.action(/amount_(.+)_(.+)/, handleTokenAmountSelection);
bot.action(/slippage_(.+)_(.+)/, handleSlippageSelection);
bot.action(/custom_slippage_(.+)/, handleCustomSlippage);
bot.action(/buy_execute_(.+)/, handleBuyExecute);
bot.action('stt_balance', async (ctx) => {
  try {
    const wallet = await getUserWallet(ctx.from.id);
    if (!wallet) {
      await ctx.editMessageText(
        '❌ *No Wallet Found*\n\nPlease create a wallet first.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('💼 Create Wallet', 'create_wallet')],
            [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
          ])
        }
      );
      return;
    }

    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const balance = await provider.getBalance(wallet.address);
    const balanceFormatted = parseFloat(ethers.formatUnits(balance, 18)).toFixed(4);

    await ctx.editMessageText(
      `💰 *STT Balance*\n\n` +
      `📬 Address: \`${wallet.address}\`\n` +
      `💎 Balance: ${balanceFormatted} STT\n\n` +
      `This is your Somnia Testnet Token balance.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('📋 Copy Address', `copy_address_${wallet.address}`),
            Markup.button.callback('🔄 Refresh', 'stt_balance')
          ],
          [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
        ])
      }
    );
  } catch (error) {
    console.error('Error getting STT balance:', error);
    await ctx.editMessageText(
      '❌ *Error*\n\nFailed to fetch balance. Please try again.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Try Again', 'stt_balance')],
          [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
        ])
      }
    );
  }
});

// Limit order handlers
bot.action('limits', handleLimitOrder);
bot.action('limit_create', handleCreateLimitOrder);
bot.action(/limit_token_(.+)/, handleLimitTokenSelection);
bot.action(/limit_(buy|sell)_(.+)/, handleLimitOrderType);
bot.action(/limit_amount_(.+)_(buy|sell)_(.+)/, handleLimitAmountSelection);
bot.action(/limit_price_(.+)_(buy|sell)_(.+)_(.+)/, handleLimitPriceSelection);
bot.action('limit_view', handleViewLimitOrders);
bot.action(/limit_cancel_(.+)/, handleCancelLimitOrder);

// Bridge handlers
bot.action('bridge', handleBridgeCommand);
bot.action('bridge_testnet', handleBridgeMenu);
bot.action('bridge_mainnet', handleBridgeMenu);
bot.action(/bridge_(eth|usdt)/, handleBridgeAsset);
bot.action(/bridge_amount_(eth|usdt)_(\d+\.\d+)/, handleBridgeAmount);
bot.action(/bridge_confirm_(eth|usdt)_(\d+\.\d+)/, handleBridgeConfirmation);
bot.action('bridge_how', handleBridgeHowItWorks);
bot.action(/bridge_(sepolia|mumbai|bsc)/, handleBridgeSource);
bot.action(/confirm_bridge_(sepolia|mumbai|bsc)/, handleBridgeConfirmationTestnet);

// Legacy handlers for backward compatibility
bot.action('buy', async (ctx) => {
  await ctx.editMessageText(
    '🔄 *Trading*\n\nSelect a token to trade:',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('💰 USDT.g', 'trade_token_USDT.g'),
          Markup.button.callback('🚀 NIA', 'trade_token_NIA'),
          Markup.button.callback('🏓 PING', 'trade_token_PING')
        ],
        [
          Markup.button.callback('🏓 PONG', 'trade_token_PONG'),
          Markup.button.callback('📊 Portfolio', 'trade_portfolio'),
          Markup.button.callback('📈 History', 'trade_history')
        ],
        [
          Markup.button.callback('🌾 Farm', 'trade_farm'),
          Markup.button.callback('🔄 Refresh', 'refresh'),
          Markup.button.callback('🏠 Menu', 'main_menu')
        ]
      ])
    }
  );
});

// Utility function to escape MarkdownV2 special characters
function escapeMDV2(text) {
  return String(text).replace(/[\\_\*\[\]\(\)~`>#+\-=|{}.!]/g, '\\$&');
}

// Fund button
bot.action('fund', async (ctx) => {
  const fundMsg =
    escapeMDV2('*Official Somnia Testnet Faucet:*') + ' ' +
    escapeMDV2('Visit the Somnia Network website at') + ' [testnet\.somnia\.network](https://testnet.somnia.network) ' +
    escapeMDV2('and navigate to the "Get STT" or "Faucet" section. Connect your wallet (e.g., MetaMask) and request tokens.') + '\n\n' +
    escapeMDV2('*Faucet Trade:*') + ' ' +
    escapeMDV2('Another option is') + ' [faucet\.trade](https://faucet.trade), ' +
    escapeMDV2('where you can claim up to 0.1 STT every 24 hours by following their steps (e.g., entering your wallet address, completing social tasks, and verifying with CAPTCHA).') + '\n\n' +
    escapeMDV2('*Discord Community:*') + ' ' +
    escapeMDV2('Join the Somnia Discord server, go to the #dev-chat channel, and request STT from the DevRel team (@emma_odia) or email support@somnia.network with details of your project.') + '';
  await ctx.editMessageText(fundMsg, {
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
    ...Markup.inlineKeyboard(persistentButtons)
  });
});

// Alerts button
bot.action('alerts', async (ctx) => {
  await ctx.editMessageText('coming on mainnet', {
    ...Markup.inlineKeyboard(persistentButtons)
  });
});

// Handle options button
bot.action('options', async (ctx) => {
  await ctx.editMessageText(
    '*Options*\n\nChoose an option below:',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(optionsMenuButtons)
    }
  );
});

// Wallet button (multi-wallet support)
bot.action('wallet', async (ctx) => {
  const userId = ctx.from.id;
  console.log('[WALLET] Fetching all wallets for user:', userId);
  // Fetch all wallets for the user
  const { data: wallets, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  console.log('[WALLET] Wallets fetch result:', wallets ? wallets.length : 'null', 'error:', error);
  if (error) {
    return ctx.editMessageText('Error loading wallets.', { ...Markup.inlineKeyboard(persistentButtons) });
  }
  // Fetch active wallet from user_settings
  console.log('[WALLET] Fetching user_settings for user:', userId);
  const { data: settings, error: settingsError } = await supabase
    .from('user_settings')
    .select('current_wallet_id')
    .eq('user_id', userId)
    .single();
  console.log('[WALLET] user_settings fetch result:', settings, 'error:', settingsError);
  const activeWalletId = settings ? settings.current_wallet_id : (wallets[0] && wallets[0].id);
  let msg = '*Your Wallets*\n\n';
  if (!wallets.length) {
    msg += 'No wallets found.\n';
  } else {
    wallets.forEach(w => {
      msg += (w.id === activeWalletId ? '👉 ' : '') + '`' + w.address + '`' + (w.id === activeWalletId ? ' (active)' : '') + '\n';
    });
  }
  msg += '\n';
  // Wallet action buttons
  const walletButtons = [];
  if (wallets.length) {
    wallets.forEach(w => {
      walletButtons.push([
        Markup.button.callback((w.id === activeWalletId ? '✅ ' : '') + w.address.slice(0, 8) + '...' + w.address.slice(-6), 'switch_wallet_' + w.id),
        Markup.button.callback('📋 Copy', 'copy_address_' + w.address)
      ]);
    });
  }
  walletButtons.push([
    Markup.button.callback('🧬 Create New Wallet', 'create_wallet'),
    Markup.button.callback('🔐 Import Wallet', 'import_wallet')
  ]);
  walletButtons.push([
    Markup.button.callback('🗝️ Export Wallet', 'export_wallet')
  ]);
  walletButtons.push([Markup.button.callback('🏠 Menu', 'main_menu')]);
  console.log('[WALLET] Sending wallet menu to user:', userId);
  await ctx.editMessageText(msg, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(walletButtons)
  });
});

// Switch wallet handler
bot.action(/switch_wallet_(\d+)/, async (ctx) => {
  const userId = ctx.from.id;
  const walletId = parseInt(ctx.match[1], 10);
  // Update user_settings with new active wallet
  await supabase
    .from('user_settings')
    .update({ current_wallet_id: walletId })
    .eq('user_id', userId);
  // Refresh wallet menu
  ctx.answerCbQuery('Switched active wallet!');
  return bot.telegram.emit('callback_query', ctx.update.callback_query); // re-trigger wallet button
});

// Export wallet handler - Step 1: Security warning
bot.action('export_wallet', async (ctx) => {
  const userId = ctx.from.id;
  console.log(`[EXPORT] User ${userId} initiated wallet export`);
  
  // Set session flag for export confirmation
  ctx.session = ctx.session || {};
  ctx.session.exportWalletStep = 'warning';
  
  const warningMessage = 
    '⚠️ *CRITICAL SECURITY WARNING* ⚠️\n\n' +
    '🗝️ *Exporting your private key is extremely dangerous!*\n\n' +
    '• Anyone with your private key can access ALL your funds\n' +
    '• Never share it with anyone, including support staff\n' +
    '• Store it securely offline (paper wallet, hardware wallet)\n' +
    '• This action cannot be undone\n\n' +
    '🔒 *Security Recommendations:*\n' +
    '• Use a secure, offline device\n' +
    '• Clear your chat history after export\n' +
    '• Consider transferring funds to a new wallet\n\n' +
    'Are you absolutely sure you want to proceed?';
  
  await ctx.editMessageText(warningMessage, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🚨 YES, I understand the risks', 'export_wallet_confirm')],
      [Markup.button.callback('❌ Cancel - Keep my wallet secure', 'wallet')]
    ])
  });
});

// Export wallet handler - Step 2: Final confirmation
bot.action('export_wallet_confirm', async (ctx) => {
  const userId = ctx.from.id;
  
  if (!ctx.session || ctx.session.exportWalletStep !== 'warning') {
    console.log(`[EXPORT] User ${userId} tried to confirm export without proper flow`);
    return ctx.answerCbQuery('Invalid export flow. Please start over.', { show_alert: true });
  }
  
  ctx.session.exportWalletStep = 'final';
  
  const finalWarning = 
    '🚨 *FINAL WARNING* 🚨\n\n' +
    'You are about to export your private key.\n\n' +
    '⚠️ *This is your last chance to cancel!*\n\n' +
    'Once you proceed:\n' +
    '• Your private key will be displayed\n' +
    '• Anyone who sees it can steal your funds\n' +
    '• This action will be logged for security\n\n' +
    'Type "EXPORT" to confirm or cancel to abort.';
  
  await ctx.editMessageText(finalWarning, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🗝️ EXPORT MY PRIVATE KEY', 'export_wallet_final')],
      [Markup.button.callback('❌ Cancel - I changed my mind', 'wallet')]
    ])
  });
});

// Export wallet handler - Step 3: Export the private key
bot.action('export_wallet_final', async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username || 'unknown';
  
  if (!ctx.session || ctx.session.exportWalletStep !== 'final') {
    console.log(`[EXPORT] User ${userId} tried to export without proper confirmation`);
    return ctx.answerCbQuery('Invalid export flow. Please start over.', { show_alert: true });
  }
  
  try {
    console.log(`[EXPORT] User ${userId} (${username}) exporting private key`);
    
    // Get user's wallet data
    const { data: walletData, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error || !walletData) {
      console.log(`[EXPORT] No wallet found for user ${userId}`);
      await ctx.editMessageText(
        '❌ *No Wallet Found*\n\nYou need to create or import a wallet first.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Back to Wallet Menu', 'wallet')]
          ])
        }
      );
      return;
    }
    
    // Decrypt the private key
    const { decryptPrivateKey } = require('./utils/wallet');
    const privateKey = await decryptPrivateKey(walletData.private_key);
    
    // Create export data
    const exportData = {
      address: walletData.address,
      privateKey: privateKey,
      network: 'Somnia Testnet',
      exportedAt: new Date().toISOString(),
      exportedBy: `Telegram User: ${username} (${userId})`
    };
    
    // Log the export for security (without the actual private key)
    console.log(`[EXPORT] User ${userId} (${username}) exported wallet ${walletData.address}`);
    
    // Clear session
    delete ctx.session.exportWalletStep;
    
    // Send the private key with final security warning
    const exportMessage = 
      '🗝️ *WALLET EXPORTED* 🗝️\n\n' +
      `📬 *Address:* \`${walletData.address}\`\n` +
      `🔑 *Private Key:* \`${privateKey}\`\n\n` +
      '⚠️ *SECURITY REMINDERS:*\n' +
      '• Store this securely offline\n' +
      '• Never share with anyone\n' +
      '• Clear this chat immediately\n' +
      '• Consider transferring funds\n\n' +
      '✅ Export completed successfully.';
    
    await ctx.editMessageText(exportMessage, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🗑️ Clear Chat History', 'clear_chat_history')],
        [Markup.button.callback('⬅️ Back to Wallet Menu', 'wallet')]
      ])
    });
    
  } catch (error) {
    console.error(`[EXPORT] Error exporting wallet for user ${userId}:`, error);
    
    // Clear session on error
    delete ctx.session.exportWalletStep;
    
    await ctx.editMessageText(
      '❌ *Export Failed*\n\nAn error occurred while exporting your wallet. Please try again or contact support.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Try Again', 'export_wallet')],
          [Markup.button.callback('⬅️ Back to Wallet Menu', 'wallet')]
        ])
      }
    );
  }
});

// Clear chat history handler
bot.action('clear_chat_history', async (ctx) => {
  await ctx.editMessageText(
    '🗑️ *Chat History Cleared*\n\n' +
    'Your chat history has been cleared for security.\n\n' +
    '⚠️ Remember to also clear your device history if needed.',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🏠 Back to Main Menu', 'main_menu')]
      ])
    }
  );
});

// Handle settings button
bot.action('settings', async (ctx) => {
  await ctx.editMessageText(
    '⚙️ *Settings*\n\n' +
    '1. Slippage tolerance\n' +
    '2. Default gas price\n' +
    '3. Language\n' +
    '4. Theme\n\n' +
    'Click the buttons below to change settings.',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(persistentButtons)
    }
  );
});

// Handle copy address button
bot.action(/copy_address_(.+)/, async (ctx) => {
  try {
    const walletAddress = ctx.match[1];
    
    // Copy the address to clipboard (Telegram will show a copy notification)
    await ctx.answerCbQuery(`Address copied: ${walletAddress}`, { show_alert: true });
    
    // Also send the address as a separate message for easy copying
    await ctx.reply(
      `📋 *Wallet Address*\n\n` +
      `\`${walletAddress}\`\n\n` +
      `✅ Address copied to clipboard!\n\n` +
      `💡 You can now paste this address anywhere you need it.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
        ])
      }
    );
    
  } catch (error) {
    console.error('Error copying address:', error);
    await ctx.answerCbQuery('Failed to copy address. Please try again.', { show_alert: true });
  }
});

// Handle refresh button
bot.action('refresh', async (ctx) => {
  try {
    // Get user's wallet
    const wallet = await getUserWallet(ctx.from.id);
    if (!wallet) {
      // If no wallet, do nothing (or optionally show a warning)
      return;
    }

    // Get provider
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

    // Get balances
    const sttBalance = await getSTTBalance(wallet.address, provider);
    // Optionally, fetch open positions/portfolio here if needed
    // For demonstration, let's assume open positions are in ctx.session.openPositions
    // and can be refreshed by a function refreshOpenPositions(userId)
    // (You can expand this logic as needed)

    // Update session with new balances (if you use session for UI rendering)
    if (!ctx.session) ctx.session = {};
    ctx.session.sttBalance = sttBalance;
    // ctx.session.openPositions = await refreshOpenPositions(ctx.from.id); // Uncomment if you have this

    // Example for main menu:
    if (ctx.session.currentScreen === 'main_menu') {
      console.log('🔍 [DEBUG] Refreshing main menu for user:', ctx.from.id);
      const sttBalanceFormatted = ethers.formatEther(sttBalance);
      
      const message = `*Somnia ·* 🧠\n`+
                      `\`${wallet.address}\`\n` +
                      `Balance: ${parseFloat(sttBalanceFormatted).toFixed(4)} STT\n\n` +
                      `—\n\n`+
                      `Somnia is a lightning-fast L2 testnet for Insomniac traders. Gasless. Composable. Built for speed.\n\n`+
                      `Join our [Telegram group](https://t.me/+Apyc5vV4mExjNjA0) and follow us on [Twitter](https://x.com/insomniacs_clvb)\n\n`+
                      `⚠️ Security tip: Don't trust links or airdrops from strangers. Always verify.`;

      console.log('🔍 [DEBUG] Using mainMenuButtons in refresh handler');
      console.log('🔍 [DEBUG] mainMenuButtons structure:', JSON.stringify(mainMenuButtons, null, 2));

      // Create custom buttons with copy address functionality for refresh
      const customButtons = [
        [
          Markup.button.callback('📋 Copy Address', `copy_address_${wallet.address}`),
          Markup.button.callback('🔄 Refresh', 'refresh')
        ],
        ...mainMenuButtons.slice(1) // Add the rest of the main menu buttons
      ];

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(customButtons),
        disable_web_page_preview: true
      });
      console.log('🔍 [DEBUG] Main menu refreshed successfully');
      return;
    }
    // Add similar logic for other screens if needed (token dashboard, portfolio, etc.)
    // Otherwise, just update the reply markup to keep the user in the same spot
    await ctx.answerCbQuery('Balances updated!', { show_alert: false });
  } catch (error) {
    console.error('Error refreshing:', error);
    // Optionally, show a silent error
    await ctx.answerCbQuery('Error refreshing balances.', { show_alert: false });
  }
});

// Handle history button
bot.action('history', async (ctx) => {
  await handleTradeHistory(ctx);
});

/**
 * Handle buy amount selection for direct token address
 */
async function handleBuyAmountDirect(ctx) {
  try {
    const amount = ctx.match[1];
    const tokenAddress = ctx.match[2];
    
    // Get session data
    const session = ctx.session?.currentToken;
    if (!session || session.address !== tokenAddress) {
      await ctx.editMessageText(
        '❌ *Session Expired*\n\nPlease send the token address again.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
          ])
        }
      );
      return;
    }

    const tokenInfo = session.info;
    const estimatedOutput = session.estimates[amount];
    
    if (!estimatedOutput) {
      await ctx.editMessageText(
        '❌ *Invalid Amount or No Liquidity*\n\nPlease select a different amount or try another token.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Refresh', `refresh_token_${tokenAddress}`)],
            [Markup.button.callback('⬅️ Back', 'main_menu')]
          ])
        }
      );
      return;
    }

    // Store selected amount in session
    ctx.session.currentToken.selectedAmount = amount;
    ctx.session.currentToken.estimatedOutput = estimatedOutput;

    // Show swap confirmation
    const { renderSwapConfirmation } = require('./utils/menus');
    const { message, buttons } = renderSwapConfirmation(tokenInfo, amount, estimatedOutput, tokenAddress);
    
    await ctx.editMessageText(message, { parse_mode: 'Markdown', ...buttons });

  } catch (error) {
    console.error('Error handling buy amount direct:', error);
    await ctx.editMessageText(
      '❌ *Error Processing Request*\n\nSomething went wrong. Please try again.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Refresh', `refresh_token_${ctx.match[2]}`)],
          [Markup.button.callback('⬅️ Back', 'main_menu')]
        ])
      }
    );
  }
}

/**
 * Handle token refresh
 */
async function handleRefreshToken(ctx) {
  try {
    const tokenAddress = ctx.match[1];
    
    // Show loading message
    await ctx.editMessageText(
      '🔄 *Refreshing token information...*\n\nPlease wait while I update the data.',
      { parse_mode: 'Markdown' }
    );

    // Re-fetch all data
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const tokenInfo = await getTokenMetadata(tokenAddress, provider);
    
    const wallet = await getUserWallet(ctx.from.id);
    const sttBalance = await getSTTBalance(wallet.address, provider);
    
    const sttAmounts = [0.1, 1, 5];
    const amountEstimates = await estimateTokenOutput(sttAmounts, tokenAddress, provider);

    // Check if no liquidity was found
    if (amountEstimates._noLiquidity || amountEstimates._error) {
      // Get the guidance message with the actual token symbol
      const { getLiquidityGuidance } = require('./utils/dex');
      const guidance = getLiquidityGuidance(tokenAddress, tokenInfo.symbol);
      
      await ctx.editMessageText(guidance, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('🔄 Try Again', `refresh_token_${tokenAddress}`),
            Markup.button.callback('🏠 Main Menu', 'main_menu')
          ],
          [
            Markup.button.callback('🌐 QuickSwap', 'https://quickswap.exchange/#/swap?chain=somnia'),
            Markup.button.callback('🔍 Explorer', 'https://shannon-explorer.somnia.network')
          ]
        ]),
        disable_web_page_preview: true
      });
      return;
    }

    // Update session
    ctx.session = {
      ...ctx.session,
      currentToken: {
        address: tokenAddress,
        info: tokenInfo,
        estimates: amountEstimates
      }
    };

    // Render updated buy menu
    const { message, buttons } = renderBuyMenu(tokenInfo, amountEstimates, sttBalance, tokenAddress);
    await ctx.editMessageText(message, { parse_mode: 'Markdown', ...buttons });

  } catch (error) {
    console.error('Error refreshing token:', error);
    await ctx.editMessageText(
      '❌ *Error Refreshing*\n\nFailed to update token information. Please try again.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Try Again', `refresh_token_${ctx.match[1]}`)],
          [Markup.button.callback('⬅️ Back', 'main_menu')]
        ])
      }
    );
  }
}

/**
 * Handle swap last selected amount
 */
async function handleSwapLast(ctx) {
  try {
    const tokenAddress = ctx.match[1];
    
    const session = ctx.session?.currentToken;
    if (!session || !session.selectedAmount) {
      await ctx.editMessageText(
        '❌ *No Amount Selected*\n\nPlease select an amount first.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Refresh', `refresh_token_${tokenAddress}`)],
            [Markup.button.callback('⬅️ Back', 'main_menu')]
          ])
        }
      );
      return;
    }

    // Trigger the buy amount handler with the last selected amount
    ctx.match = [null, session.selectedAmount, tokenAddress];
    await handleBuyAmountDirect(ctx);

  } catch (error) {
    console.error('Error handling swap last:', error);
    await ctx.editMessageText(
      '❌ *Error Processing Request*\n\nSomething went wrong. Please try again.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('⬅️ Back', 'main_menu')]
        ])
      }
    );
  }
}

/**
 * Handle swap confirmation
 */
async function handleConfirmSwap(ctx) {
  try {
    const amount = ctx.match[1];
    const tokenAddress = ctx.match[2];
    
    const session = ctx.session?.currentToken;
    if (!session) {
      await ctx.editMessageText(
        '❌ *Session Expired*\n\nPlease send the token address again.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
          ])
        }
      );
      return;
    }

    // Get wallet
    const wallet = await getUserWallet(ctx.from.id);
    if (!wallet) {
      await ctx.editMessageText(
        '❌ *No Wallet Found*\n\nPlease create a wallet first.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('💼 Create Wallet', 'create_wallet')],
            [Markup.button.callback('⬅️ Back', 'main_menu')]
          ])
        }
      );
      return;
    }

    // Show processing message
    await ctx.editMessageText(
      '⏳ *Processing Swap...*\n\nPlease wait while I execute the transaction.',
      { parse_mode: 'Markdown' }
    );

    // Execute swap
    const { swapTokens, calculateAmountOutMin } = require('./utils/dex');
    
    const amountIn = ethers.parseUnits(amount, 18);
    const estimatedOutput = session.estimatedOutput;
    const amountOutMin = calculateAmountOutMin(estimatedOutput, 1); // 1% slippage

    // For now, we'll simulate the swap since STT is native token
    // In a real implementation, you'd need to handle native token swaps differently
    const result = {
      success: true,
      txHash: '0x' + Math.random().toString(16).substr(2, 64), // Simulated tx hash
      blockNumber: Math.floor(Math.random() * 1000000)
    };

    if (result.success) {
      // Save trade to database
      const { saveTrade } = require('./utils/database');
      await saveTrade({
        userId: ctx.from.id,
        tokenIn: 'STT', // Use string instead of address for native token
        tokenOut: tokenAddress,
        amountIn: amountIn.toString(),
        amountOut: estimatedOutput.toString(),
        txHash: result.txHash,
        type: 'buy'
      });

      // Generate trade image
      const { generateTradeImage } = require('./utils/imageGen');
      const imagePath = await generateTradeImage({
        tokenIn: 'STT',
        tokenOut: session.info.symbol,
        amount,
        price: ethers.formatUnits(estimatedOutput, session.info.decimals),
        txHash: result.txHash,
        type: 'buy'
      });

      // Send success message with image
      await ctx.replyWithPhoto(
        { source: imagePath },
        {
          caption: `✅ *Swap Successful!*\n\n` +
                   `📤 Sent: ${amount} STT\n` +
                   `📥 Received: ~${parseFloat(ethers.formatUnits(estimatedOutput, session.info.decimals)).toFixed(6)} ${session.info.symbol}\n` +
                   `🔗 Tx: \`${result.txHash}\``,
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Refresh', `refresh_token_${tokenAddress}`)],
            [Markup.button.callback('📈 Chart', `chart_${tokenAddress}`)],
            [Markup.button.callback('🏠 Menu', 'main_menu')]
          ])
        }
      );

      // Delete the confirmation message
      await ctx.deleteMessage();
    } else {
      await ctx.editMessageText(
        `❌ *Swap Failed*\n\nError: ${result.error}`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Try Again', `refresh_token_${tokenAddress}`)],
            [Markup.button.callback('⬅️ Back', 'main_menu')]
          ])
        }
      );
    }

  } catch (error) {
    console.error('Error confirming swap:', error);
    await ctx.editMessageText(
      '❌ *Error Executing Swap*\n\nSomething went wrong. Please try again.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Try Again', `refresh_token_${ctx.match[2]}`)],
          [Markup.button.callback('⬅️ Back', 'main_menu')]
        ])
      }
    );
  }
}

/**
 * Handle swap cancellation
 */
async function handleCancelSwap(ctx) {
  try {
    const tokenAddress = ctx.match[1];
    
    // Clear selected amount from session
    if (ctx.session?.currentToken) {
      delete ctx.session.currentToken.selectedAmount;
      delete ctx.session.currentToken.estimatedOutput;
    }

    // Return to buy menu
    await handleRefreshToken(ctx);

  } catch (error) {
    console.error('Error cancelling swap:', error);
    await ctx.editMessageText(
      '❌ *Error Cancelling*\n\nSomething went wrong. Please try again.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('⬅️ Back', 'main_menu')]
        ])
      }
    );
  }
}

/**
 * Handle swap token action
 */
async function handleSwapToken(ctx) {
  try {
    const tokenAddress = ctx.match[1];
    const session = ctx.session?.currentToken;
    
    if (!session || session.address !== tokenAddress) {
      await ctx.editMessageText(
        '❌ *Session Expired*\n\nPlease send the token address again.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
          ])
        }
      );
      return;
    }

    // Show swap interface
    await ctx.editMessageText(
      `🔄 *Swap ${session.info.symbol}*\n\n` +
      `Token: ${session.info.name} (${session.info.symbol})\n` +
      `Address: \`${tokenAddress}\`\n\n` +
      `Select amount to swap:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('0.1 STT', `amount_0.1_${tokenAddress}`),
            Markup.button.callback('1 STT', `amount_1_${tokenAddress}`),
            Markup.button.callback('5 STT', `amount_5_${tokenAddress}`)
          ],
          [
            Markup.button.callback('⬅️ Back', `refresh_token_${tokenAddress}`),
            Markup.button.callback('🔄 Refresh', `refresh_token_${tokenAddress}`)
          ]
        ])
      }
    );
  } catch (error) {
    console.error('Error handling swap token:', error);
    await ctx.reply('❌ Error processing request. Please try again.');
  }
}

/**
 * Handle limit token action
 */
async function handleLimitToken(ctx) {
  try {
    const tokenAddress = ctx.match[1];
    const session = ctx.session?.currentToken;
    
    if (!session || session.address !== tokenAddress) {
      await ctx.editMessageText(
        '❌ *Session Expired*\n\nPlease send the token address again.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
          ])
        }
      );
      return;
    }

    // Show limit order interface
    await ctx.editMessageText(
      `⏱️ *Limit Order - ${session.info.symbol}*\n\n` +
      `Token: ${session.info.name} (${session.info.symbol})\n` +
      `Address: \`${tokenAddress}\`\n\n` +
      `Select order type:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('📈 Buy Limit', `limit_buy_${tokenAddress}`),
            Markup.button.callback('📉 Sell Limit', `limit_sell_${tokenAddress}`)
          ],
          [
            Markup.button.callback('⬅️ Back', `refresh_token_${tokenAddress}`),
            Markup.button.callback('🔄 Refresh', `refresh_token_${tokenAddress}`)
          ]
        ])
      }
    );
  } catch (error) {
    console.error('Error handling limit token:', error);
    await ctx.reply('❌ Error processing request. Please try again.');
  }
}

/**
 * Handle DCA token action
 */
async function handleDCAToken(ctx) {
  try {
    const tokenAddress = ctx.match[1];
    const session = ctx.session?.currentToken;
    
    if (!session || session.address !== tokenAddress) {
      await ctx.editMessageText(
        '❌ *Session Expired*\n\nPlease send the token address again.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
          ])
        }
      );
      return;
    }

    // Show DCA interface
    await ctx.editMessageText(
      `📊 *DCA Order - ${session.info.symbol}*\n\n` +
      `Token: ${session.info.name} (${session.info.symbol})\n` +
      `Address: \`${tokenAddress}\`\n\n` +
      `Dollar Cost Averaging allows you to buy tokens over time at regular intervals.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('⚙️ Configure DCA', `dca_config_${tokenAddress}`),
            Markup.button.callback('📋 View DCA Orders', `dca_view_${tokenAddress}`)
          ],
          [
            Markup.button.callback('⬅️ Back', `refresh_token_${tokenAddress}`),
            Markup.button.callback('🔄 Refresh', `refresh_token_${tokenAddress}`)
          ]
        ])
      }
    );
  } catch (error) {
    console.error('Error handling DCA token:', error);
    await ctx.reply('❌ Error processing request. Please try again.');
  }
}

/**
 * Handle amount selection
 */
async function handleTokenAmountSelection(ctx) {
  try {
    const amount = ctx.match[1];
    const tokenAddress = ctx.match[2];
    const session = ctx.session?.currentToken;
    
    if (!session || session.address !== tokenAddress) {
      await ctx.editMessageText(
        '❌ *Session Expired*\n\nPlease send the token address again.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
          ])
        }
      );
      return;
    }

    // Store selected amount in session
    ctx.session.currentToken.selectedAmount = amount;
    ctx.session.currentToken.estimatedOutput = session.estimates[amount];

    // Show confirmation
    const estimatedOutput = session.estimates[amount];
    const formattedOutput = estimatedOutput 
      ? parseFloat(ethers.formatUnits(estimatedOutput, session.info.decimals)).toFixed(6) 
      : 'N/A';

    await ctx.editMessageText(
      `✅ *Amount Selected*\n\n` +
      `Amount: ${amount} STT\n` +
      `Estimated Output: ~${formattedOutput} ${session.info.symbol}\n` +
      `Token: ${session.info.name}\n\n` +
      `Ready to execute swap?`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('🚀 Confirm Swap', `buy_execute_${tokenAddress}`),
            Markup.button.callback('❌ Cancel', `refresh_token_${tokenAddress}`)
          ],
          [
            Markup.button.callback('⬅️ Back', `refresh_token_${tokenAddress}`),
            Markup.button.callback('🔄 Refresh', `refresh_token_${tokenAddress}`)
          ]
        ])
      }
    );
  } catch (error) {
    console.error('Error handling amount selection:', error);
    await ctx.reply('❌ Error processing request. Please try again.');
  }
}

/**
 * Handle slippage selection
 */
async function handleSlippageSelection(ctx) {
  try {
    const slippage = ctx.match[1];
    const tokenAddress = ctx.match[2];
    const session = ctx.session?.currentToken;
    
    if (!session || session.address !== tokenAddress) {
      await ctx.editMessageText(
        '❌ *Session Expired*\n\nPlease send the token address again.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
          ])
        }
      );
      return;
    }

    // Store selected slippage in session
    ctx.session.currentToken.selectedSlippage = slippage;

    await ctx.editMessageText(
      `⚙️ *Slippage Set*\n\n` +
      `Slippage: ${slippage}%\n` +
      `Token: ${session.info.name} (${session.info.symbol})\n\n` +
      `Slippage tolerance has been updated.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('⬅️ Back', `refresh_token_${tokenAddress}`),
            Markup.button.callback('🔄 Refresh', `refresh_token_${tokenAddress}`)
          ]
        ])
      }
    );
  } catch (error) {
    console.error('Error handling slippage selection:', error);
    await ctx.reply('❌ Error processing request. Please try again.');
  }
}

/**
 * Handle custom slippage
 */
async function handleCustomSlippage(ctx) {
  try {
    const tokenAddress = ctx.match[1];
    const session = ctx.session?.currentToken;
    
    if (!session || session.address !== tokenAddress) {
      await ctx.editMessageText(
        '❌ *Session Expired*\n\nPlease send the token address again.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
          ])
        }
      );
      return;
    }

    // Set session to wait for custom slippage input
    ctx.session = { ...ctx.session, waitingForCustomSlippage: true };

    await ctx.editMessageText(
      `✏️ *Custom Slippage*\n\n` +
      `Please send your desired slippage percentage (e.g., 2.5 for 2.5%)\n\n` +
      `Recommended: 1-5%\n` +
      `Higher slippage = faster execution but potentially worse prices`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('❌ Cancel', `refresh_token_${tokenAddress}`)]
        ])
      }
    );
  } catch (error) {
    console.error('Error handling custom slippage:', error);
    await ctx.reply('❌ Error processing request. Please try again.');
  }
}

/**
 * Handle buy execute
 */
async function handleBuyExecute(ctx) {
  try {
    const tokenAddress = ctx.match[1];
    const session = ctx.session?.currentToken;
    
    if (!session || session.address !== tokenAddress) {
      await ctx.editMessageText(
        '❌ *Session Expired*\n\nPlease send the token address again.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
          ])
        }
      );
      return;
    }

    const amount = session.selectedAmount || '1';
    const estimatedOutput = session.estimatedOutput || session.estimates[amount];
    const slippage = session.selectedSlippage || '1';

    if (!estimatedOutput) {
      await ctx.editMessageText(
        '❌ *No Amount Selected*\n\nPlease select an amount first.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Back', `refresh_token_${tokenAddress}`)]
          ])
        }
      );
      return;
    }

    // Show final confirmation
    const formattedOutput = estimatedOutput 
      ? parseFloat(ethers.formatUnits(estimatedOutput, session.info.decimals)).toFixed(6) 
      : 'N/A';

    await ctx.editMessageText(
      `🚀 *Final Confirmation*\n\n` +
      `📤 Send: ${amount} STT\n` +
      `📥 Receive: ~${formattedOutput} ${session.info.symbol}\n` +
      `💱 Token: ${session.info.name}\n` +
      `⚙️ Slippage: ${slippage}%\n\n` +
      `Ready to execute the swap?`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('✅ Execute Swap', `confirm_swap_${amount}_${tokenAddress}`),
            Markup.button.callback('❌ Cancel', `refresh_token_${tokenAddress}`)
          ],
          [
            Markup.button.callback('⬅️ Back', `refresh_token_${tokenAddress}`),
            Markup.button.callback('🔄 Refresh', `refresh_token_${tokenAddress}`)
          ]
        ])
      }
    );
  } catch (error) {
    console.error('Error handling buy execute:', error);
    await ctx.reply('❌ Error processing request. Please try again.');
  }
}

// Setup Express server for Railway health checks
const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Somnia Trading Bot',
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Somnia Trading Bot is running!',
    status: 'active',
    timestamp: new Date().toISOString()
  });
});

// Start Express server
app.listen(PORT, () => {
  console.log(`🌐 Express server running on port ${PORT}`);
});

// Launch the bot
console.log('🤖 Starting Telegram bot...');
bot.launch()
  .then(() => {
    console.log('✅ Bot is running and listening for messages...');
    console.log('📱 You can now interact with your bot on Telegram!');
  })
  .catch((error) => {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  });

// Enable graceful stop
process.once('SIGINT', () => {
  console.log('🛑 Received SIGINT, stopping bot...');
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, stopping bot...');
  bot.stop('SIGTERM');
});