require('dotenv').config();
console.log('[DEBUG] SUPABASE_URL:', process.env.SUPABASE_URL ? '[set]' : '[missing]');
console.log('[DEBUG] SUPABASE_KEY:', process.env.SUPABASE_KEY ? '[set]' : '[missing]');
console.log('[DEBUG] TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? '[set]' : '[missing]');
console.log('[DEBUG] RPC_URL:', process.env.RPC_URL ? '[set]' : '[missing]');
const { ethers } = require('ethers');
const { Telegraf, Markup } = require('telegraf');
const LocalSession = require('telegraf-session-local');
const express = require('express');
const CustomSwap = require('./utils/customSwap');
const TestnetSwap = require('./utils/testnetSwap');
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
const { initUser, getUserData, setUserBalance, updateUserPosition, loadDB, saveDB } = require('./utils/database');

// Add INSOMN ecosystem integration after the existing imports
const { 
  isInsomnEcosystemToken, 
  getInsomnTokenInfo, 
  executeInsomnSwap,
  getInsomnBalance 
} = require('./utils/insomnIntegration');

// Contract addresses for custom swap
const CUSTOM_CONTRACTS = {
  customFactory: '0x1ABF676f2D149b742E6A482Eaaa7bDC81b4148c6',
  customPoolDeployer: '0x954543565985E48dF582Ac452c4CbffB028961dB',
  poolAddress: '0x05942239059D344BD5c25b597Abf89F00A91537e',
  tokenA: '0x94E2ae13081636bd62E596E08bE6342d3F585aD2',
  tokenB: '0xA3ea70ADb7818e13ba55064158252D2e0f9a918c',
  deployer: '0x35DaDAb2bb21A6d4e20beC3F603b8426Dc124004'
};

// Testnet token addresses
const TESTNET_TOKENS = {
  stt: '0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7',
  ping: '0x33E7fAB0a8a5da1A923180989bD617c9c2D1C493',
  insomiacs: '0x0C726E446865FFb19Cc13f21aBf0F515106C9662'
};

// INSOMN ecosystem contract addresses
const INSOMN_ECOSYSTEM = {
  factory: '0x8669cD81994740D517661577A72B84d0a308D8b0',
  insomn: '0xCdaC954Cff3be5eBED645745c85dc13cC2c97836',
  weth: '0xd2480162Aa7F02Ead7BF4C127465446150D58452',
  pool: '0xaA19FBBd3f5FD24cd5Db040364e91b9fa86aa18f'
};

// Initialize bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Use persistent session middleware (sessions.json) with BigInt-safe serializer
bot.use(new LocalSession({
  database: 'sessions.json',
  format: {
    serialize: obj => JSON.stringify(obj, (k, v) => typeof v === 'bigint' ? v.toString() : v),
    deserialize: JSON.parse
  }
}).middleware());

// Register these handlers FIRST so they are not shadowed
bot.action(/sell_percent_(\d+)_(0x[a-fA-F0-9]{40})/, handleSellPercentDirect);
bot.action(/buy_amount_(.+)_(.+)/, handleBuyAmountDirect);

// INSOMN ecosystem handlers
bot.action(/insomn_buy_(.+)_(.+)/, handleInsomnBuy);
bot.action(/insomn_sell_(.+)_(.+)/, handleInsomnSell);

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

  // Check if this is a contract address input
  if (ctx.session && ctx.session.waitingForContractAddress) {
    await handleContractAddress(ctx);
    return;
  }

  // Check if this is a buy amount input
  if (ctx.session && ctx.session.waitingForBuyAmount) {
    await handleBuyAmount(ctx);
    return;
  }

  // Default response for unrecognized text
  await ctx.reply(
    '🤖 *Somnia Trading Bot*\n\n' +
    'Please use the menu buttons or send a valid token address to get started.',
    { parse_mode: 'Markdown', ...mainMenuButtons }
  );
});

/**
 * Handle token address input
 */
