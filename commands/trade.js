const { ethers } = require('ethers');
const { Markup } = require('telegraf');
const { getWalletForUser } = require('../utils/wallet');
const { swapTokens, getAmountsOut, calculateAmountOutMin, validatePair } = require('../utils/dex');
const { generateTradeImage } = require('../utils/imageGen');
const { getTokenMetadata } = require('../utils/tokenInfo');
const { saveTrade, getTradeHistory } = require('../utils/database');
const { mainMenuButtons, tradeActionButtons, persistentButtons } = require('../handlers/inlineButtons');
const { getWallet, getTokenBalance, getChainBalance } = require('../utils/walletManager');
const { JsonRpcProvider, parseUnits, formatUnits } = require('ethers');

// Testnet token addresses
const TOKENS = {
  'USDT.g': '0x1234567890123456789012345678901234567890', // Replace with actual testnet address
  'NIA': '0x2345678901234567890123456789012345678901',   // Replace with actual testnet address
  'PING': '0x3456789012345678901234567890123456789012',  // Replace with actual testnet address
  'PONG': '0x4567890123456789012345678901234567890123'   // Replace with actual testnet address
};

/**
 * Trade command handler
 */
async function handleTrade(ctx) {
  try {
    await ctx.editMessageText(
      '🔄 *Somnia Trading*\n\nSelect a token to trade:',
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
  } catch (error) {
    console.error('Trade command error:', error);
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

/**
 * Token selection handler
 */
async function handleTokenSelection(ctx) {
  try {
    const tokenSymbol = ctx.match[1];
    const tokenAddress = TOKENS[tokenSymbol];
    
    if (!tokenAddress) {
      await ctx.editMessageText(
        `❌ Token ${tokenSymbol} not found on testnet.`,
        Markup.inlineKeyboard(persistentButtons)
      );
      return;
    }

    await ctx.editMessageText(
      `🔄 *${tokenSymbol} Trading*\n\nSelect action:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(tradeActionButtons(tokenAddress, 'trade'))
      }
    );
  } catch (error) {
    console.error('Token selection error:', error);
    await ctx.editMessageText(
      '❌ Error loading token. Please try again.',
      Markup.inlineKeyboard(persistentButtons)
    );
  }
}

/**
 * Buy/Sell action handler
 */
async function handleTradeAction(ctx) {
  try {
    const action = ctx.match[1]; // 'buy' or 'sell'
    const tokenAddress = ctx.match[2];
    
    // Get token metadata
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const tokenInfo = await getTokenMetadata(tokenAddress, provider);
    
    await ctx.editMessageText(
      `📈 *${action.toUpperCase()} ${tokenInfo.symbol}*\n\nSelect amount:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('💰 0.1', `amount_0.1_${action}_${tokenAddress}`),
            Markup.button.callback('💰 0.5', `amount_0.5_${action}_${tokenAddress}`),
            Markup.button.callback('💰 1.0', `amount_1.0_${action}_${tokenAddress}`)
          ],
          [
            Markup.button.callback('💰 2.0', `amount_2.0_${action}_${tokenAddress}`),
            Markup.button.callback('💰 5.0', `amount_5.0_${action}_${tokenAddress}`),
            Markup.button.callback('💰 10.0', `amount_10.0_${action}_${tokenAddress}`)
          ],
          [
            Markup.button.callback('✏️ Custom', `custom_${action}_${tokenAddress}`),
            Markup.button.callback('🔄 Refresh', 'refresh'),
            Markup.button.callback('🏠 Menu', 'main_menu')
          ]
        ])
      }
    );
  } catch (error) {
    console.error('Trade action error:', error);
    await ctx.editMessageText(
      '❌ Error processing trade action. Please try again.',
      Markup.inlineKeyboard(persistentButtons)
    );
  }
}

/**
 * Amount selection handler
 */
