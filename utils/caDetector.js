const { ethers } = require('ethers');
const { getTokenPrice } = require('./priceFetcher');
const { getWalletBalance } = require('./walletManager');

/**
 * Detects and validates contract addresses in messages
 */
function detectContractAddress(message) {
  // Match Ethereum address pattern
  const addressPattern = /0x[a-fA-F0-9]{40}/g;
  const matches = message.match(addressPattern);
  
  if (!matches) return null;
  
  // Return the first valid address
  for (const address of matches) {
    if (ethers.isAddress(address)) {
      return address;
    }
  }
  
  return null;
}

/**
 * Gets token information for a contract address
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
        'function decimals() view returns (uint8)',
        'function totalSupply() view returns (uint256)'
      ],
      provider
    );
    
    // Get token data
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals(),
      tokenContract.totalSupply()
    ]);
    
    // Get price data
    const price = await getTokenPrice(address);
    
    // Calculate market cap
    const marketCap = (Number(totalSupply) * price) / (10 ** decimals);
    
    // Get price changes
    const changes = await getPriceChanges(address);
    
    // Get price impact for 5 SOM
    const priceImpact = await getPriceImpact(address, ethers.parseUnits('5', 18));
    
    // Get wallet balance
    const walletBalance = await getWalletBalance(address);
    
    return {
      address,
      name,
      symbol,
      decimals,
      price,
      marketCap,
      change5m: changes.change5m,
      change1h: changes.change1h,
      change24h: changes.change24h,
      priceImpact,
      walletBalance
    };
  } catch (error) {
    console.error('Error getting token info:', error);
    return null;
  }
}

/**
 * Gets price changes for a token
 */
async function getPriceChanges(address) {
  try {
    // Get historical prices
    const now = Math.floor(Date.now() / 1000);
    const fiveMinutesAgo = now - 300;
    const oneHourAgo = now - 3600;
    const oneDayAgo = now - 86400;
    
    const [currentPrice, price5m, price1h, price24h] = await Promise.all([
      getTokenPrice(address),
      getTokenPrice(address, fiveMinutesAgo),
      getTokenPrice(address, oneHourAgo),
      getTokenPrice(address, oneDayAgo)
    ]);
    
    return {
      change5m: ((currentPrice - price5m) / price5m) * 100,
      change1h: ((currentPrice - price1h) / price1h) * 100,
      change24h: ((currentPrice - price24h) / price24h) * 100
    };
  } catch (error) {
    console.error('Error getting price changes:', error);
    return {
      change5m: 0,
      change1h: 0,
      change24h: 0
    };
  }
}

/**
 * Gets price impact for a trade
 */
async function getPriceImpact(tokenAddress, amountIn) {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const router = new ethers.Contract(
      process.env.DEX_ROUTER,
      require(process.env.DEX_ABI_PATH),
      provider
    );
    
    // Get amounts out
    const amountsOut = await router.getAmountsOut(
      amountIn,
      [process.env.SOM_TOKEN_ADDRESS, tokenAddress]
    );
    
    // Calculate price impact
    const amountOut = amountsOut[1];
    const expectedOut = (amountIn * amountOut) / amountIn;
    const priceImpact = ((expectedOut - amountOut) / expectedOut) * 100;
    
    return priceImpact;
  } catch (error) {
    console.error('Error getting price impact:', error);
    return 0;
  }
}

module.exports = {
  detectContractAddress,
  getTokenInfo
}; 