const { Telegraf, Markup } = require('telegraf');
const { createNewWallet, importWallet, getWalletForUser } = require('../utils/wallet');
const { createUser, createWallet, getUser, getWallet } = require('../utils/database');
const { showMainMenu, showWalletChoiceMenu } = require('../utils/menus');
const { getSTTBalance } = require('../utils/tokenInfo');
const { ethers } = require('ethers');

/**
 * Check if a user exists in the database
 */
async function userExists(userId) {
  try {
    const user = await getUser(userId);
    return !!user;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a user has a wallet
 */
async function userHasWallet(userId) {
  try {
    const wallet = await getWallet(userId);
    return !!wallet;
  } catch (error) {
    return false;
  }
}

/**
 * Start command handler
 */
async function handleStart(ctx) {
  try {
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;
    
    console.log(`Start command for user ${userId}`);

    // STEP 1: Check if user has wallet saved in database
    const hasWallet = await userHasWallet(userId);
    
    if (hasWallet) {
      // === Wallet already exists — show home/dashboard ===
      console.log(`User ${userId} already has wallet, showing dashboard`);
      
      const wallet = await getWalletForUser(userId);
      if (!wallet) {
        // Fallback to wallet choice if wallet retrieval fails
        return showWalletChoiceMenu(ctx);
      }

      // Get STT balance with error handling
      let sttBalanceFormatted = '0.000';
      try {
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const sttBalance = await getSTTBalance(wallet.address, provider);
        sttBalanceFormatted = ethers.formatEther(sttBalance);
      } catch (balanceError) {
        console.error('Error fetching STT balance:', balanceError);
        // Keep '0.000' on error
      }

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
      
      if(ctx.session) {
        ctx.session.currentScreen = 'main_menu';
      }

      // Using reply instead of editMessageText for /start command
      await ctx.reply(
        message,
        {
          parse_mode: 'Markdown',
          reply_markup: mainMenuGrid,
          disable_web_page_preview: true
        }
      );

    } else {
      // === First time user — show Create/Import options ===
      console.log(`User ${userId} is new, showing wallet choice menu`);
      
      // Create user record if it doesn't exist
      const isReturning = await userExists(userId);
      if (!isReturning) {
        try {
          await createUser(userId, username);
          console.log(`Created user record for ${userId}`);
        } catch (error) {
          console.error('Error creating user:', error);
          // Continue anyway, user might already exist
        }
      }
      
      await ctx.reply(
        `Welcome to SomniaBot on Testnet.\n\n` +
        `Would you like to:`,
        {
          ...Markup.inlineKeyboard([
            [{ text: '🔐 Create New Wallet', callback_data: 'create_wallet' }],
            [{ text: '🔑 Import Existing Wallet', callback_data: 'import_wallet' }]
          ])
        }
      );
    }
  } catch (error) {
    console.error('Start command error:', error);
    return ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

/**
 * Handle wallet creation
 */
async function handleCreateWallet(ctx) {
  try {
    const userId = ctx.from.id;
    console.log(`Creating wallet for user ${userId}`);
    
    // Check if user already has a wallet
    const hasWallet = await userHasWallet(userId);
    console.log(`User ${userId} has wallet: ${hasWallet}`);
    if (hasWallet) {
      console.log(`User ${userId} already has wallet, redirecting to dashboard`);
      return handleStart(ctx);
    }
    
    // Create new wallet
    console.log(`Creating new wallet for user ${userId}`);
    const { address, encryptedKey } = await createNewWallet();
    console.log(`Wallet created: ${address}`);
    console.log(`Encrypted key length: ${encryptedKey.length}`);
    
    // Save to database
    console.log(`Saving wallet to database for user ${userId}`);
    try {
      await createWallet(userId, address, encryptedKey);
      console.log(`Wallet saved to database successfully`);
    } catch (dbError) {
      console.error('Database error saving wallet:', dbError);
      throw dbError;
    }

    // Verify wallet was saved
    const savedWallet = await getWallet(userId);
    console.log(`Verification - wallet in database: ${savedWallet ? 'YES' : 'NO'}`);

    // Get STT balance with error handling
    let formattedBalance = '0.000';
    try {
      console.log(`Fetching STT balance for ${address}`);
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
      const sttBalance = await getSTTBalance(address, provider);
      formattedBalance = parseFloat(ethers.formatUnits(sttBalance, 18)).toFixed(3);
      console.log(`STT balance: ${formattedBalance}`);
    } catch (balanceError) {
      console.error('Error fetching STT balance:', balanceError);
      formattedBalance = '0.000';
    }

    console.log(`Sending welcome message`);
    // Show welcome message with wallet info
    await ctx.reply(
      `👋 *Welcome to SomniaBot*\n\n` +
      `Your wallet has been successfully created and is now connected to the Somnia Testnet (Chain ID: 50312).\n\n` +
      `📩 *Your Address:* \`${address}\`\n` +
      `💰 *STT Balance:* ${formattedBalance} STT\n\n` +
      `Paste any *token address* to begin trading instantly!\n\n` +
      `You can also:\n` +
      `• Swap tokens directly\n` +
      `• Set limit orders\n` +
      `• Monitor your positions\n` +
      `• Bridge from testnets like Sepolia`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
           inline_keyboard: [
            [{ text: '💸 Buy', callback_data: 'buy' }, { text: '💵 Sell', callback_data: 'sell' }],
            [{ text: '📊 Positions', callback_data: 'positions' }, { text: '🔄 Refresh', callback_data: 'refresh' }],
            [{ text: '⚙️ Settings', callback_data: 'settings' }, { text: '📥 Withdraw', callback_data: 'withdraw' }]
          ]
        }
      }
    );
    console.log(`Welcome message sent successfully`);
  } catch (error) {
    console.error('Create wallet error:', error);
    console.error('Error stack:', error.stack);
    return ctx.reply(
      '❌ *Error Creating Wallet*\n\nSomething went wrong while creating your wallet. Please try again.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Try Again', 'create_wallet')],
          [Markup.button.callback('🏠 Main Menu', 'main_menu')]
        ])
      }
    );
  }
}