async function handleAmountSelection(ctx) {
  try {
    const amount = ctx.match[1];
    const action = ctx.match[2];
    const tokenAddress = ctx.match[3];
    
    // Get user's wallet
    const wallet = await getWalletForUser(ctx.from.id);
    if (!wallet) {
      await ctx.editMessageText(
        '❌ No wallet found. Please create a wallet first.',
        Markup.inlineKeyboard(mainMenuButtons)
      );
      return;
    }

    // Get token metadata
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const tokenInfo = await getTokenMetadata(tokenAddress, provider);
    
    // Calculate amounts
    const amountIn = ethers.parseUnits(amount, tokenInfo.decimals);
    const WSTT = process.env.WETH_ADDRESS;
    const path = action === 'buy' ? [WSTT, tokenAddress] : [tokenAddress, WSTT];
    try {
      const amountOut = await getAmountsOut(amountIn, path);
      const amountOutMin = calculateAmountOutMin(amountOut, 1); // 1% slippage
      await ctx.editMessageText(
        `📊 *Trade Preview*\n\n` +
        `${action.toUpperCase()}: ${amount} ${tokenInfo.symbol}\n` +
        `Expected: ${ethers.formatUnits(amountOut, tokenInfo.decimals)} ${action === 'buy' ? tokenInfo.symbol : 'STT'}\n` +
        `Slippage: 1%\n` +
        `Gas: ~300,000`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback('✅ Confirm', `confirm_${action}_${tokenAddress}_${amount}`),
              Markup.button.callback('❌ Cancel', `cancel_${action}_${tokenAddress}`),
              Markup.button.callback('⚙️ Settings', 'settings')
            ],
            [
              Markup.button.callback('🔄 Refresh', 'refresh'),
              Markup.button.callback('📊 Info', `info_${tokenAddress}`),
              Markup.button.callback('🏠 Menu', 'main_menu')
            ]
          ])
        }
      );
    } catch (error) {
      await ctx.editMessageText(
        `❌ Insufficient liquidity for this trade.\n\n${error.message || ''}`,
        Markup.inlineKeyboard(persistentButtons)
      );
    }
  } catch (error) {
    console.error('Amount selection error:', error);
    await ctx.editMessageText(
      '❌ Error calculating trade. Please try again.',
      Markup.inlineKeyboard(persistentButtons)
    );
  }
}

/**
 * Trade confirmation handler
 */
async function handleTradeConfirmation(ctx) {
  try {
    const action = ctx.match[1];
    const tokenAddress = ctx.match[2];
    const amount = ctx.match[3];
    
    // Get user's wallet
    const wallet = await getWalletForUser(ctx.from.id);
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const tokenInfo = await getTokenMetadata(tokenAddress, provider);
    
    // Calculate amounts
    const amountIn = ethers.parseUnits(amount, tokenInfo.decimals);
    const WSTT = process.env.WETH_ADDRESS;
    const path = action === 'buy' ? [WSTT, tokenAddress] : [tokenAddress, WSTT];
    let amountOut, amountOutMin, result;
    try {
      amountOut = await getAmountsOut(amountIn, path);
      amountOutMin = calculateAmountOutMin(amountOut, 1);
    } catch (error) {
      await ctx.editMessageText(
        `❌ Trade failed: Could not estimate output.\n\n${error.message || ''}`,
        Markup.inlineKeyboard(persistentButtons)
      );
      return;
    }
    try {
      result = await swapTokens(
        amountIn,
        amountOutMin,
        path[0],
        path[1],
        wallet
      );
    } catch (error) {
      await ctx.editMessageText(
        `❌ Trade failed: Swap could not be executed.\n\n${error.message || ''}`,
        Markup.inlineKeyboard(persistentButtons)
      );
      return;
    }
    if (result.success) {
      // Save trade to database
      await saveTrade({
        userId: ctx.from.id,
        tokenIn: path[0],
        tokenOut: path[1],
        amountIn: amountIn.toString(),
        amountOut: amountOut.toString(),
        txHash: result.txHash,
        type: action
      });
      // Generate trade image
      const imagePath = await generateTradeImage({
        tokenIn: tokenInfo.symbol,
        tokenOut: action === 'buy' ? tokenInfo.symbol : 'STT',
        amount,
        price: ethers.formatUnits(amountOut, tokenInfo.decimals),
        txHash: result.txHash,
        type: action
      });
      // Send success message with image
      await ctx.replyWithPhoto(
        { source: imagePath },
        {
          caption: `✅ *Trade Successful!*\n\n` +
                   `Type: ${action.toUpperCase()}\n` +
                   `Amount: ${amount} ${tokenInfo.symbol}\n` +
                   `Tx: \`${result.txHash}\``,
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard(persistentButtons)
        }
      );
      // Delete the confirmation message
      await ctx.deleteMessage();
    } else {
      await ctx.editMessageText(
        `❌ *Trade Failed*\n\nError: ${result.error}`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard(persistentButtons)
        }
      );
    }
  } catch (error) {
    console.error('Trade confirmation error:', error);
    await ctx.editMessageText(
      '❌ Error executing trade. Please try again.',
      Markup.inlineKeyboard(persistentButtons)
    );
  }
}

/**
 * Trade history handler
 */
async function handleTradeHistory(ctx) {
  try {
    const userId = ctx.from.id;
    const trades = await getTradeHistory(userId, 10);
    
    if (trades.length === 0) {
      await ctx.editMessageText(
        '📊 *Trade History*\n\nNo trades found.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard(persistentButtons)
        }
      );
      return;
    }
    
    let historyText = '📊 *Recent Trades*\n\n';
    trades.forEach((trade, index) => {
      const date = new Date(trade.created_at).toLocaleDateString();
      historyText += `${index + 1}. ${trade.type.toUpperCase()} ${trade.amount_in} → ${trade.amount_out}\n`;
      historyText += `   ${date} | \`${trade.tx_hash.substring(0, 10)}...\`\n\n`;
    });
    
    await ctx.editMessageText(
      historyText,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(persistentButtons)
      }
    );
  } catch (error) {
    console.error('Trade history error:', error);
    await ctx.editMessageText(
      '❌ Error loading trade history.',
      Markup.inlineKeyboard(persistentButtons)
    );
  }
}

