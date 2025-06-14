const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const fs = require('fs');

/**
 * Generates a trade result image
 */
async function generateTradeImage(tradeData) {
  try {
    // Load template image
    const templatePath = path.join(__dirname, '../public/template.png');
    const template = await loadImage(templatePath);

    // Create canvas with template dimensions
    const canvas = createCanvas(template.width, template.height);
    const ctx = canvas.getContext('2d');

    // Draw template
    ctx.drawImage(template, 0, 0);

    // Set text styles
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';

    // Draw success message
    ctx.fillText('✅ Trade Successful', canvas.width / 2, 100);

    // Draw token info
    ctx.font = '24px Arial';
    ctx.fillText(
      `${tradeData.tokenIn} → ${tradeData.tokenOut}`,
      canvas.width / 2,
      160
    );

    // Draw amount and price
    ctx.fillText(
      `Amount: ${tradeData.amount}`,
      canvas.width / 2,
      200
    );
    ctx.fillText(
      `Price: $${tradeData.price}`,
      canvas.width / 2,
      240
    );

    // Draw transaction hash
    ctx.font = '18px Arial';
    ctx.fillText(
      `Tx: ${tradeData.txHash}`,
      canvas.width / 2,
      300
    );

    // Save image
    const outputPath = path.join(__dirname, '../public/trades', `${tradeData.txHash}.png`);
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(outputPath, buffer);

    return outputPath;
  } catch (error) {
    console.error('Error generating trade image:', error);
    throw new Error('Failed to generate trade image');
  }
}

module.exports = {
  generateTradeImage
}; 