async function handleTokenAddressInput(ctx, tokenAddress) {
  try {
    // Initialize provider
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    
    // Get token metadata
    let tokenInfo;
    try {
      tokenInfo = await getTokenMetadata(tokenAddress, provider);
    } catch (error) {
      const { message, buttons } = renderInvalidTokenMessage();
      await ctx.reply(message, { parse_mode: 'Markdown', ...buttons });
      return;
    }

    // Get user's wallet
    const wallet = await getUserWallet(ctx.from.id);
    if (!wallet) {
      await ctx.reply(
        '❌ *No Wallet Found*\n\nPlease create a wallet first to start trading.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('💼 Create Wallet', 'create_wallet')],
            [Markup.button.callback('⬅️ Back to Menu', 'main_menu')],
            [Markup.button.callback('🔄 Refresh', `refresh_token_${tokenAddress}`)],
            [Markup.button.callback('📋 Copy Address', `copy_address_${wallet.address}`)],
            [Markup.button.callback('✅ STT', 'stt_balance')]
          ])
        }
      );
      return;
    }

    // Get STT balance
    const sttBalance = await getSTTBalance(wallet.address, provider);
    const formattedBalance = parseFloat(ethers.formatUnits(sttBalance, 18)).toFixed(3);

    // Check if this is one of our custom pool tokens
    const isCustomPoolToken = [
      CUSTOM_CONTRACTS.tokenA.toLowerCase(),
      CUSTOM_CONTRACTS.tokenB.toLowerCase()
    ].includes(tokenAddress.toLowerCase());

    // Check if this is a testnet token (case-insensitive comparison)
    const isTestnetToken = Object.values(TESTNET_TOKENS).some(token => 
      token.toLowerCase() === tokenAddress.toLowerCase()
    );
    
    // Check if this is an INSOMN ecosystem token
    const isInsomnToken = isInsomnEcosystemToken(tokenAddress);
    
    console.log(`🔍 Token detection: ${tokenAddress.toLowerCase()}`);
    console.log(`🔍 Testnet tokens:`, Object.values(TESTNET_TOKENS).map(t => t.toLowerCase()));
    console.log(`🔍 Is testnet token: ${isTestnetToken}`);
    console.log(`🔍 Is INSOMN token: ${isInsomnToken}`);

    if (isInsomnToken) {
      console.log(`🎯 Processing INSOMN ecosystem token: ${tokenAddress}`);
      
      try {
        // Get token info
        const insomnTokenInfo = await getInsomnTokenInfo(tokenAddress, provider);
        console.log(`📋 INSOMN token info:`, insomnTokenInfo);
        
        if (!insomnTokenInfo) {
          throw new Error('Could not get INSOMN token info');
        }
        
        // Get wallet balance
        const balanceInfo = await getInsomnBalance(wallet, provider);
        console.log(`💰 Balance info:`, balanceInfo);
        
        if (!balanceInfo.success) {
          throw new Error('Could not get wallet balance');
        }
        
        // Ensure session is initialized
        if (!ctx.session) ctx.session = {};
        
        // Store token info in session
        ctx.session.currentToken = {
          address: tokenAddress,
          info: insomnTokenInfo,
          isInsomn: true,
          balance: balanceInfo.balance
        };
        
        // Create buy/sell buttons for INSOMN ecosystem
        const buttons = Markup.inlineKeyboard([
          [
            Markup.button.callback(`Buy 0.1 ${insomnTokenInfo.symbol}`, `insomn_buy_0.1_${insomnTokenInfo.symbol}`),
            Markup.button.callback(`Buy 1 ${insomnTokenInfo.symbol}`, `insomn_buy_1_${insomnTokenInfo.symbol}`),
            Markup.button.callback(`Buy 5 ${insomnTokenInfo.symbol}`, `insomn_buy_5_${insomnTokenInfo.symbol}`)
          ],
          [
            Markup.button.callback(`Sell 25%`, `insomn_sell_25_${insomnTokenInfo.symbol}`),
            Markup.button.callback(`Sell 50%`, `insomn_sell_50_${insomnTokenInfo.symbol}`),
            Markup.button.callback(`Sell 100%`, `insomn_sell_100_${insomnTokenInfo.symbol}`)
          ],
          [Markup.button.callback('🏠 Menu', 'main_menu')]
        ]);
        
        await ctx.reply(
          `🪙 *${insomnTokenInfo.symbol}* — ${insomnTokenInfo.name}\n` +
          `📬 Address: \`${tokenAddress}\`\n` +
          `💰 Your STT Balance: ${balanceInfo.balance.stt} STT\n` +
          `🪙 Your ${insomnTokenInfo.symbol} Balance: ${balanceInfo.balance[insomnTokenInfo.symbol.toLowerCase()] || '0'}\n` +
          `🎯 INSOMN Ecosystem Token\n\n` +
          `*Real Trading Available*\nSelect an action:`,
          { parse_mode: 'Markdown', ...buttons }
        );
        return;
        
      } catch (error) {
        console.error('❌ Error processing INSOMN token:', error);
        await ctx.reply(
          '❌ *Error Processing Token*\n\nCould not process INSOMN ecosystem token. Please try again.',
          { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('🏠 Menu', 'main_menu')]]) }
        );
        return;
      }
    } else if (isTestnetToken) {
      console.log(`🎯 Processing testnet token: ${tokenAddress}`);
      // Initialize TestnetSwap for testnet trading
      const testnetSwap = new TestnetSwap(provider, wallet);
      
      try {
        // Get token info
        const testnetTokenInfo = await testnetSwap.getTokenInfo(tokenAddress);
        console.log(`📋 Testnet token info:`, testnetTokenInfo);
        
        const tokenBalance = await testnetSwap.getWalletBalance(tokenAddress);
        console.log(`💰 Token balance:`, tokenBalance);
        
        // Estimate swaps for different amounts
        const swapAmounts = [0.1, 1, 5];
        let amountEstimates = {};
        
        for (const amount of swapAmounts) {
          try {
            const estimate = await testnetSwap.estimateSwap(TESTNET_TOKENS.stt, tokenAddress, amount);
            if (estimate.success) {
              amountEstimates[amount.toString()] = estimate.amountOut.toFixed(6);
            } else {
              amountEstimates[amount.toString()] = '0';
            }
          } catch (error) {
            console.log(`⚠️ Could not estimate for ${amount} STT:`, error.message);
            amountEstimates[amount.toString()] = '0';
          }
        }

        // Ensure session is initialized
        if (!ctx.session) ctx.session = {};
        
        // Set session for testnet trading
        ctx.session.currentToken = {
          address: tokenAddress,
          info: {
            ...tokenInfo,
            decimals: tokenInfo.decimals.toString()
          },
          estimates: amountEstimates,
          isTestnet: true,
          testnetInfo: testnetTokenInfo
        };

        // Create buy/sell buttons for testnet
        const buyButtons = [
          [
            Markup.button.callback('Buy 0.1 STT', `buy_amount_0.1_${tokenAddress}`),
            Markup.button.callback('Buy 1 STT', `buy_amount_1_${tokenAddress}`),
            Markup.button.callback('Buy 5 STT', `buy_amount_5_${tokenAddress}`)
          ]
        ];
        
        const sellButtons = [
          [
            Markup.button.callback('Sell 25%', `sell_percent_25_${tokenAddress}`),
            Markup.button.callback('Sell 50%', `sell_percent_50_${tokenAddress}`),
            Markup.button.callback('Sell 100%', `sell_percent_100_${tokenAddress}`)
          ]
        ];

        const buttons = Markup.inlineKeyboard([
          ...buyButtons,
          ...sellButtons,
          [Markup.button.callback('🏠 Menu', 'main_menu')]
        ]);

        await ctx.reply(
          `🪙 *${tokenInfo.symbol}* — ${tokenInfo.name}\n` +
          `📬 Address: \`${tokenAddress}\`\n` +
          `💰 Your STT Balance: ${formattedBalance} STT\n` +
          `🪙 Your ${tokenInfo.symbol} Balance: ${tokenBalance}\n` +
          `🎯 Testnet Token (No Liquidity Required)\n` +
          `💱 Exchange Rate: 1 STT = ${testnetSwap.exchangeRates[testnetTokenInfo.symbol] || 'N/A'} ${testnetTokenInfo.symbol}\n\n` +
          `*Testnet Trading Available*\nSelect an action:`,
          { parse_mode: 'Markdown', ...buttons }
        );
        return;
      } catch (error) {
        console.error('❌ Error setting up testnet trading:', error);
        console.error('❌ Error details:', error.message);
        console.error('❌ Error stack:', error.stack);
        // Fall back to default behavior
      }
    }

    if (isCustomPoolToken) {
      // Initialize CustomSwap for real trading
      const customSwap = new CustomSwap(process.env.RPC_URL, process.env.PRIVATE_KEY);
      
      try {
        // Get pool information
        const poolInfo = await customSwap.getPoolInfo();
        console.log('📊 Pool info retrieved for custom swap');
        
        // Get token balances
        const tokenBalance = await customSwap.getWalletBalance(tokenAddress, wallet.address);
        console.log(`💰 Token balance: ${tokenBalance.formattedBalance}`);
        
        // Estimate swaps for different amounts
        const swapAmounts = [0.1, 1, 5];
    let amountEstimates = {};
        
        for (const amount of swapAmounts) {
          try {
            const amountIn = ethers.parseUnits(amount.toString(), 18);
            const estimatedOutput = await customSwap.estimateSwap(
              CUSTOM_CONTRACTS.tokenA, // Assuming STT is tokenA
              tokenAddress,
              amountIn
            );
            amountEstimates[amount.toString()] = estimatedOutput.toString();
    } catch (error) {
            console.log(`⚠️ Could not estimate for ${amount} STT:`, error.message);
            amountEstimates[amount.toString()] = '0';
          }
        }

        // Ensure session is initialized
        if (!ctx.session) ctx.session = {};
        
        // Set session for custom pool trading
        ctx.session.currentToken = {
        address: tokenAddress,
          info: {
            ...tokenInfo,
            decimals: tokenInfo.decimals.toString()
          },
          estimates: amountEstimates,
          isCustomPool: true,
          poolInfo: {
            token0: poolInfo.token0,
            token1: poolInfo.token1,
            fee: poolInfo.fee,
            liquidity: poolInfo.liquidity.toString()
      }
    };

        // Create buy/sell buttons for custom pool
        const buyButtons = [
          [
            Markup.button.callback('Buy 0.1 STT', `buy_amount_0.1_${tokenAddress}`),
            Markup.button.callback('Buy 1 STT', `buy_amount_1_${tokenAddress}`),
            Markup.button.callback('Buy 5 STT', `buy_amount_5_${tokenAddress}`)
          ]
        ];
        
        const sellButtons = [
          [
            Markup.button.callback('Sell 25%', `sell_percent_25_${tokenAddress}`),
            Markup.button.callback('Sell 50%', `sell_percent_50_${tokenAddress}`),
            Markup.button.callback('Sell 100%', `sell_percent_100_${tokenAddress}`)
          ]
        ];

        const buttons = Markup.inlineKeyboard([
          ...buyButtons,
          ...sellButtons,
          [Markup.button.callback('🏠 Menu', 'main_menu')]
        ]);

        await ctx.reply(
          `🪙 *${tokenInfo.symbol}* — ${tokenInfo.name}\n` +
          `📬 Address: \`${tokenAddress}\`\n` +
          `💰 Your STT Balance: ${formattedBalance} STT\n` +
          `🪙 Your ${tokenInfo.symbol} Balance: ${tokenBalance.formattedBalance}\n` +
          `🏊 Pool Liquidity: ${ethers.formatUnits(poolInfo.liquidity, 18)}\n` +
          `💸 Fee: ${poolInfo.fee} bps\n\n` +
          `*Custom Pool Trading Available*\nSelect an action:`,
          { parse_mode: 'Markdown', ...buttons }
        );
        return;
      } catch (error) {
        console.error('❌ Error setting up custom pool trading:', error);
        // Fall back to default behavior
      }
    }

    // Default behavior for other tokens
    const sttAmounts = [0.1, 1, 5];
    let amountEstimates = {};
    
    // Calculate estimated output for 1 STT
    const oneSTTEstimate = amountEstimates['1'];
    const formattedOutput = oneSTTEstimate 
      ? parseFloat(ethers.formatUnits(oneSTTEstimate, tokenInfo.decimals)).toFixed(6) 
      : 'N/A';
    
    const message = `🪙 *${tokenInfo.symbol}* — ${tokenInfo.name}  \n📬 Address: \`${tokenAddress}\`  \n💰 Your STT Balance: ${formattedBalance} STT  \n📈 Estimated output: ~${formattedOutput} ${tokenInfo.symbol}  \n💹 Price Impact: ~0.5%\n\nYou can trade this token directly using the options below.`;
    
    const buttons = Markup.inlineKeyboard([
      [
        Markup.button.callback('⬅ Back', 'main_menu'),
        Markup.button.callback('🔄 Refresh', `refresh_token_${tokenAddress}`)
      ],
      [
        Markup.button.callback('✅ STT', 'stt_balance'),
        Markup.button.callback('⚙️ Settings', 'settings')
      ]
    ]);
    
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
// Move this registration to be above the generic buy/sell handler
bot.action(/buy_amount_(.+)_(.+)/, handleBuyAmountDirect);
bot.action(/^(buy|sell)_(.+)$/, handleTradeAction);
bot.action(/amount_(.+)_(buy|sell)_(.+)/, handleAmountSelection);
bot.action(/confirm_(buy|sell)_(.+)_(.+)/, handleTradeConfirmation);
bot.action('trade_history', handleTradeHistory);
bot.action('trade_farm', handleFarm);

