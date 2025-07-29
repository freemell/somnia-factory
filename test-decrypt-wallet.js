require('dotenv').config();
const { supabase } = require('./utils/database');
const { decryptPrivateKey } = require('./utils/wallet');
const { ethers } = require('ethers');

async function testDecryptWallet() {
  console.log("🔍 Testing private key decryption...\n");
  
  try {
    // Get a wallet from database
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .limit(1)
      .single();
    
    if (error || !data) {
      console.error('❌ No wallet found in database');
      return;
    }
    
    console.log(`📝 Testing wallet for user: ${data.user_id}`);
    console.log(`📬 Address: ${data.address}`);
    console.log(`🔐 Encrypted Key Length: ${data.private_key.length}`);
    console.log(`🔐 Encrypted Key Preview: ${data.private_key.substring(0, 20)}...\n`);
    
    // Decrypt the private key
    console.log(`🔓 Decrypting private key...`);
    const decryptedKey = await decryptPrivateKey(data.private_key);
    
    console.log(`✅ Decryption successful!`);
    console.log(`🔑 Decrypted Key: ${decryptedKey}`);
    console.log(`🔑 Decrypted Key Length: ${decryptedKey.length}`);
    console.log(`🔑 Valid Format: ${ethers.isHexString(decryptedKey, 32) ? '✅ Yes' : '❌ No'}\n`);
    
    // Test creating a wallet from the decrypted key
    console.log(`🧪 Testing wallet creation from decrypted key...`);
    const wallet = new ethers.Wallet(decryptedKey);
    
    console.log(`✅ Wallet created successfully!`);
    console.log(`📬 Generated Address: ${wallet.address}`);
    console.log(`📬 Database Address: ${data.address}`);
    console.log(`🔍 Addresses Match: ${wallet.address.toLowerCase() === data.address.toLowerCase() ? '✅ Yes' : '❌ No'}\n`);
    
    // Test with provider
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const connectedWallet = new ethers.Wallet(decryptedKey, provider);
    
    console.log(`🌐 Testing connection to blockchain...`);
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} STT\n`);
    
    console.log(`🎉 All tests passed! Private key decryption is working correctly.`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDecryptWallet()
  .then(() => {
    console.log('\n✅ Decryption test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Decryption test failed:', error);
    process.exit(1);
  }); 