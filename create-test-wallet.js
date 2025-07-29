require('dotenv').config();
const { ethers } = require('ethers');
const { supabase } = require('./utils/database');

async function createTestWallet() {
  console.log("🔧 Creating test wallet for INSOMN integration...\n");
  
  try {
    // Generate a new wallet
    const wallet = ethers.Wallet.createRandom();
    
    console.log(`📝 Generated new wallet:`);
    console.log(`  Address: ${wallet.address}`);
    console.log(`  Private Key: ${wallet.privateKey}`);
    console.log(`  Private Key Length: ${wallet.privateKey.length}`);
    console.log('');
    
    // Test the wallet with a provider
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const connectedWallet = new ethers.Wallet(wallet.privateKey, provider);
    
    console.log(`🔍 Testing wallet connection:`);
    console.log(`  Connected Address: ${connectedWallet.address}`);
    console.log(`  Provider: ${provider.connection.url}`);
    
    // Get balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`  Balance: ${ethers.formatEther(balance)} STT`);
    console.log('');
    
    // Store in database for testing
    const testUserId = 999999999; // Test user ID
    
    const { error } = await supabase
      .from('wallets')
      .upsert({
        user_id: testUserId,
        address: wallet.address,
        private_key: wallet.privateKey, // Store as plain text for testing
        created_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    console.log(`✅ Test wallet stored in database for user ${testUserId}`);
    console.log(`📝 You can use this wallet for testing INSOMN integration`);
    console.log(`🔑 Private Key: ${wallet.privateKey}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTestWallet()
  .then(() => {
    console.log('\n✅ Test wallet creation completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test wallet creation failed:', error);
    process.exit(1);
  }); 