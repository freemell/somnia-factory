require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function checkUserWallets(userId) {
  try {
    console.log(`🔍 Checking all wallets for user ${userId}...`);
    
    // Get all wallets for the user
    const { data: wallets, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching wallets:', error);
      return;
    }
    
    console.log(`📋 Found ${wallets.length} wallet(s) for user ${userId}:`);
    
    wallets.forEach((wallet, index) => {
      console.log(`\n${index + 1}. Wallet Record:`);
      console.log(`   Address: ${wallet.address}`);
      console.log(`   Has Private Key: ${!!wallet.private_key}`);
      console.log(`   Private Key Length: ${wallet.private_key ? wallet.private_key.length : 0}`);
      console.log(`   Created At: ${wallet.created_at}`);
      console.log(`   ID: ${wallet.id}`);
    });
    
    // If there are multiple wallets, keep only the latest one with valid private key
    if (wallets.length > 1) {
      console.log('\n⚠️ Multiple wallets found! Cleaning up...');
      
      // Find the wallet with valid private key
      const validWallet = wallets.find(w => w.private_key && w.private_key.length > 100);
      
      if (validWallet) {
        console.log(`✅ Keeping wallet: ${validWallet.address}`);
        
        // Delete all other wallets
        for (const wallet of wallets) {
          if (wallet.id !== validWallet.id) {
            console.log(`🗑️ Deleting wallet: ${wallet.address}`);
            const { error: deleteError } = await supabase
              .from('wallets')
              .delete()
              .eq('id', wallet.id);
            
            if (deleteError) {
              console.error(`❌ Error deleting wallet ${wallet.id}:`, deleteError);
            } else {
              console.log(`✅ Deleted wallet: ${wallet.address}`);
            }
          }
        }
      } else {
        console.log('❌ No valid wallet found with proper private key');
      }
    } else if (wallets.length === 1) {
      const wallet = wallets[0];
      if (!wallet.private_key || wallet.private_key.length < 100) {
        console.log('❌ Single wallet found but has invalid private key');
      } else {
        console.log('✅ Single valid wallet found');
      }
    } else {
      console.log('❌ No wallets found for user');
    }
    
  } catch (error) {
    console.error('💥 Error checking wallets:', error);
  }
}

// Check the specific user's wallets
const userId = 6667190190;
checkUserWallets(userId); 