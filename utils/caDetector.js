const { ethers } = require('ethers');
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

module.exports = {
  detectContractAddress,
  getTokenInfo
}; 