// Direct token address handlers
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

// Buy button - Main trading interface
// Quick trade handlers for testnet tokens
// Portfolio handler
bot.action('trade_portfolio', async (ctx) => {
  try {
    const wallet = await getUserWallet(ctx.from.id);
    if (!wallet) {
      await ctx.editMessageText(
        '❌ *No Wallet Found*\n\nPlease create a wallet first.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('💼 Create Wallet', 'create_wallet')],
            [Markup.button.callback('⬅️ Back', 'buy')]
          ])
        }
      );
      return;
    }

    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const sttBalance = await provider.getBalance(wallet.address);
    const formattedSTT = parseFloat(ethers.formatUnits(sttBalance, 18)).toFixed(3);

    // Get user's fake balances and positions
    const userData = getUserData(ctx.from.id);
    const fakeSTTBalance = userData.balance.stt.toFixed(3);
    const positions = userData.positions || {};
    
    // Build positions text
    let positionsText = '';
    if (Object.keys(positions).length === 0) {
      positionsText = 'No testnet positions yet. Start trading!';
    } else {
      for (const [token, amount] of Object.entries(positions)) {
        const symbol = token.toUpperCase();
        const emoji = symbol === 'PING' ? '🏓' : symbol === 'INSOM' ? '🪙' : '🪙';
        positionsText += `${emoji} ${symbol}: ${Number(amount).toFixed(6)}\n`;
      }
    }

    await ctx.editMessageText(
      `📊 *Your Portfolio*\n\n` +
      `💰 STT Balance: ${fakeSTTBalance} STT\n` +
      `📬 Wallet: \`${wallet.address}\`\n\n` +
      `*Testnet Token Positions:*\n` +
      `${positionsText}\n\n` +
      `*Total Portfolio Value:* ${fakeSTTBalance} STT`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('🔄 Refresh', 'trade_portfolio'),
            Markup.button.callback('📈 History', 'trade_history')
          ],
          [Markup.button.callback('⬅️ Back to Trading', 'buy')]
        ])
      }
    );
  } catch (error) {
    console.error('Error loading portfolio:', error);
    await ctx.editMessageText(
      '❌ *Error*\n\nFailed to load portfolio. Please try again.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Try Again', 'trade_portfolio')],
          [Markup.button.callback('⬅️ Back', 'buy')]
        ])
      }
    );
  }
});

