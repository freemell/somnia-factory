require('dotenv').config();
const { supabase } = require('./utils/database');

async function debugWallet() {
  console.log("🔍 Debugging wallet data...\n");
  
  try {
    // Get all wallets from database
    const { data, error } = await supabase
      .from('wallets')
      .select('*');
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    console.log(`📊 Found ${data.length} wallets in database:\n`);
    
    data.forEach((wallet, index) => {
      console.log(`Wallet ${index + 1}:`);
      console.log(`  User ID: ${wallet.user_id}`);
      console.log(`  Address: ${wallet.address}`);
      console.log(`  Private Key Length: ${wallet.private_key ? wallet.private_key.length : 'null'}`);
      console.log(`  Private Key Preview: ${wallet.private_key ? wallet.private_key.substring(0, 20) + '...' : 'null'}`);
      console.log(`  Created: ${wallet.created_at}`);
      console.log('');
    });
    
    // Check if any private keys are corrupted
    const corruptedWallets = data.filter(wallet => 
      wallet.private_key && (
        wallet.private_key.includes(':') || 
        wallet.private_key.length !== 66 || 
        !wallet.private_key.startsWith('0x')
      )
    );
    
    if (corruptedWallets.length > 0) {
      console.log(`⚠️ Found ${corruptedWallets.length} corrupted wallet(s):`);
      corruptedWallets.forEach((wallet, index) => {
        console.log(`  ${index + 1}. User ${wallet.user_id}: ${wallet.private_key}`);
      });
    } else {
      console.log('✅ All private keys appear to be valid');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugWallet()
  .then(() => {
    console.log('\n✅ Debug completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Debug failed:', error);
    process.exit(1);
  }); 