require('dotenv').config();
const { ethers } = require('ethers');
const { getUserWallet } = require('./utils/walletManager');
const { decryptPrivateKey } = require('./utils/wallet');
const { executeTokenTransfer } = require('./utils/insomnIntegration');

async function testTokenTransfer() {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    
    // Test with a specific user ID
    const userId = 6667190190;
    
    console.log('🔍 Testing token transfer...');
    
    // Get user wallet
    const wallet = await getUserWallet(userId);
    if (!wallet) {
      console.log('❌ No wallet found for user');
      return;
    }
    
    console.log(`👤 User wallet: ${wallet.address}`);
    
    // Decrypt private key
    const decryptedPrivateKey = await decryptPrivateKey(wallet.private_key);
    const userWallet = new ethers.Wallet(decryptedPrivateKey, provider);
    
    // Check STT balance
    const sttBalance = await provider.getBalance(userWallet.address);
    console.log(`💰 STT Balance: ${ethers.formatEther(sttBalance)} STT`);
    
    if (parseFloat(ethers.formatEther(sttBalance)) < 0.1) {
      console.log('❌ Insufficient STT balance for test');
      return;
    }
    
    // Try to execute a small token transfer
    console.log('🔄 Attempting token transfer: 0.1 STT for INSOMN...');
    
    const result = await executeTokenTransfer('0.1', 'STT', 'INSOMN', userWallet, provider);
    
    if (result.success) {
      console.log('✅ Token transfer successful!');
      console.log(`📝 Transaction: ${result.txHash}`);
      console.log(`💰 Amount in: ${ethers.formatEther(result.amountIn)} STT`);
      console.log(`🎯 Amount out: ${ethers.formatEther(result.amountOut)} INSOMN`);
      console.log(`📝 Message: ${result.message}`);
    } else {
      console.log('❌ Token transfer failed:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testTokenTransfer(); 