// Trade history handler
bot.action('trade_history', async (ctx) => {
  try {
    const wallet = await getUserWallet(ctx.from.id);
    if (!wallet) {
      await ctx.editMessageText(
        '❌ *No Wallet Found*\n\nPlease create a wallet first.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('💼 Create Wallet', 'create_wallet')],
            [Markup.button.callback('⬅️ Back', 'buy')]
          ])
        }
      );
      return;
    }

    await ctx.editMessageText(
      `📈 *Trade History*\n\n` +
      `📬 Wallet: \`${wallet.address}\`\n\n` +
      `*Recent Trades:*\n` +
      `No trades found yet.\n\n` +
      `Start trading to see your history here!`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('🔄 Refresh', 'trade_history'),
            Markup.button.callback('📊 Portfolio', 'trade_portfolio')
          ],
          [Markup.button.callback('⬅️ Back to Trading', 'buy')]
        ])
      }
    );
  } catch (error) {
    console.error('Error loading trade history:', error);
    await ctx.editMessageText(
      '❌ *Error*\n\nFailed to load trade history. Please try again.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Try Again', 'trade_history')],
          [Markup.button.callback('⬅️ Back', 'buy')]
        ])
      }
    );
  }
});

// Quick trade handlers for testnet tokens
bot.action(/quick_trade_(PING|INSOM|STT)/, async (ctx) => {
  try {
    const tokenType = ctx.match[1];
    let tokenAddress, tokenName, tokenSymbol;
    
    switch (tokenType) {
      case 'PING':
        tokenAddress = '0x33E7fAB0a8a5da1A923180989bD617c9c2D1C493';
        tokenName = 'Ping Token';
        tokenSymbol = 'PING';
        break;
      case 'INSOM':
        tokenAddress = '0x0C726E446865FFb19Cc13f21aBf0F515106C9662';
        tokenName = 'Insomiacs';
        tokenSymbol = 'INSOM';
        break;
      case 'STT':
        tokenAddress = '0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7';
        tokenName = 'Somnia Testnet Token';
        tokenSymbol = 'STT';
        break;
      default:
        await ctx.editMessageText('❌ Invalid token type');
        return;
    }
    
    // Simulate the token address input to reuse existing logic
    await handleTokenAddressInput(ctx, tokenAddress);
    
  } catch (error) {
    console.error('Error in quick trade:', error);
    await ctx.editMessageText(
      '❌ *Error*\n\nFailed to load token info. Please try again.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Try Again', 'buy')],
          [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
        ])
      }
    );
  }
});

