const { ethers } = require('ethers');
const { getTokenPrice } = require('./priceFetcher');
const { getWalletBalance } = require('./walletManager');
const { walletManager } = require('./walletManager');

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

// Initialize provider
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

// Check if address is a contract
async function isContract(address) {
  try {
    const code = await provider.getCode(address);
    return code !== '0x';
  } catch (error) {
    console.error('Error checking if address is contract:', error);
    return false;
  }
}

/**
 * Gets token information for a contract address
 */
async function getTokenInfo(address) {
  try {
    if (!await isContract(address)) {
      throw new Error('Address is not a contract');
    }

    const contract = new ethers.Contract(
      address,
      [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
        'function totalSupply() view returns (uint256)'
      ],
      provider
    );

    const [name, symbol, decimals, totalSupply] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals(),
      contract.totalSupply()
    ]);

    return {
      name,
      symbol,
      decimals,
      totalSupply: ethers.formatUnits(totalSupply, decimals)
    };
  } catch (error) {
    console.error('Error getting token info:', error);
    throw error;
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

// Validate contract address
async function validateContractAddress(address) {
  try {
    if (!ethers.isAddress(address)) {
      throw new Error('Invalid address format');
    }

    const isContractAddress = await isContract(address);
    if (!isContractAddress) {
      throw new Error('Address is not a contract');
    }

    const tokenInfo = await getTokenInfo(address);
    return {
      isValid: true,
      ...tokenInfo
    };
  } catch (error) {
    console.error('Error validating contract address:', error);
    return {
      isValid: false,
      error: error.message
    };
  }
}

module.exports = {
  detectContractAddress,
  isContract,
  getTokenInfo,
  validateContractAddress
}; 