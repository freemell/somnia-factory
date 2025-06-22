require('dotenv').config();
const { getUser, getWallet } = require('./utils/database');

async function checkDatabase() {
  try {
    console.log('🔍 Checking database contents...\n');
    
    // Test user ID (the one from the terminal)
    const testUserId = 6667190190; // This was the user ID from the terminal logs
    
    console.log(`Checking for user ID: ${testUserId}`);
    
    // Check if user exists
    const user = await getUser(testUserId);
    console.log('User record:', user ? '✅ Found' : '❌ Not found');
    if (user) {
      console.log('User details:', JSON.stringify(user, null, 2));
    }
    
    // Check if wallet exists
    const wallet = await getWallet(testUserId);
    console.log('Wallet record:', wallet ? '✅ Found' : '❌ Not found');
    if (wallet) {
      console.log('Wallet details:', {
        id: wallet.id,
        user_id: wallet.user_id,
        address: wallet.address,
        created_at: wallet.created_at
      });
    }
    
    // Also check with a different user ID to see if there are any wallets at all
    console.log('\n🔍 Checking all users and wallets...');
    
    // This would require a different approach since we don't have a list function
    // But we can test with the user ID we know
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

checkDatabase(); 