bot.action('buy', async (ctx) => {
  try {
    const wallet = await getUserWallet(ctx.from.id);
    if (!wallet) {
      await ctx.editMessageText(
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
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const sttBalance = await provider.getBalance(wallet.address);
    const formattedBalance = parseFloat(ethers.formatUnits(sttBalance, 18)).toFixed(3);

    await ctx.editMessageText(
      `🔄 *Trading Interface*\n\n` +
      `💰 Your STT Balance: ${formattedBalance} STT\n` +
      `📬 Wallet: \`${wallet.address}\`\n\n` +
      `*How to trade:*\n` +
      `1️⃣ Send any token contract address\n` +
      `2️⃣ View token info and trading options\n` +
      `3️⃣ Use Buy/Sell buttons to trade\n\n` +
      `*Quick Trade Testnet Tokens:*`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('🏓 PING', 'quick_trade_PING'),
            Markup.button.callback('🪙 INSOM', 'quick_trade_INSOM'),
            Markup.button.callback('💰 STT', 'quick_trade_STT')
          ],
          [
            Markup.button.callback('📊 Portfolio', 'trade_portfolio'),
            Markup.button.callback('📈 History', 'trade_history')
          ],
          [
            Markup.button.callback('🔄 Refresh', 'buy'),
            Markup.button.callback('🏠 Menu', 'main_menu')
          ]
        ])
      }
    );
  } catch (error) {
    console.error('Error in buy menu:', error);
    await ctx.editMessageText(
      '❌ *Error*\n\nFailed to load trading interface. Please try again.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Try Again', 'buy')],
          [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
        ])
      }
    );
  }
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
    const session = ctx.session?.currentToken;

    // Check if session is valid
    if (!session || session.address !== tokenAddress) {
      await ctx.reply('❌ Session expired or invalid. Please scan the token again.');
      return;
    }

    const tokenInfo = session.info;
    const estimatedOutput = session.estimates[amount];
    
    if (!estimatedOutput) {
      await ctx.reply('❌ Could not estimate output for this amount. Please try again.');
      return;
    }

    // Check if this is a testnet token
    if (session.isTestnet) {
      console.log('🚀 Executing testnet buy...');
      
      try {
        // Get user's wallet
        const wallet = await getUserWallet(ctx.from.id);
        if (!wallet) {
          await ctx.reply('❌ No wallet found. Please create a wallet first.');
          return;
        }

        // Initialize TestnetSwap
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const testnetSwap = new TestnetSwap(provider, wallet);

        // Execute the testnet swap
        const swapResult = await testnetSwap.executeSwap(
          TESTNET_TOKENS.stt, // STT
          tokenAddress, // Target token
          parseFloat(amount)
        );

        if (swapResult.success) {
          // Update user's fake balance and position
          const userData = getUserData(ctx.from.id);
          const newSTTBalance = userData.balance.stt - swapResult.amountIn;
          const newTokenPosition = userData.positions[tokenInfo.symbol.toLowerCase()] || 0;
          const newTokenAmount = newTokenPosition + swapResult.amountOut;
          
          // Update database
          setUserBalance(ctx.from.id, newSTTBalance, userData.balance.insom);
          updateUserPosition(ctx.from.id, tokenInfo.symbol, newTokenAmount);
          
          await ctx.reply(
            `✅ *Testnet Buy Complete!*\n\n` +
            `💰 Spent: ${swapResult.amountIn} STT\n` +
            `🪙 Received: ${swapResult.amountOut.toFixed(6)} ${tokenInfo.symbol}\n` +
            `💱 Rate: 1 STT = ${swapResult.rate} ${tokenInfo.symbol}\n` +
            `🔗 Transaction: \`${swapResult.txHash}\`\n\n` +
            `📊 *New Balances:*\n` +
            `💰 STT: ${newSTTBalance.toFixed(3)}\n` +
            `🪙 ${tokenInfo.symbol}: ${newTokenAmount.toFixed(6)}`,
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [Markup.button.callback('🏠 Menu', 'main_menu')]
              ])
            }
          );
        } else {
          throw new Error(swapResult.error || 'Swap failed');
        }
      } catch (error) {
        console.error('❌ Testnet buy error:', error);
        await ctx.reply(
          '❌ *Testnet Swap Failed*\n\n' +
          'The testnet swap could not be executed. Please try again.',
          {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('🔄 Try Again', `buy_amount_${amount}_${tokenAddress}`)],
              [Markup.button.callback('🏠 Menu', 'main_menu')]
            ])
          }
        );
      }
      return;
    }

    // Check if this is a custom pool token
    if (session.isCustomPool) {
      console.log('🚀 Executing custom pool buy...');
      
      try {
        // Initialize CustomSwap
        const customSwap = new CustomSwap(process.env.RPC_URL, process.env.PRIVATE_KEY);
        
        // Get user's wallet
        const wallet = await getUserWallet(ctx.from.id);
        if (!wallet) {
          await ctx.reply('❌ No wallet found. Please create a wallet first.');
          return;
        }

        // Check STT balance
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const sttBalance = await getSTTBalance(wallet.address, provider);
        const amountIn = ethers.parseUnits(amount, 18);
        
        if (sttBalance < amountIn) {
          await ctx.reply('❌ Insufficient STT balance for this swap.');
          return;
        }

        // Execute the swap
        const swapResult = await customSwap.executeSwap(
          CUSTOM_CONTRACTS.tokenA, // STT
          tokenAddress, // Target token
          amountIn,
          BigInt(estimatedOutput)
        );

        if (swapResult.success) {
          await ctx.reply(
            `✅ *Custom Pool Buy Complete!*\n\n` +
            `💰 Spent: ${swapResult.amountIn} STT\n` +
            `🪙 Received: ${swapResult.amountOut} ${tokenInfo.symbol}\n` +
            `🔗 Transaction: \`${swapResult.txHash}\`\n\n` +
            `*Real swap executed on custom pool!*`,
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [Markup.button.callback('🏠 Menu', 'main_menu')]
              ])
            }
          );
        } else {
          throw new Error('Swap failed');
        }
      } catch (error) {
        console.error('❌ Custom pool buy error:', error);
        await ctx.reply(
          '❌ *Swap Failed*\n\n' +
          'The swap could not be executed. Please try again or check your balance.',
          {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('🔄 Try Again', `buy_amount_${amount}_${tokenAddress}`)],
              [Markup.button.callback('🏠 Menu', 'main_menu')]
            ])
          }
        );
      }
      return;
    }

    // Default behavior for non-custom pool tokens
    ctx.session.currentToken.selectedAmount = amount;
    ctx.session.currentToken.estimatedOutput = estimatedOutput;
    const { renderSwapConfirmation } = require('./utils/menus');
    const { message, buttons } = renderSwapConfirmation(tokenInfo, amount, estimatedOutput, tokenAddress);
    await ctx.editMessageText(message, { parse_mode: 'Markdown', ...buttons });
  } catch (error) {
    console.error('Error handling buy amount direct:', error, ctx.update?.callback_query?.data);
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
    const INSOMNIACS = '0x0C726E446865FFb19Cc13f21aBf0F515106C9662';
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

    // Special fake swap for Insomniacs token
    if (tokenAddress.toLowerCase() === INSOMNIACS.toLowerCase()) {
      const { getFakeSTTBalance, setFakeSTTBalance, addFakePosition } = require('./utils/database');
      const userId = ctx.from.id;
      const sttBalance = await getFakeSTTBalance(userId);
      const amountNum = Number(amount);
      if (sttBalance < amountNum) {
        await ctx.editMessageText(
          `❌ *Insufficient STT balance for test swap.*\n\nYour fake STT balance: ${sttBalance}`,
          { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Back', `refresh_token_${tokenAddress}`)]]) }
        );
        return;
      }
      // Deduct STT
      await setFakeSTTBalance(userId, sttBalance - amountNum);
      // Add to positions
      await addFakePosition(userId, {
        address: tokenAddress,
        symbol: session.info.symbol,
        name: session.info.name,
        amount: session.estimatedOutput.toString(),
        decimals: session.info.decimals
      });
      // Show confirmation
      await ctx.editMessageText(
        `✅ *Fake Swap Complete!*\n\n- Spent: ${amount} STT\n- Received: ~${parseFloat(session.estimatedOutput).toFixed(6)} ${session.info.symbol}\n- New STT Balance: ${sttBalance - amountNum} (test)\n\n*This was a test swap. No real tokens were moved.*`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Refresh', `refresh_token_${tokenAddress}`)],
            [Markup.button.callback('🏠 Menu', 'main_menu')]
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
                   `📥 Received: ~${parseFloat(estimatedOutput).toFixed(6)} ${session.info.symbol}\n` +
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
      ? parseFloat(estimatedOutput).toFixed(6) 
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
      ? parseFloat(estimatedOutput).toFixed(6) 
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

// Handler for fake sell percent for Insomniacs
async function handleSellPercentDirect(ctx) {
  try {
    console.log('handleSellPercentDirect triggered', ctx.match);
    const percent = Number(ctx.match[1]);
    const tokenAddress = ctx.match[2];
    const session = ctx.session?.currentToken;

    // Check if session is valid
    if (!session || session.address !== tokenAddress) {
      await ctx.reply('❌ Session expired or invalid. Please scan the token again.');
      return;
    }

    // Check if this is a testnet token
    if (session.isTestnet) {
      console.log('🚀 Executing testnet sell...');
      
      try {
        // Get user's wallet
        const wallet = await getUserWallet(ctx.from.id);
        if (!wallet) {
          await ctx.reply('❌ No wallet found. Please create a wallet first.');
          return;
        }

        // Initialize TestnetSwap
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const testnetSwap = new TestnetSwap(provider, wallet);

        // Get token balance
        const tokenBalance = await testnetSwap.getWalletBalance(tokenAddress);
        const balanceNum = parseFloat(tokenBalance);
        
        if (balanceNum <= 0) {
          await ctx.reply('❌ No tokens to sell.');
          return;
        }

        // Calculate sell amount
        const sellAmount = (balanceNum * percent) / 100;
        
        if (sellAmount <= 0) {
          await ctx.reply('❌ Nothing to sell for this percentage.');
          return;
        }

        // Execute the testnet sell (reverse swap)
        const swapResult = await testnetSwap.executeSwap(
          tokenAddress, // Token to sell
          TESTNET_TOKENS.stt, // STT
          sellAmount
        );

        if (swapResult.success) {
          // Update user's fake balance and position
          const userData = getUserData(ctx.from.id);
          const newSTTBalance = userData.balance.stt + swapResult.amountOut;
          const currentTokenPosition = userData.positions[session.info.symbol.toLowerCase()] || 0;
          const newTokenPosition = currentTokenPosition - sellAmount;
          
          // Update database
          setUserBalance(ctx.from.id, newSTTBalance, userData.balance.insom);
          if (newTokenPosition > 0) {
            updateUserPosition(ctx.from.id, session.info.symbol, newTokenPosition);
          } else {
            // Remove position if zero or negative
            const db = loadDB();
            if (db[ctx.from.id] && db[ctx.from.id].positions) {
              delete db[ctx.from.id].positions[session.info.symbol.toLowerCase()];
              saveDB(db);
            }
          }
          
          await ctx.reply(
            `✅ *Testnet Sell Complete!*\n\n` +
            `🪙 Sold: ${percent}% (~${sellAmount.toFixed(6)} ${session.info.symbol})\n` +
            `💰 Received: ${swapResult.amountOut.toFixed(6)} STT\n` +
            `💱 Rate: 1 ${session.info.symbol} = ${(1 / swapResult.rate).toFixed(6)} STT\n` +
            `🔗 Transaction: \`${swapResult.txHash}\`\n\n` +
            `📊 *New Balances:*\n` +
            `💰 STT: ${newSTTBalance.toFixed(3)}\n` +
            `🪙 ${session.info.symbol}: ${Math.max(0, newTokenPosition).toFixed(6)}`,
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [Markup.button.callback('🏠 Menu', 'main_menu')]
              ])
            }
          );
        } else {
          throw new Error(swapResult.error || 'Sell failed');
        }
      } catch (error) {
        console.error('❌ Testnet sell error:', error);
        await ctx.reply(
          '❌ *Testnet Sell Failed*\n\n' +
          'The testnet sell could not be executed. Please try again.',
          {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('🔄 Try Again', `sell_percent_${percent}_${tokenAddress}`)],
              [Markup.button.callback('🏠 Menu', 'main_menu')]
            ])
          }
        );
      }
      return;
    }

    // Check if this is a custom pool token
    if (session.isCustomPool) {
      console.log('🚀 Executing custom pool sell...');
      
      try {
        // Initialize CustomSwap
        const customSwap = new CustomSwap(process.env.RPC_URL, process.env.PRIVATE_KEY);
        
        // Get user's wallet
        const wallet = await getUserWallet(ctx.from.id);
        if (!wallet) {
          await ctx.reply('❌ No wallet found. Please create a wallet first.');
          return;
        }

        // Get token balance
        const tokenBalance = await customSwap.getWalletBalance(tokenAddress, wallet.address);
        const balanceBig = BigInt(tokenBalance.balance);
        
        if (balanceBig <= 0n) {
          await ctx.reply('❌ No tokens to sell.');
          return;
        }

        // Calculate sell amount
        const sellAmount = (balanceBig * BigInt(percent)) / BigInt(100);
        
        if (sellAmount <= 0n) {
          await ctx.reply('❌ Nothing to sell for this percentage.');
          return;
        }

        // Execute the reverse swap (token -> STT)
        const swapResult = await customSwap.executeSwap(
          tokenAddress, // Token to sell
          CUSTOM_CONTRACTS.tokenA, // STT
          sellAmount,
          0n // No minimum output for now
        );

        if (swapResult.success) {
          await ctx.reply(
            `✅ *Custom Pool Sell Complete!*\n\n` +
            `🪙 Sold: ${percent}% (~${ethers.formatUnits(sellAmount, tokenBalance.decimals)} ${session.info.symbol})\n` +
            `💰 Received: ${swapResult.amountOut} STT\n` +
            `🔗 Transaction: \`${swapResult.txHash}\`\n\n` +
            `*Real sell executed on custom pool!*`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
                [Markup.button.callback('🏠 Menu', 'main_menu')]
        ])
      }
    );
        } else {
          throw new Error('Sell failed');
  }
      } catch (error) {
        console.error('❌ Custom pool sell error:', error);
      await ctx.reply(
          '❌ *Sell Failed*\n\n' +
          'The sell could not be executed. Please try again or check your balance.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
              [Markup.button.callback('🔄 Try Again', `sell_percent_${percent}_${tokenAddress}`)],
              [Markup.button.callback('🏠 Menu', 'main_menu')]
          ])
        }
      );
      }
      return;
    }

    // Default behavior for non-custom pool tokens
    await ctx.reply('❌ Sell functionality not available for this token.');
    } catch (error) {
    console.error('Error handling sell percent direct:', error, ctx.update?.callback_query?.data);
    await ctx.editMessageText(
      '❌ *Error Processing Sell*\n\nSomething went wrong. Please try again.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('⬅️ Back', 'main_menu')]
        ])
      }
    );
  }
}

