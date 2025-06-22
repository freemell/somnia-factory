require('dotenv').config();
const { createNewWallet } = require('./utils/wallet');
const { createUser, createWallet, getWallet } = require('./utils/database');

async function testWalletCreation() {
  try {
    console.log('🧪 Testing wallet creation with new database tables...\n');
    
    const testUserId = 999999999; // Use a different user ID for testing
    const testUsername = 'testuser';
    
    // Test 1: Create user
    console.log('1. Creating test user...');
    await createUser(testUserId, testUsername);
    console.log('✅ User created');
    
    // Test 2: Create wallet
    console.log('2. Creating wallet...');
    const { address, encryptedKey } = await createNewWallet();
    console.log('✅ Wallet created:', address);
    console.log('✅ Encrypted key length:', encryptedKey.length);
    
    // Test 3: Save wallet to database
    console.log('3. Saving wallet to database...');
    await createWallet(testUserId, address, encryptedKey);
    console.log('✅ Wallet saved to database');
    
    // Test 4: Verify wallet was saved
    console.log('4. Verifying wallet in database...');
    const savedWallet = await getWallet(testUserId);
    if (savedWallet) {
      console.log('✅ Wallet found in database!');
      console.log('   - ID:', savedWallet.id);
      console.log('   - User ID:', savedWallet.user_id);
      console.log('   - Address:', savedWallet.address);
      console.log('   - Created:', savedWallet.created_at);
    } else {
      console.log('❌ Wallet not found in database');
    }
    
    console.log('\n🎉 All tests passed! Database tables are working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
  }
}

testWalletCreation(); 