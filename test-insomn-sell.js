require('dotenv').config();
const { ethers } = require('ethers');
const { getUserWallet } = require('./utils/walletManager');
const { decryptPrivateKey } = require('./utils/wallet');
const { executeTokenTransfer, getInsomnTokenAddress } = require('./utils/insomnIntegration');

async function testInsomnSell() {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    
    // Test with a specific user ID
    const userId = 6667190190;
    
    console.log('🔍 Testing INSOMN sell...');
    
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
    
    // Check INSOMN balance
    const insomnAddress = getInsomnTokenAddress('INSOMN');
    const insomnContract = new ethers.Contract(insomnAddress, [
      "function balanceOf(address account) external view returns (uint256)",
      "function transfer(address to, uint256 amount) external returns (bool)"
    ], provider);
    
    const insomnBalance = await insomnContract.balanceOf(userWallet.address);
    console.log(`💰 INSOMN Balance: ${ethers.formatEther(insomnBalance)} INSOMN`);
    
    if (parseFloat(ethers.formatEther(insomnBalance)) < 10) {
      console.log('❌ Insufficient INSOMN balance for test');
      return;
    }
    
    // Try to sell some INSOMN
    console.log('🔄 Attempting to sell 10 INSOMN for STT...');
    
    const result = await executeTokenTransfer('10', 'INSOMN', 'STT', userWallet, provider);
    
    if (result.success) {
      console.log('✅ INSOMN sell successful!');
      console.log(`📝 Transaction: ${result.txHash}`);
      console.log(`💰 Amount in: ${ethers.formatEther(result.amountIn)} INSOMN`);
      console.log(`🎯 Amount out: ${ethers.formatEther(result.amountOut)} STT`);
      console.log(`📝 Message: ${result.message}`);
    } else {
      console.log('❌ INSOMN sell failed:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testInsomnSell(); 