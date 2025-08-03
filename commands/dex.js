const DexService = require('../utils/dexService');
const { Markup } = require('telegraf');

const dexService = new DexService();

// Handle /pairs command
async function handlePairs(ctx) {
  try {
    await ctx.reply('🔍 Fetching all trading pairs...');
    
    const pairs = await dexService.getAllPairs();
    
    if (pairs.length === 0) {
      return ctx.reply('❌ No trading pairs found on the DEX.');
    }

    let message = `📊 **Trading Pairs (${pairs.length})**\n\n`;
    
    pairs.forEach((pair, index) => {
      message += `${index + 1}. **${pair.token0.symbol}/${pair.token1.symbol}**\n`;
      message += `   💰 Fee: ${pair.feePercentage * 100}%\n`;
      message += `   🏊 Pool: \`${pair.poolAddress}\`\n\n`;
    });

    message += `\n💡 Use /quote <tokenA> <tokenB> <amount> to get a swap quote`;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });
  } catch (error) {
    console.error('Error in handlePairs:', error);
    await ctx.reply('❌ Error fetching trading pairs. Please try again later.');
  }
}

// Handle /quote command
async function handleQuote(ctx) {
  try {
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length !== 3) {
      return ctx.reply(
        '❌ Invalid format. Use: `/quote <tokenA> <tokenB> <amount>`\n\n' +
        'Example: `/quote 0x123... 0x456... 100`',
        { parse_mode: 'Markdown' }
      );
    }

    const [tokenA, tokenB, amountStr] = args;
    const amount = parseFloat(amountStr);

    // Validate inputs
    if (!dexService.isValidAddress(tokenA) || !dexService.isValidAddress(tokenB)) {
      return ctx.reply('❌ Invalid token address. Please provide valid Ethereum addresses.');
    }

    if (isNaN(amount) || amount <= 0) {
      return ctx.reply('❌ Invalid amount. Please provide a positive number.');
    }

    await ctx.reply('🔍 Getting swap quote...');

    // Get token info
    const [tokenAInfo, tokenBInfo] = await Promise.all([
      dexService.getTokenInfo(tokenA),
      dexService.getTokenInfo(tokenB)
    ]);

    // Get quote
    const quote = await dexService.getQuote(tokenA, tokenB, amount);

    const message = `💱 **Swap Quote**\n\n` +
      `**From:** ${tokenAInfo.symbol} (${tokenAInfo.name})\n` +
      `**To:** ${tokenBInfo.symbol} (${tokenBInfo.name})\n\n` +
      `💰 **Amount In:** ${amount} ${tokenAInfo.symbol}\n` +
      `📤 **Amount Out:** ${quote.amountOut.toFixed(6)} ${tokenBInfo.symbol}\n\n` +
      `💸 **Fee:** ${(quote.fee * 100).toFixed(2)}% (${quote.feeAmount.toFixed(6)} ${tokenAInfo.symbol})\n` +
      `📈 **Price:** 1 ${tokenAInfo.symbol} = ${quote.price.toFixed(6)} ${tokenBInfo.symbol}\n\n` +
      `🏊 **Pool:** \`${quote.poolAddress}\``;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });
  } catch (error) {
    console.error('Error in handleQuote:', error);
    
    if (error.message.includes('Pool not found')) {
      await ctx.reply('❌ No trading pool found for this token pair.');
    } else {
      await ctx.reply('❌ Error getting quote. Please check your inputs and try again.');
    }
  }
}

// Handle /price command
async function handlePrice(ctx) {
  try {
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length !== 2) {
      return ctx.reply(
        '❌ Invalid format. Use: `/price <tokenA> <tokenB>`\n\n' +
        'Example: `/price 0x123... 0x456...`',
        { parse_mode: 'Markdown' }
      );
    }

    const [tokenA, tokenB] = args;

    // Validate inputs
    if (!dexService.isValidAddress(tokenA) || !dexService.isValidAddress(tokenB)) {
      return ctx.reply('❌ Invalid token address. Please provide valid Ethereum addresses.');
    }

    await ctx.reply('🔍 Getting current price...');

    // Get token info
    const [tokenAInfo, tokenBInfo] = await Promise.all([
      dexService.getTokenInfo(tokenA),
      dexService.getTokenInfo(tokenB)
    ]);

    // Get price
    const price = await dexService.getPrice(tokenA, tokenB);

    const message = `📈 **Current Price**\n\n` +
      `**${tokenAInfo.symbol}/${tokenBInfo.symbol}**\n\n` +
      `💰 **Price:** 1 ${tokenAInfo.symbol} = ${price.price.toFixed(6)} ${tokenBInfo.symbol}\n` +
      `🔄 **Inverse:** 1 ${tokenBInfo.symbol} = ${price.inversePrice.toFixed(6)} ${tokenAInfo.symbol}\n\n` +
      `💸 **Fee:** ${(price.feePercentage * 100).toFixed(2)}%\n` +
      `🏊 **Liquidity:** ${price.liquidity}`;

    await ctx.reply(message, {
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('Error in handlePrice:', error);
    
    if (error.message.includes('Pool not found')) {
      await ctx.reply('❌ No trading pool found for this token pair.');
    } else {
      await ctx.reply('❌ Error getting price. Please check your inputs and try again.');
    }
  }
}

// Handle /info command
async function handleInfo(ctx) {
  try {
    await ctx.reply('🔍 Fetching factory information...');
    
    const info = await dexService.getFactoryInfo();
    
    const message = `🏭 **Insomnia DEX Factory**\n\n` +
      `📍 **Address:** \`${info.address}\`\n` +
      `👑 **Owner:** \`${info.owner}\`\n` +
      `🏗️ **Pool Deployer:** \`${info.poolDeployer}\`\n\n` +
      `📊 **Statistics:**\n` +
      `   • Total Pools: ${info.poolCount}\n` +
      `   • Default Fee: ${info.defaultFee}\n` +
      `   • Default Tick Spacing: ${info.defaultTickSpacing}\n\n` +
      `💸 **Fee Tiers:**\n` +
      `   • 500 (0.05%)\n` +
      `   • 3000 (0.3%)\n` +
      `   • 10000 (1%)\n\n` +
      `🌐 **Network:** Somnia Mainnet\n` +
      `🔗 **Chain ID:** 50312`;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });
  } catch (error) {
    console.error('Error in handleInfo:', error);
    await ctx.reply('❌ Error fetching factory information. Please try again later.');
  }
}

// Handle help for DEX commands
async function handleDexHelp(ctx) {
  const message = `🤖 **DEX Commands Help**\n\n` +
    `📋 **Available Commands:**\n\n` +
    `/pairs - List all trading pairs on the DEX\n` +
    `/quote <tokenA> <tokenB> <amount> - Get swap quote\n` +
    `/price <tokenA> <tokenB> - Get current price\n` +
    `/info - Show factory information\n\n` +
    `💡 **Examples:**\n` +
    `• \`/pairs\` - List all pairs\n` +
    `• \`/quote 0x123... 0x456... 100\` - Get quote\n` +
    `• \`/price 0x123... 0x456...\` - Get price\n` +
    `• \`/info\` - Factory info\n\n` +
    `🔗 **Factory:** \`0xEc0a2Fa70BFAC604287eF479E9D1E14fF41f3075\`\n` +
    `🌐 **Network:** Somnia Mainnet`;

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true
  });
}

module.exports = {
  handlePairs,
  handleQuote,
  handlePrice,
  handleInfo,
  handleDexHelp
}; 