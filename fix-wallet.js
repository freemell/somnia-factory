require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');
const crypto = require('crypto');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Use the same encryption key as in wallet.js
const ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

/**
 * Encrypts a private key using AES-256-GCM
 */
async function encryptPrivateKey(privateKey) {
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV, encrypted data, and auth tag
    return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
  } catch (error) {
    console.error('Error encrypting private key:', error);
    throw new Error('Failed to encrypt private key');
  }
}

async function fixWallet(userId) {
  try {
    console.log(`🔧 Fixing wallet for user ${userId}...`);
    
    // Get current wallet data
    const { data: currentWallet, error: getError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (getError) {
      console.error('❌ Error getting current wallet:', getError);
      return;
    }
    
    if (!currentWallet) {
      console.log('❌ No wallet found for user');
      return;
    }
    
    console.log('📋 Current wallet data:', {
      address: currentWallet.address,
      hasPrivateKey: !!currentWallet.private_key,
      privateKeyLength: currentWallet.private_key ? currentWallet.private_key.length : 0
    });
    
    // Create a new wallet
    const newWallet = ethers.Wallet.createRandom();
    const encryptedKey = await encryptPrivateKey(newWallet.privateKey);
    
    console.log('🆕 New wallet created:', {
      address: newWallet.address,
      encryptedKeyLength: encryptedKey.length
    });
    
    // Update the wallet in database
    const { data: updatedWallet, error: updateError } = await supabase
      .from('wallets')
      .update({
        address: newWallet.address,
        private_key: encryptedKey
      })
      .eq('user_id', userId)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error updating wallet:', updateError);
      return;
    }
    
    console.log('✅ Wallet fixed successfully!');
    console.log('📋 Updated wallet data:', {
      address: updatedWallet.address,
      hasPrivateKey: !!updatedWallet.private_key,
      privateKeyLength: updatedWallet.private_key.length
    });
    
  } catch (error) {
    console.error('💥 Error fixing wallet:', error);
  }
}

// Fix the specific user's wallet
const userId = 6667190190; // The user ID from the error logs
fixWallet(userId); 