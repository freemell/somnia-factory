const { ethers } = require('ethers');
const crypto = require('crypto');
const { getWallet } = require('./database');

// Use a static encryption key for wallet encryption (in production, use a secure method)
const ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

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
    // Check if encryptedKey is valid
    if (!encryptedKey || typeof encryptedKey !== 'string') {
      throw new Error('Invalid encrypted key format');
    }

    const [ivHex, encrypted, authTagHex] = encryptedKey.split(':');
    
    // Validate the split parts
    if (!ivHex || !encrypted || !authTagHex) {
      throw new Error('Invalid encrypted key format - missing parts');
    }
    
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
    const walletData = await getWallet(userId);
    
    if (!walletData) {
      return null; // Return null instead of throwing error
    }

    // Check if private_key exists and is not undefined
    if (!walletData.private_key) {
      console.error(`[WALLET] No private key found for user ${userId}. Wallet data:`, walletData);
      return null;
    }

    const privateKey = await decryptPrivateKey(walletData.private_key);
    return new ethers.Wallet(privateKey);
  } catch (error) {
    console.error('Error getting user wallet:', error);
    return null; // Return null instead of throwing error
  }
}

module.exports = {
  createNewWallet,
  importWallet,
  getWalletForUser,
  decryptPrivateKey
}; 