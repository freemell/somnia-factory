const { Telegraf, Markup } = require('telegraf');
const { getWalletForUser } = require('../utils/wallet');
const { supabase } = require('../db/supabase');
const { handleBridgeTransfer } = require('../utils/bridgeHandler');

/**
 * Bridge command handler
 */
async function handleBridge(ctx) {
  try {
    // Get user's wallet
    const wallet = await getWalletForUser(ctx.from.id);

    // Show token selection
    await ctx.reply(
      'Select token to bridge:',
      Markup.inlineKeyboard([
        [
          Markup.button.callback('SOM', 'bridge_som'),
          Markup.button.callback('USDT', 'bridge_usdt')
        ],
        [Markup.button.callback('❌ Cancel', 'cancel')]
      ])
    );
  } catch (error) {
    console.error('Bridge command error:', error);
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

/**
 * Token selection handler
 */
async function handleTokenSelection(ctx) {
  try {
    const token = ctx.match[1];
    
    // Show amount input
    await ctx.reply(
      'Enter amount to bridge:',
      Markup.inlineKeyboard([
        [
          Markup.button.callback('0.1', `bridge_amount_${token}_0.1`),
          Markup.button.callback('1', `bridge_amount_${token}_1`),
          Markup.button.callback('10', `bridge_amount_${token}_10`)
        ],
        [Markup.button.callback('❌ Cancel', 'cancel')]
      ])
    );
  } catch (error) {
    console.error('Token selection error:', error);
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

/**
 * Amount selection handler
 */
async function handleAmountSelection(ctx) {
  try {
    const [token, amount] = ctx.match[1].split('_');
    
    // Show destination chain selection
    await ctx.reply(
      'Select destination chain:',
      Markup.inlineKeyboard([
        [
          Markup.button.callback('Ethereum', `bridge_chain_${token}_${amount}_ethereum`),
          Markup.button.callback('BSC', `bridge_chain_${token}_${amount}_bsc`)
        ],
        [Markup.button.callback('❌ Cancel', 'cancel')]
      ])
    );
  } catch (error) {
    console.error('Amount selection error:', error);
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

/**
 * Chain selection handler
 */
async function handleChainSelection(ctx) {
  try {
    const [token, amount, chain] = ctx.match[1].split('_');
    
    // Check if bridge contract exists
    const bridgeContract = process.env[`BRIDGE_${chain.toUpperCase()}`];
    
    if (bridgeContract) {
      // Execute bridge transaction
      // Note: Implement bridge contract interaction here
      await ctx.reply('Bridge transaction initiated. You will be notified when it completes.');
    } else {
      // Generate bridge link
      const bridgeUrl = `https://bridge.somnia.network?token=${token}&amount=${amount}&chain=${chain}`;
      
      await ctx.reply(
        `Please use the Somnia Bridge to complete your transfer:\n\n${bridgeUrl}`,
        Markup.inlineKeyboard([
          [Markup.button.url('Open Bridge', bridgeUrl)],
          [Markup.button.callback('❌ Cancel', 'cancel')]
        ])
      );
    }
  } catch (error) {
    console.error('Chain selection error:', error);
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

// Bridge menu buttons
const bridgeMenuButtons = [
  [Markup.button.callback('Bridge ETH → SOM', 'bridge_eth')],
  [Markup.button.callback('Bridge USDT → SOM', 'bridge_usdt')],
  [Markup.button.callback('How It Works', 'bridge_how')],
  [Markup.button.callback('« Back to Main Menu', 'main_menu')]
];

// Amount selection buttons
function getAmountButtons(token) {
  return [
    [
      Markup.button.callback('0.1', `bridge_amount_${token}_0.1`),
      Markup.button.callback('0.5', `bridge_amount_${token}_0.5`),
      Markup.button.callback('1.0', `bridge_amount_${token}_1.0`)
    ],
    [
      Markup.button.callback('2.0', `bridge_amount_${token}_2.0`),
      Markup.button.callback('5.0', `bridge_amount_${token}_5.0`),
      Markup.button.callback('10.0', `bridge_amount_${token}_10.0`)
    ],
    [Markup.button.callback('« Back to Bridge Menu', 'bridge_menu')]
  ];
}

// Bridge command handler
async function handleBridgeCommand(ctx) {
  await ctx.reply(
    '🌉 *Bridge Assets*\n\n' +
    'Select the asset you want to bridge from Sepolia to Somnia:',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(bridgeMenuButtons)
    }
  );
}

// Bridge menu handler
async function handleBridgeMenu(ctx) {
  await ctx.editMessageText(
    '🌉 *Bridge Assets*\n\n' +
    'Select the asset you want to bridge from Sepolia to Somnia:',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(bridgeMenuButtons)
    }
  );
}

// Bridge asset selection handler
async function handleBridgeAsset(ctx) {
  const [_, token] = ctx.match[1].split('_');
  
  await ctx.editMessageText(
    `How much ${token.toUpperCase()} would you like to bridge?`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(getAmountButtons(token))
    }
  );
}

// Bridge amount selection handler
async function handleBridgeAmount(ctx) {
  const [_, token, amount] = ctx.match[1].split('_');
  
  // Get user's Sepolia address from database
  const { data: user } = await supabase
    .from('users')
    .select('sepolia_address')
    .eq('telegram_id', ctx.from.id)
    .single();
  
  if (!user?.sepolia_address) {
    return ctx.editMessageText(
      '❌ *Error*\n\n' +
      'Please set up your Sepolia wallet first.\n' +
      'Use the /wallet command to add your address.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('« Back to Bridge Menu', 'bridge_menu')]
        ])
      }
    );
  }
  
  await ctx.editMessageText(
    `🌉 *Bridge ${amount} ${token.toUpperCase()}*\n\n` +
    `Send ${amount} ${token.toUpperCase()} to this Sepolia address:\n\n` +
    `\`${process.env.BRIDGE_RECEIVER_ADDRESS}\`\n\n` +
    'Once you\'ve sent the tokens, click the button below to proceed.',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('✅ I\'ve Sent It', `bridge_confirm_${token}_${amount}`)],
        [Markup.button.callback('« Back to Bridge Menu', 'bridge_menu')]
      ])
    }
  );
}

