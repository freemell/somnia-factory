const { createCanvas, loadImage } = require('canvas');
const { ethers } = require('ethers');

/**
 * Generates a trade result image
 */
async function generateTradeImage(tradeData) {
  try {
    // Create canvas
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');
    
    // Set background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add border
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    
    // Add title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Trade Successful!', canvas.width / 2, 60);
    
    // Add trade details
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    
    // Token info
    const tokenIn = await getTokenInfo(tradeData.tokenIn);
    const tokenOut = await getTokenInfo(tradeData.tokenOut);
    
    // Amount
    ctx.fillText(`Amount: ${ethers.formatUnits(tradeData.amount, 18)} ${tokenIn.symbol}`, 50, 120);
    
    // Price
    ctx.fillText(`Price: $${tradeData.price}`, 50, 160);
    
    // Value
    const value = Number(tradeData.amount) * tradeData.price;
    ctx.fillText(`Value: $${value.toFixed(2)}`, 50, 200);
    
    // Transaction hash
    ctx.font = '18px Arial';
    ctx.fillText(`Transaction: ${tradeData.txHash}`, 50, 250);
    
    // Add token logos
    const [logoIn, logoOut] = await Promise.all([
      loadImage(tokenIn.logo || 'assets/default-token.png'),
      loadImage(tokenOut.logo || 'assets/default-token.png')
    ]);
    
    // Draw logos
    ctx.drawImage(logoIn, 50, 280, 40, 40);
    ctx.drawImage(logoOut, 100, 280, 40, 40);
    
    // Add arrow between logos
    ctx.beginPath();
    ctx.moveTo(100, 300);
    ctx.lineTo(120, 300);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Add timestamp
    ctx.font = '16px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(new Date().toLocaleString(), canvas.width - 50, canvas.height - 30);
    
    // Save image
    const imagePath = `assets/trades/${tradeData.txHash}.png`;
    const fs = require('fs');
    const out = fs.createWriteStream(imagePath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    
    return new Promise((resolve, reject) => {
      out.on('finish', () => resolve(imagePath));
      out.on('error', reject);
    });
  } catch (error) {
    console.error('Error generating trade image:', error);
    return null;
  }
}

/**
 * Gets token information
 */
async function getTokenInfo(address) {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    
    // Get token contract
    const tokenContract = new ethers.Contract(
      address,
      [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)'
      ],
      provider
    );
    
    // Get token data
    const [name, symbol, decimals] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals()
    ]);
    
    return {
      address,
      name,
      symbol,
      decimals,
      logo: `assets/tokens/${address.toLowerCase()}.png`
    };
  } catch (error) {
    console.error('Error getting token info:', error);
    return null;
  }
}

module.exports = {
  generateTradeImage
}; 