/**
 * Handle wallet import
 */
async function handleImportWallet(ctx) {
  try {
    const userId = ctx.from.id;
    
    // Check if user already has a wallet
    const hasWallet = await userHasWallet(userId);
    if (hasWallet) {
      console.log(`User ${userId} already has wallet, redirecting to dashboard`);
      return handleStart(ctx);
    }
    
    // Set session to wait for private key
    ctx.session = { ...ctx.session, waitingForPrivateKey: true };
    
    // Prompt for private key
    await ctx.reply(
      '🔐 *Import Existing Wallet*\n\n' +
      'Please send your private key. I will delete the message immediately after processing.\n\n' +
      '⚠️ **Security Note**: Never share your private key with anyone else!',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('❌ Cancel', 'main_menu')]
        ])
      }
    );
  } catch (error) {
    console.error('Import wallet error:', error);
    return ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

/**
 * Handle private key input
 */
async function handlePrivateKeyInput(ctx) {
  try {
    const userId = ctx.from.id;
    const privateKey = ctx.message.text.trim();

    // Delete the message containing the private key immediately
    try {
      await ctx.deleteMessage(ctx.message.message_id);
    } catch (error) {
      console.log('Could not delete private key message:', error.message);
    }

    // Check if user already has a wallet
    const hasWallet = await userHasWallet(userId);
    if (hasWallet) {
      console.log(`User ${userId} already has wallet, redirecting to dashboard`);
      return handleStart(ctx);
    }

    // Import wallet from private key
    const { address, encryptedKey } = await importWallet(privateKey);
    
    // Save to database
    await createWallet(userId, address, encryptedKey);

    // Get STT balance with error handling
    let formattedBalance = '0.000';
    try {
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
      const sttBalance = await getSTTBalance(address, provider);
      formattedBalance = parseFloat(ethers.formatUnits(sttBalance, 18)).toFixed(3);
    } catch (balanceError) {
      console.error('Error fetching STT balance:', balanceError);
      formattedBalance = '0.000';
    }

    // Show welcome message with wallet info
    await ctx.reply(
      `👋 *Welcome to SomniaBot*\n\n` +
      `Your wallet has been successfully imported and is now connected to the Somnia Testnet (Chain ID: 50312).\n\n` +
      `📩 *Your Address:* \`${address}\`\n` +
      `💰 *STT Balance:* ${formattedBalance} STT\n\n` +
      `Paste any *token address* to begin trading instantly!\n\n` +
      `You can also:\n` +
      `• Swap tokens directly\n` +
      `• Set limit orders\n` +
      `• Monitor your positions\n` +
      `• Bridge from testnets like Sepolia`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [{ text: '💸 Buy', callback_data: 'buy' }, { text: '💵 Sell', callback_data: 'sell' }],
          [{ text: '📊 Positions', callback_data: 'positions' }, { text: '📈 Limit Orders', callback_data: 'limit' }],
          [{ text: '🌉 Bridge', callback_data: 'bridge' }, { text: '🔄 Refresh', callback_data: 'refresh' }]
        ])
      }
    );

    // Reset session
    delete ctx.session.waitingForPrivateKey;
  } catch (error) {
    console.error('Private key input error:', error);
    await ctx.reply('Sorry, something went wrong while importing your wallet.');
  }
}

module.exports = {
  handleStart,
  handleCreateWallet,
  handleImportWallet,
  handlePrivateKeyInput
}; 