// Bridge confirmation handler
async function handleBridgeConfirmation(ctx) {
  const [_, token, amount] = ctx.match[1].split('_');
  
  await ctx.editMessageText(
    '⏳ *Processing Bridge*\n\n' +
    'Please wait while we verify your transfer...',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Refresh Status', `bridge_status_${token}_${amount}`)]
      ])
    }
  );
  
  // Start bridge process
  const result = await handleBridgeTransfer(ctx.from.id, token, amount);
  
  if (result.success) {
    await ctx.editMessageText(
      '✅ *Bridge Successful!*\n\n' +
      `Amount: ${amount} ${token.toUpperCase()}\n` +
      `Transaction: \`${result.txHash}\`\n\n` +
      'Your tokens have been bridged to Somnia.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('« Back to Bridge Menu', 'bridge_menu')]
        ])
      }
    );
  } else {
    await ctx.editMessageText(
      '❌ *Bridge Failed*\n\n' +
      `Error: ${result.error}\n\n` +
      'Please try again or contact support.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('« Back to Bridge Menu', 'bridge_menu')]
        ])
      }
    );
  }
}

// How it works handler
async function handleBridgeHowItWorks(ctx) {
  await ctx.editMessageText(
    '📖 *How Bridge Works*\n\n' +
    '1. Select the asset you want to bridge\n' +
    '2. Choose the amount\n' +
    '3. Send the tokens to the provided address\n' +
    '4. Click "I\'ve Sent It" to confirm\n' +
    '5. Wait for the bridge to complete\n\n' +
    'The bridge process typically takes 1-2 minutes.',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('« Back to Bridge Menu', 'bridge_menu')]
      ])
    }
  );
}

module.exports = {
  handleBridge,
  handleTokenSelection,
  handleAmountSelection,
  handleChainSelection,
  handleBridgeCommand,
  handleBridgeMenu,
  handleBridgeAsset,
  handleBridgeAmount,
  handleBridgeConfirmation,
  handleBridgeHowItWorks
}; 