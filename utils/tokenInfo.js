const { ethers } = require('ethers');

const cache = {};

// STT is the native token on Somnia testnet, so we don't need a contract address
// We'll use the native balance instead

const erc20Abi = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)"
];

async function getTokenMetadata(tokenAddress, provider) {
  try {
    const token = new ethers.Contract(tokenAddress, erc20Abi, provider);
    const [name, symbol, decimals] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals()
    ]);

    return { name, symbol, decimals };
  } catch (error) {
    console.error("Failed to fetch token metadata:", error);
    throw new Error('Invalid or undeployed token on Somnia Testnet');
  }
}

async function getTokenMetadataCached(tokenAddress, provider) {
  if (cache[tokenAddress]) return cache[tokenAddress];

  const data = await getTokenMetadata(tokenAddress, provider);
  cache[tokenAddress] = data;
  return data;
}

async function getTokenBalance(tokenAddress, userAddress, provider) {
  try {
    const token = new ethers.Contract(tokenAddress, erc20Abi, provider);
    const balance = await token.balanceOf(userAddress);
    return balance;
  } catch (error) {
    console.error("Failed to fetch token balance:", error);
    return ethers.parseUnits('0', 18);
  }
}

async function getSTTBalance(userAddress, provider) {
  try {
    // STT is the native token, so we get the native balance
    const balance = await provider.getBalance(userAddress);
    return balance;
  } catch (error) {
    console.error("Failed to fetch STT balance:", error);
    return ethers.parseUnits('0', 18);
  }
}

module.exports = {
  getTokenMetadata,
  getTokenMetadataCached,
  getTokenBalance,
  getSTTBalance,
  STT_ADDRESS: null // STT is native token, no contract address needed
}; 