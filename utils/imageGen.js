const Jimp = require('jimp');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

/**
 * Generates a trade result image
 */
async function generateTradeImage(tradeData) {
  try {
    // Create a new image
    const image = new Jimp(800, 400, '#1a1a1a');
    
    // Load fonts
    const fontTitle = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
    const fontRegular = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
    const fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_14_BLACK);
    
    // Add border
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      if (x < 2 || x > image.bitmap.width - 3 || y < 2 || y > image.bitmap.height - 3) {
        this.bitmap.data[idx + 0] = 51;  // R
        this.bitmap.data[idx + 1] = 51;  // G
        this.bitmap.data[idx + 2] = 51;  // B
      }
    });
    
    // Add title
    image.print(
      fontTitle,
      0, 20,
      {
        text: 'Trade Successful!',
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
      },
      800
    );
    
    // Get token info
    const tokenIn = await getTokenInfo(tradeData.tokenIn);
    const tokenOut = await getTokenInfo(tradeData.tokenOut);
    
    // Add trade details
    const details = [
      `Amount: ${ethers.formatUnits(tradeData.amount, 18)} ${tokenIn.symbol}`,
      `Price: $${tradeData.price}`,
      `Value: $${(Number(tradeData.amount) * tradeData.price).toFixed(2)}`,
      `Transaction: ${tradeData.txHash}`
    ];
    
    details.forEach((detail, index) => {
      image.print(
        fontRegular,
        50,
        100 + (index * 30),
        detail
      );
    });
    
    // Add token logos if available
    try {
      const [logoIn, logoOut] = await Promise.all([
        Jimp.read(tokenIn.logo || 'assets/default-token.png'),
        Jimp.read(tokenOut.logo || 'assets/default-token.png')
      ]);
      
      logoIn.resize(40, 40);
      logoOut.resize(40, 40);
      
      image.composite(logoIn, 50, 280);
      image.composite(logoOut, 100, 280);
      
      // Add arrow
      image.print(
        fontRegular,
        90,
        290,
        '→'
      );
    } catch (error) {
      console.error('Error loading token logos:', error);
    }
    
    // Add timestamp
    image.print(
      fontSmall,
      0,
      image.bitmap.height - 30,
      {
        text: new Date().toLocaleString(),
        alignmentX: Jimp.HORIZONTAL_ALIGN_RIGHT
      },
      750
    );
    
    // Ensure directory exists
    const dir = path.join(__dirname, '../assets/trades');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Save image
    const imagePath = path.join(dir, `${tradeData.txHash}.png`);
    await image.writeAsync(imagePath);
    
    return imagePath;
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