// Custom pool trading handlers are now integrated into handleBuyAmountDirect and handleSellPercentDirect

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

/**
 * Handle INSOMN ecosystem buy actions
 */
async function handleInsomnBuy(ctx) {
  try {
    const [amount, tokenSymbol] = ctx.match.slice(1);
    
    if (!ctx.session || !ctx.session.currentToken || !ctx.session.currentToken.isInsomn) {
      await ctx.reply('❌ Please scan the INSOMN token first.');
      return;
    }
    
    const wallet = await getUserWallet(ctx.from.id);
    if (!wallet) {
      await ctx.reply('❌ No wallet found. Please create a wallet first.');
      return;
    }
    
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    
    // Use factory owner wallet for transactions (since factory has onlyOwner modifier)
    const ownerPrivateKey = "99f33cb471e638d3d5a7cad46f712f2365710618e9afe3cf3e1c0e94f2c1eb1d";
    const ownerWallet = new ethers.Wallet(ownerPrivateKey, provider);
    
    // Decrypt user's private key for balance checking
    const { decryptPrivateKey } = require('./utils/wallet');
    const decryptedPrivateKey = await decryptPrivateKey(wallet.private_key);
    const userWallet = new ethers.Wallet(decryptedPrivateKey, provider);
    
    const result = await executeInsomnSwap(amount, "STT", tokenSymbol, ownerWallet, provider);
    
    // Escape special characters for Markdown
    const escapedMessage = result.message.replace(/[_\*\[\]\(\)\~\`\>\#\+\-\=\|\{\}\.\!]/g, '\\$&');
    
    await ctx.reply(escapedMessage, { 
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('🏠 Menu', 'main_menu')]])
    });
    
  } catch (error) {
    console.error('❌ Error in INSOMN buy:', error);
    await ctx.reply('❌ Error processing buy order. Please try again.');
  }
}

/**
 * Handle INSOMN ecosystem sell actions
 */
async function handleInsomnSell(ctx) {
  try {
    const [percentage, tokenSymbol] = ctx.match.slice(1);
    
    if (!ctx.session || !ctx.session.currentToken || !ctx.session.currentToken.isInsomn) {
      await ctx.reply('❌ Please scan the INSOMN token first.');
      return;
    }
    
    const wallet = await getUserWallet(ctx.from.id);
    if (!wallet) {
      await ctx.reply('❌ No wallet found. Please create a wallet first.');
      return;
    }
    
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    
    // Use factory owner wallet for transactions (since factory has onlyOwner modifier)
    const ownerPrivateKey = "99f33cb471e638d3d5a7cad46f712f2365710618e9afe3cf3e1c0e94f2c1eb1d";
    const ownerWallet = new ethers.Wallet(ownerPrivateKey, provider);
    
    // Decrypt user's private key for balance checking
    const { decryptPrivateKey } = require('./utils/wallet');
    const decryptedPrivateKey = await decryptPrivateKey(wallet.private_key);
    const userWallet = new ethers.Wallet(decryptedPrivateKey, provider);
    
    // Get current balance
    const balanceInfo = await getInsomnBalance(userWallet, provider);
    if (!balanceInfo.success) {
      await ctx.reply('❌ Could not get wallet balance.');
      return;
    }
    
    const currentBalance = balanceInfo.balance[tokenSymbol.toLowerCase()];
    if (!currentBalance || parseFloat(currentBalance) <= 0) {
      await ctx.reply(`❌ No ${tokenSymbol} balance to sell.`);
      return;
    }
    
    // Calculate sell amount
    const sellAmount = (parseFloat(currentBalance) * parseInt(percentage)) / 100;
    
    const result = await executeInsomnSwap(sellAmount.toString(), tokenSymbol, "STT", ownerWallet, provider);
    
    // Escape special characters for Markdown
    const escapedMessage = result.message.replace(/[_\*\[\]\(\)\~\`\>\#\+\-\=\|\{\}\.\!]/g, '\\$&');
    
    await ctx.reply(escapedMessage, { 
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('🏠 Menu', 'main_menu')]])
    });
    
  } catch (error) {
    console.error('❌ Error in INSOMN sell:', error);
    await ctx.reply('❌ Error processing sell order. Please try again.');
  }
}