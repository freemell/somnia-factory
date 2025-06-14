const { ethers } = require('ethers');
const { supabase } = require('./database');

// Initialize provider
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

// Generate a new wallet
async function generateWallet(userId) {
  try {
    const wallet = ethers.Wallet.createRandom();
    
    // Store wallet info in database
    const { error } = await supabase
      .from('wallets')
      .insert({
        user_id: userId,
        address: wallet.address,
        private_key: wallet.privateKey,
        created_at: new Date().toISOString()
      });

    if (error) throw error;

    return {
      address: wallet.address,
      privateKey: wallet.privateKey
    };
  } catch (error) {
    console.error('Error generating wallet:', error);
    throw error;
  }
}

// Get user's wallet
async function getUserWallet(userId) {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting user wallet:', error);
    throw error;
  }
}

// Get wallet balance
async function getWalletBalance(address) {
  try {
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    throw error;
  }
}

// Get token balance
async function getTokenBalance(tokenAddress, walletAddress) {
  try {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function balanceOf(address) view returns (uint256)'],
      provider
    );

    const balance = await tokenContract.balanceOf(walletAddress);
    return ethers.formatUnits(balance, 18); // Assuming 18 decimals
  } catch (error) {
    console.error('Error getting token balance:', error);
    throw error;
  }
}

// Send transaction
async function sendTransaction(fromPrivateKey, toAddress, amount) {
  try {
    const wallet = new ethers.Wallet(fromPrivateKey, provider);
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: ethers.parseEther(amount.toString())
    });
    return tx;
  } catch (error) {
    console.error('Error sending transaction:', error);
    throw error;
  }
}

module.exports = {
  generateWallet,
  getUserWallet,
  getWalletBalance,
  getTokenBalance,
  sendTransaction
}; 