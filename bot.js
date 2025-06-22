require('dotenv').config();
const { ethers } = require('ethers');
const { Telegraf, Markup, session } = require('telegraf');
const { mainMenuButtons, persistentButtons } = require('./handlers/inlineButtons');
const { handleContractAddress, handleBuyAmount } = require('./handlers/inputHandler');
const { detectContractAddress } = require('./utils/caDetector');
const { getTokenMetadata, getSTTBalance } = require('./utils/tokenInfo');
const { estimateTokenOutput } = require('./utils/dex');
const { renderBuyMenu, renderInvalidTokenMessage, showMainMenu } = require('./utils/menus');
const { getWalletForUser } = require('./utils/wallet');
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
    const wallet = await getWalletForUser(ctx.from.id);
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
    const amountEstimates = await estimateTokenOutput(sttAmounts, tokenAddress, provider);

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
    const oneSTTEstimate = amountEstimates['1'] || ethers.parseUnits('0', tokenInfo.decimals);
    const formattedOutput = parseFloat(ethers.formatUnits(oneSTTEstimate, tokenInfo.decimals)).toFixed(6);

    // Render token dashboard
    const message = `🪙 *${tokenInfo.symbol}* — ${tokenInfo.name}  
📬 Address: \`${tokenAddress}\`  
💰 Your STT Balance: ${formattedBalance} STT  
📈 Estimated output: ~${formattedOutput} ${tokenInfo.symbol}  
💹 Price Impact: ~${priceImpact}%

You can trade this token directly using the options below.`;

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
    await ctx.reply(
      '❌ *Error Loading Token*\n\nSomething went wrong while loading the token information. Please try again.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Try Again', 'main_menu')],
          [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
        ])
      }
    );
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
    // Re-route to the start handler, which correctly checks for a wallet
    await handleStart(ctx);
  } catch (error) {
    console.error('Main menu error:', error);
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
bot.action('stt_balance', handleSTTBalance);

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

// Handle fund button
bot.action('fund', async (ctx) => {
  await ctx.editMessageText(
    '💰 *Fund Your Wallet*\n\n' +
    'Send SOM to this address to fund your wallet:\n\n' +
    '`0x1234567890123456789012345678901234567890`\n\n' +
    'Minimum deposit: 0.1 SOM\n' +
    'Network: Somnia Testnet',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(persistentButtons)
    }
  );
});

