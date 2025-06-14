const axios = require('axios');

const PRICE_API_KEY = process.env.PRICE_API_KEY;
const PRICE_API_URL = 'https://api.coingecko.com/api/v3';

/**
 * Gets the current price of a token in USDT
 */
async function getTokenPrice(tokenSymbol) {
  try {
    const response = await axios.get(`${PRICE_API_URL}/simple/price`, {
      params: {
        ids: tokenSymbol.toLowerCase(),
        vs_currencies: 'usdt',
        x_cg_api_key: PRICE_API_KEY
      }
    });

    if (!response.data[tokenSymbol.toLowerCase()]) {
      throw new Error('Token not found');
    }

    return response.data[tokenSymbol.toLowerCase()].usdt;
  } catch (error) {
    console.error('Error fetching token price:', error);
    throw new Error('Failed to fetch token price');
  }
}

/**
 * Checks if a token's price has reached a target price
 */
async function isPriceAtTarget(tokenSymbol, targetPrice, isAbove = true) {
  try {
    const currentPrice = await getTokenPrice(tokenSymbol);
    
    if (isAbove) {
      return currentPrice >= targetPrice;
    } else {
      return currentPrice <= targetPrice;
    }
  } catch (error) {
    console.error('Error checking price target:', error);
    throw new Error('Failed to check price target');
  }
}

/**
 * Gets historical price data for a token
 */
async function getHistoricalPrice(tokenSymbol, days = 7) {
  try {
    const response = await axios.get(`${PRICE_API_URL}/coins/${tokenSymbol.toLowerCase()}/market_chart`, {
      params: {
        vs_currency: 'usdt',
        days: days,
        x_cg_api_key: PRICE_API_KEY
      }
    });

    return response.data.prices.map(([timestamp, price]) => ({
      timestamp,
      price
    }));
  } catch (error) {
    console.error('Error fetching historical price:', error);
    throw new Error('Failed to fetch historical price data');
  }
}

module.exports = {
  getTokenPrice,
  isPriceAtTarget,
  getHistoricalPrice
}; 