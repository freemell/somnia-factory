const { Contract } = require('ethers');

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
  if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
    console.error('Invalid address format:', tokenAddress);
    return { address: tokenAddress, valid: false, error: '❌ Invalid token address or not deployed on Somnia Testnet' };
  }
  try {
    const contract = new Contract(
      tokenAddress,
      ['function name() view returns (string)', 'function symbol() view returns (string)', 'function decimals() view returns (uint8)'],
      provider
    );
    const [name, symbol, decimals] = await Promise.all([
      contract.name().catch(() => 'Unknown'),
      contract.symbol().catch(() => 'Unknown'),
      contract.decimals().catch(() => 18)
    ]);
    if (name === 'Unknown' && symbol === 'Unknown') {
      throw new Error('Invalid contract');
    }
    return { address: tokenAddress, name, symbol, decimals, valid: true };
  } catch (error) {
    console.error('getTokenMetadata failed:', { tokenAddress, error: error.message });
    return { address: tokenAddress, valid: false, error: '❌ Invalid token address or not deployed on Somnia Testnet' };
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
    const token = new Contract(tokenAddress, erc20Abi, provider);
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