// Handle alerts button
bot.action('alerts', async (ctx) => {
  await ctx.editMessageText(
    '🔔 *Price Alerts*\n\n' +
    'Set up price alerts for your favorite tokens:\n\n' +
    '1. Send a token contract address\n' +
    '2. Choose alert type\n' +
    '3. Set price target\n\n' +
    'You will be notified when the price reaches your target.',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(persistentButtons)
    }
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

// Handle wallet button
bot.action('wallet', async (ctx) => {
  await ctx.editMessageText(
    '👛 *Your Wallet*\n\n' +
    'Balance: 0 SOM\n' +
    'Pending: 0 SOM\n' +
    'Total Value: $0.00\n\n' +
    'Click "Fund" to add SOM to your wallet.',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(persistentButtons)
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

// Handle refresh button
bot.action('refresh', async (ctx) => {
  try {
    // Get user's wallet
    const wallet = await getWalletForUser(ctx.from.id);
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

    // Option 2: Update message text in-place with new balances (if you track the current screen/message)
    // Example for main menu:
    if (ctx.session.currentScreen === 'main_menu') {
      const sttBalanceFormatted = ethers.formatEther(sttBalance);
      
      const message = `*Somnia ·* 🧠\n`+
                      `\`${wallet.address}\` (Tap to copy)\n` +
                      `Balance: ${parseFloat(sttBalanceFormatted).toFixed(4)} STT\n\n` +
                      `—\n\n`+
                      `Somnia is a lightning-fast L2 testnet for Insomniac traders. Gasless. Composable. Built for speed.\n\n`+
                      `Join our [Telegram group](https://t.me/+Apyc5vV4mExjNjA0) and follow us on [Twitter](https://x.com/insomniacs_clvb)\n\n`+
                      `⚠️ Security tip: Don't trust links or airdrops from strangers. Always verify.`;

      const mainMenuGrid = {
        inline_keyboard: [
          [{ text: '💸 Buy', callback_data: 'buy' }, { text: '💵 Sell', callback_data: 'sell' }],
          [{ text: '📊 Positions', callback_data: 'positions' }, { text: '🔄 Refresh', callback_data: 'refresh' }],
          [{ text: '⚙️ Settings', callback_data: 'settings' }, { text: '📥 Withdraw', callback_data: 'withdraw' }]
        ]
      };

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: mainMenuGrid,
        disable_web_page_preview: true
      });
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
        '❌ *Invalid Amount*\n\nPlease select a valid amount.',
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
    
    const wallet = await getWalletForUser(ctx.from.id);
    const sttBalance = await getSTTBalance(wallet.address, provider);
    
    const sttAmounts = [0.1, 1, 5];
    const amountEstimates = await estimateTokenOutput(sttAmounts, tokenAddress, provider);

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
    const wallet = await getWalletForUser(ctx.from.id);
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
    const formattedOutput = parseFloat(ethers.formatUnits(estimatedOutput, session.info.decimals)).toFixed(6);

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
    const formattedOutput = parseFloat(ethers.formatUnits(estimatedOutput, session.info.decimals)).toFixed(6);

    await ctx.editMessageText(
      `🚀 *Final Confirmation*\n\n` +
      `📤 Send: ${amount} STT\n` +
      `📥 Receive: ~${formattedOutput} ${session.info.symbol}\n` +
      `💱 Token: ${session.info.name}\n` +
      `⚙️ Slippage: ${slippage}%\n\n` +
      `Ready to execute?`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('✅ Execute', `confirm_swap_${amount}_${tokenAddress}`),
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

/**
 * Handle STT balance display
 */
async function handleSTTBalance(ctx) {
  try {
    const wallet = await getWalletForUser(ctx.from.id);
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
    const sttBalance = await getSTTBalance(wallet.address, provider);
    const formattedBalance = parseFloat(ethers.formatUnits(sttBalance, 18)).toFixed(3);

    await ctx.editMessageText(
      `💰 *Your STT Balance*\n\n` +
      `Address: \`${wallet.address}\`\n` +
      `Balance: ${formattedBalance} STT\n\n` +
      `Chain: Somnia Testnet (Chain ID: 50312)`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('🔄 Refresh', 'stt_balance'),
            Markup.button.callback('⬅️ Back', 'main_menu')
          ]
        ])
      }
    );
  } catch (error) {
    console.error('Error handling STT balance:', error);
    await ctx.reply('❌ Error fetching balance. Please try again.');
  }
}

/**
 * Handle custom slippage input
 */
async function handleCustomSlippageInput(ctx) {
  try {
    const slippageInput = ctx.message.text.trim();
    const slippage = parseFloat(slippageInput);

    // Validate slippage
    if (isNaN(slippage) || slippage < 0.1 || slippage > 50) {
      await ctx.reply(
        '❌ *Invalid Slippage*\n\n' +
        'Please enter a valid slippage percentage between 0.1% and 50%.\n' +
        'Example: 2.5 for 2.5%',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Try Again', 'custom_slippage')],
            [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
          ])
        }
      );
      return;
    }

    // Delete the message containing the slippage input
    try {
      await ctx.deleteMessage(ctx.message.message_id);
    } catch (error) {
      console.log('Could not delete slippage input message:', error.message);
    }

    // Store slippage in session
    if (ctx.session?.currentToken) {
      ctx.session.currentToken.selectedSlippage = slippage.toString();
    }

    await ctx.reply(
      `⚙️ *Custom Slippage Set*\n\n` +
      `Slippage: ${slippage}%\n\n` +
      `Your custom slippage has been updated.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('⬅️ Back to Menu', 'main_menu'),
            Markup.button.callback('🔄 Refresh', 'refresh')
          ]
        ])
      }
    );
  } catch (error) {
    console.error('Error handling custom slippage input:', error);
    await ctx.reply('❌ Error processing slippage. Please try again.');
  }
}

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply(
    '❌ Sorry, something went wrong. Please try again.',
    Markup.inlineKeyboard(persistentButtons)
  );
});

// Start bot
bot.launch().then(() => {
  console.log('🚀 Bot started successfully!');
  
  // Start limit order monitoring
  startLimitOrderMonitoring();
  
  console.log('📊 Limit order monitoring started');
  console.log('🌐 Connected to Somnia Testnet');
  console.log('🔗 RPC: https://rpc.testnet.somnia.network');
}).catch((err) => {
  console.error('❌ Failed to start bot:', err);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 