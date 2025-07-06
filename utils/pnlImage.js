const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

// Try to register Orbitron font if available
const fontPath = path.resolve(__dirname, '../fonts/Orbitron-Bold.ttf');
if (fs.existsSync(fontPath)) {
  try {
    registerFont(fontPath, { family: 'Orbitron' });
  } catch (e) {
    // Font registration failed, fallback to system font
  }
}

/**
 * Generate a stylish PnL image with dynamic overlay.
 * @param {string} pnlPercent - e.g. '+12.34%'
 * @param {string} tradePair - e.g. 'STT/WETH'
 * @param {string} duration - e.g. '2m 13s'
 * @param {string} userHandle - e.g. 'millathzqhl'
 * @returns {Promise<string>} - Path to generated image
 */
async function generatePnlImage(pnlPercent, tradePair, duration, userHandle) {
  const baseImgPath = path.resolve(__dirname, '../pnl/Pnl 1.png');
  let image;
  try {
    image = await loadImage(baseImgPath);
  } catch (e) {
    throw new Error('Base PnL image not found.');
  }
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, image.width, image.height);

  // Font family fallback
  const fontFamily = fs.existsSync(fontPath) ? 'Orbitron' : 'sans-serif';

  // PnL %
  ctx.font = `bold 80px ${fontFamily}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = pnlPercent.startsWith('+') ? '#00FF66' : '#FF4C4C';
  ctx.shadowBlur = 16;
  ctx.fillStyle = pnlPercent.startsWith('+') ? '#00FF66' : '#FF4C4C';
  ctx.fillText(pnlPercent, image.width * 0.60, image.height * 0.40);
  ctx.shadowBlur = 0;

  // Trade Pair
  ctx.font = `36px ${fontFamily}`;
  ctx.fillStyle = '#CCCCCC';
  ctx.fillText(tradePair, image.width * 0.60, image.height * 0.52);

  // Duration
  ctx.font = `28px ${fontFamily}`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`🕒 ${duration}`, image.width * 0.60, image.height * 0.60);

  // Promo/User
  ctx.font = `24px ${fontFamily}`;
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText(`Save 10% on fees`, image.width * 0.60, image.height * 0.72);
  ctx.fillText(userHandle, image.width * 0.60, image.height * 0.78);

  // Output
  const tmpDir = path.resolve(__dirname, '../tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
  const outputPath = path.join(tmpDir, `pnl_result_${userHandle}.png`);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

module.exports = { generatePnlImage }; 