/**
 * Farm handler for airdrop farming
 */
async function handleFarm(ctx) {
  try {
    await ctx.editMessageText(
      '🌾 *Airdrop Farming*\n\n' +
      'Perform micro-trades to earn airdrop points:\n\n' +
      '• 0.1 USDT.g → NIA\n' +
      '• 0.1 NIA → PING\n' +
      '• 0.1 PING → PONG\n\n' +
      'Points earned: 0',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('🌾 Start Farming', 'farm_start'),
            Markup.button.callback('📊 Points', 'farm_points'),
            Markup.button.callback('🏆 Leaderboard', 'farm_leaderboard')
          ],
          [
            Markup.button.callback('🔄 Refresh', 'refresh'),
            Markup.button.callback('📈 History', 'trade_history'),
            Markup.button.callback('🏠 Menu', 'main_menu')
          ]
        ])
      }
    );
  } catch (error) {
    console.error('Farm error:', error);
    await ctx.editMessageText(
      '❌ Error loading farming interface.',
      Markup.inlineKeyboard(persistentButtons)
    );
  }
}

function setupTradeCommands(bot) {
    // Main handler for text inputs to start a trade
    bot.on('text', async (ctx) => {
        // Ignore commands
        if (ctx.message.text.startsWith('/')) return;

        const text = ctx.message.text.trim();
        const provider = new JsonRpcProvider(process.env.RPC_URL);

        // Validate the token address
        const tokenData = await getTokenMetadata(text, provider);
        if (!tokenData.valid) {
            await ctx.reply(tokenData.error || '❌ Invalid token address.');
            return;
        }

        // For simplicity, we'll assume WETH (WSTT) is always one side of the pair.
        const tokenA = process.env.WETH_ADDRESS; // WSTT
        const tokenB = tokenData.address;

        // Check for liquidity
        const hasLiquidity = await validatePair(tokenA, tokenB);
        if (!hasLiquidity) {
            await ctx.reply(`❌ No liquidity found for a pair between ${tokenData.symbol} and WSTT.`);
            return;
        }

        // Store trade context in session
        ctx.session.trade = {
            tokenA: tokenA, // WSTT
            tokenB: tokenB,
            tokenBSymbol: tokenData.symbol,
            tokenBDecimals: tokenData.decimals,
            action: 'buy' // Default to buy
        };
        
        // Show Buy/Sell menu
        const message = `📈 Token: *${tokenData.symbol}*\n\nSelect action:`;
        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('🟢 Buy', `tradeAction_buy_${tokenB}`),
                Markup.button.callback('🔴 Sell', `tradeAction_sell_${tokenB}`)
            ],
            [Markup.button.callback('⬅️ Back to Main Menu', 'main_menu')]
        ]);

        await ctx.replyWithMarkdown(message, keyboard);
    });

    // Handler for "buy" or "sell" action buttons
    bot.action(/tradeAction_(buy|sell)_(0x[a-fA-F0-9]{40})/, async (ctx) => {
        const [, action, tokenAddress] = ctx.match;
        const { id: userId } = ctx.from;
        
        // Retrieve trade context from session
        if (!ctx.session.trade || ctx.session.trade.tokenB !== tokenAddress) {
            // If session is lost or mismatched, prompt for token again
            return ctx.editMessageText('Session expired. Please enter the token address again.');
        }
        
        ctx.session.trade.action = action;

        const message = `📈 *${action.toUpperCase()} ${ctx.session.trade.tokenBSymbol}*\n\nSelect amount to ${action} (in WSTT):`;
        
        const amounts = [0.1, 1, 5, 10];
        const amountButtons = amounts.map(amount => {
            // Correctly formatted callback data
            const callbackData = `tradeAmount_${action}_${amount}_${tokenAddress}`;
            return Markup.button.callback(`${amount} WSTT`, callbackData);
        });

        const keyboard = Markup.inlineKeyboard([
            amountButtons.slice(0, 2),
            amountButtons.slice(2, 4),
            [Markup.button.callback('Custom Amount', `tradeAmount_${action}_custom_${tokenAddress}`)],
            [Markup.button.callback('⬅️ Back', `trade_start_${tokenAddress}`)]
        ]);

        await ctx.editMessageText(message, { reply_markup: keyboard.reply_markup, parse_mode: 'Markdown' });
    });

    // ... any other trade-related bot listeners
}

module.exports = {
  handleTrade,
  handleTokenSelection,
  handleTradeAction,
  handleAmountSelection,
  handleTradeConfirmation,
  handleTradeHistory,
  handleFarm,
  setupTradeCommands
}; 