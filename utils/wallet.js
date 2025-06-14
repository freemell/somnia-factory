const { ethers } = require('ethers');
const crypto = require('crypto');

// Encryption key for wallet encryption (in production, this should be stored securely)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

/**
 * Creates a new wallet and returns its address and encrypted private key
 */
async function createNewWallet() {
  try {
    const wallet = ethers.Wallet.createRandom();
    const encryptedKey = await encryptPrivateKey(wallet.privateKey);
    
    return {
      address: wallet.address,
      encryptedKey
    };
  } catch (error) {
    console.error('Error creating wallet:', error);
    throw new Error('Failed to create wallet');
  }
}

/**
 * Imports a wallet from a private key
 */
async function importWallet(privateKey) {
  try {
    // Validate private key
    if (!ethers.isHexString(privateKey, 32)) {
      throw new Error('Invalid private key format');
    }

    const wallet = new ethers.Wallet(privateKey);
    const encryptedKey = await encryptPrivateKey(privateKey);
    
    return {
      address: wallet.address,
      encryptedKey
    };
  } catch (error) {
    console.error('Error importing wallet:', error);
    throw new Error('Failed to import wallet');
  }
}

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

/**
 * Decrypts an encrypted private key
 */
async function decryptPrivateKey(encryptedKey) {
  try {
    const [ivHex, encrypted, authTagHex] = encryptedKey.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Error decrypting private key:', error);
    throw new Error('Failed to decrypt private key');
  }
}

/**
 * Gets a wallet instance for a user
 */
async function getWalletForUser(userId) {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('encryptedKey')
      .eq('id', userId)
      .single();

    if (!user) {
      throw new Error('User wallet not found');
    }

    const privateKey = await decryptPrivateKey(user.encryptedKey);
    return new ethers.Wallet(privateKey);
  } catch (error) {
    console.error('Error getting user wallet:', error);
    throw new Error('Failed to get user wallet');
  }
}

module.exports = {
  createNewWallet,
  importWallet,
  getWalletForUser
}; 