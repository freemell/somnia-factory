const { ethers } = require('ethers');
const crypto = require('crypto');
const { decryptPrivateKey: walletDecryptPrivateKey } = require('./wallet');

// Use a static encryption key for wallet encryption (in production, use a secure method)
const ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

// Decrypt private key function - use the one from wallet.js
async function decryptPrivateKey(encryptedKey) {
  return await walletDecryptPrivateKey(encryptedKey);
}

// Standard ERC20 ABI for token interactions
const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [{"name": "", "type": "string"}],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{"name": "", "type": "string"}],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{"name": "_owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "balance", "type": "uint256"}],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"name": "", "type": "uint256"}],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [{"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}],
    "name": "transfer",
    "outputs": [{"name": "", "type": "bool"}],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [{"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}],
    "name": "mint",
    "outputs": [{"name": "", "type": "bool"}],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

class TestnetSwap {
  constructor(provider, wallet) {
    this.provider = provider;
    this.wallet = null;
    this.walletPromise = this.initializeWallet(provider, wallet);
    
    // Testnet exchange rates (simulated)
    this.exchangeRates = {
      'WSTT': 1.0,   // Base rate
      'PING': 0.5,   // 1 STT = 0.5 PING
      'INSOM': 2.0,  // 1 STT = 2.0 INSOM
      'TEST': 1.5    // 1 STT = 1.5 TEST
    };
    
    // Known token addresses
    this.knownTokens = {
      '0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7': { symbol: 'WSTT', name: 'Wrapped STT', isTestnet: true },
      '0x33E7fAB0a8a5da1A923180989bD617c9c2D1C493': { symbol: 'PING', name: 'PING', isTestnet: true },
      '0x0C726E446865FFb19Cc13f21aBf0F515106C9662': { symbol: 'INSOM', name: 'Insomiacs', isTestnet: true },
      '0xab477d0094b975173f12F5Cc7fffF4EE8BA22283': { symbol: 'TEST', name: 'Test Token', isTestnet: true }
    };
  }

  async initializeWallet(provider, wallet) {
    try {
      // Ensure wallet is a proper ethers.js wallet instance
      if (wallet && wallet.private_key) {
        // If wallet is a database object with encrypted private_key, decrypt and create ethers wallet
        try {
          const decryptedPrivateKey = await decryptPrivateKey(wallet.private_key);
          this.wallet = new ethers.Wallet(decryptedPrivateKey, provider);
          console.log(`🔍 [DEBUG] TestnetSwap - Wallet created from decrypted private key`);
        } catch (decryptError) {
          console.error(`❌ [DEBUG] TestnetSwap - Failed to decrypt private key:`, decryptError.message);
          this.wallet = null;
        }
      } else if (wallet && typeof wallet.sendTransaction === 'function') {
        // If wallet is already an ethers wallet instance
        this.wallet = wallet;
        console.log(`🔍 [DEBUG] TestnetSwap - Using existing ethers wallet`);
      } else {
        // No wallet provided
        this.wallet = null;
        console.log(`🔍 [DEBUG] TestnetSwap - No wallet available`);
      }
    } catch (error) {
      console.error(`❌ [DEBUG] TestnetSwap - Error initializing wallet:`, error.message);
      this.wallet = null;
    }
  }

  async getTokenInfo(tokenAddress) {
    try {
      // Check if we know this token
      if (this.knownTokens[tokenAddress]) {
        const known = this.knownTokens[tokenAddress];
        return {
          name: known.name,
          symbol: known.symbol,
          decimals: 18,
          address: tokenAddress,
          isTestnet: known.isTestnet
        };
      }
      
      // Try to get info from contract using provider (read-only)
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      const name = await token.name();
      const symbol = await token.symbol();
      const decimals = await token.decimals();
      
      return {
        name,
        symbol,
        decimals,
        address: tokenAddress,
        isTestnet: true // Assume testnet for unknown tokens
      };
    } catch (error) {
      console.log(`❌ Error getting token info for ${tokenAddress}:`, error.message);
      return null;
    }
  }

  async getWalletBalance(tokenAddress) {
    try {
      // Wait for wallet to be initialized
      await this.walletPromise;
      
      console.log(`🔍 [DEBUG] testnetSwap.getWalletBalance - Starting...`);
      console.log(`🔍 [DEBUG] testnetSwap.getWalletBalance - Token address: ${tokenAddress}`);
      console.log(`🔍 [DEBUG] testnetSwap.getWalletBalance - Provider available: ${!!this.provider}`);
      console.log(`🔍 [DEBUG] testnetSwap.getWalletBalance - Wallet available: ${!!this.wallet}`);
      
      // Check if this is a known testnet token
      if (this.knownTokens[tokenAddress]) {
        const tokenInfo = this.knownTokens[tokenAddress];
        console.log(`🔍 [DEBUG] testnetSwap.getWalletBalance - Known token: ${tokenInfo.symbol}`);
        
        // For testnet tokens, try to get real balance first
        let realBalance = 0;
        
        if (this.wallet && this.provider) {
          try {
            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
            console.log(`🔍 [DEBUG] testnetSwap.getWalletBalance - Token contract created`);
            console.log(`🔍 [DEBUG] testnetSwap.getWalletBalance - Wallet address: ${this.wallet.address}`);
            
            const balance = await tokenContract.balanceOf(this.wallet.address);
            realBalance = parseFloat(ethers.formatEther(balance));
            console.log(`🔍 [DEBUG] testnetSwap.getWalletBalance - Raw balance: ${balance}`);
            console.log(`🔍 [DEBUG] testnetSwap.getWalletBalance - Formatted balance: ${realBalance}`);
          } catch (error) {
            console.log(`🔍 [DEBUG] testnetSwap.getWalletBalance - Error getting real balance: ${error.message}`);
          }
        }
        
        return {
          success: true,
          balance: realBalance,
          symbol: tokenInfo.symbol,
          address: tokenAddress
        };
      }
      
      // For unknown tokens, return 0
      return {
        success: true,
        balance: 0,
        symbol: 'UNKNOWN',
        address: tokenAddress
      };
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return { success: false, error: error.message };
    }
  }

  async estimateSwap(fromTokenAddress, toTokenAddress, amountIn) {
    try {
      const fromToken = await this.getTokenInfo(fromTokenAddress);
      const toToken = await this.getTokenInfo(toTokenAddress);
      
      if (!fromToken || !toToken) {
        return { success: false, error: 'Could not get token information' };
      }
      
      // Get exchange rate
      const rate = this.exchangeRates[toToken.symbol] / this.exchangeRates[fromToken.symbol];
      const expectedOutput = amountIn * rate;
      
      return {
        success: true,
        amountIn,
        amountOut: expectedOutput,
        rate,
        fromToken: fromToken.symbol,
        toToken: toToken.symbol
      };
    } catch (error) {
      console.error('❌ Error estimating swap:', error);
      return { success: false, error: error.message };
    }
  }

  async executeSwap(fromTokenAddress, toTokenAddress, amountIn) {
    try {
      // Wait for wallet to be initialized
      await this.walletPromise;
      
      const fromToken = await this.getTokenInfo(fromTokenAddress);
      const toToken = await this.getTokenInfo(toTokenAddress);
      
      if (!fromToken || !toToken) {
        return { success: false, error: 'Could not get token information' };
      }
      
      // Estimate the swap
      const estimate = await this.estimateSwap(fromTokenAddress, toTokenAddress, amountIn);
      if (!estimate.success) {
        return estimate;
      }
      
      console.log(`🔄 Executing real testnet swap: ${amountIn} ${fromToken.symbol} → ${estimate.amountOut.toFixed(6)} ${toToken.symbol}`);
      
      // Perform real on-chain transactions for testnet tokens
      try {
        // Check if wallet is available
        if (!this.wallet) {
          throw new Error('No wallet available for transactions');
        }
        
        if (fromToken.symbol === 'WSTT' || fromToken.symbol === 'STT') {
          // STT → Token swap: Send STT to a designated address and mint tokens
          console.log('💰 Executing STT → Token swap...');
          
          // 1. Send STT to a designated address (simulating DEX)
          const recipientAddress = "0x35DaDAb2bb21A6d4e20beC3F603B8426Dc124004"; // Designated recipient
          const amountInWei = ethers.parseEther(amountIn.toString());
          
          console.log(`📤 Sending ${amountIn} STT to ${recipientAddress}...`);
          console.log(`🔍 [DEBUG] Wallet address: ${this.wallet.address}`);
          console.log(`🔍 [DEBUG] Wallet has sendTransaction: ${typeof this.wallet.sendTransaction === 'function'}`);
          
          const sttTx = await this.wallet.sendTransaction({
            to: recipientAddress,
            value: amountInWei
          });
          
          console.log(`⏳ Waiting for STT transfer confirmation...`);
          const sttReceipt = await sttTx.wait();
          console.log(`✅ STT transfer confirmed in block ${sttReceipt.blockNumber}`);
          
          // 2. Mint tokens to user's wallet (simulating token purchase)
          console.log(`🪙 Minting ${estimate.amountOut} ${toToken.symbol} to user...`);
          const tokenContract = new ethers.Contract(toTokenAddress, ERC20_ABI, this.wallet);
          
          // Check if contract has mint function
          try {
            const mintAmount = ethers.parseEther(estimate.amountOut.toString());
            console.log(`🔍 [DEBUG] Attempting to mint ${mintAmount.toString()} wei to ${this.wallet.address}`);
            
            // Check if the contract has a mint function
            const mintFunction = tokenContract.interface.getFunction('mint');
            if (!mintFunction) {
              throw new Error('Contract does not have mint function');
            }
            
            const mintTx = await tokenContract.mint(this.wallet.address, mintAmount);
            console.log(`⏳ Waiting for token mint confirmation...`);
            const mintReceipt = await mintTx.wait();
            console.log(`✅ Token mint confirmed in block ${mintReceipt.blockNumber}`);
            
            return {
              success: true,
              amountIn,
              amountOut: estimate.amountOut,
              txHash: sttReceipt.hash, // Use STT transfer hash as main transaction
              fromToken: fromToken.symbol,
              toToken: toToken.symbol,
              rate: estimate.rate,
              note: 'Real testnet swap completed on blockchain',
              sttTxHash: sttReceipt.hash,
              mintTxHash: mintReceipt.hash
            };
          } catch (mintError) {
            console.log(`⚠️ Token mint failed: ${mintError.message}`);
            console.log(`🔍 [DEBUG] Mint error details:`, mintError);
            
            // If mint fails, return error
            return {
              success: false,
              error: `Token mint failed: ${mintError.message}`,
              note: 'STT transfer completed but token mint failed'
            };
          }
          
        } else {
          // Token → STT swap: Transfer tokens to designated wallet and simulate STT return
          console.log('🪙 Executing Token → STT swap...');
          
          // Check if we have enough balance
          const balanceResult = await this.getWalletBalance(fromTokenAddress);
          if (!balanceResult.success) {
            throw new Error(`Error getting balance: ${balanceResult.error}`);
          }
          
          const totalBalance = balanceResult.balance;
          console.log(`🔍 [DEBUG] Total balance available: ${totalBalance} ${fromToken.symbol}`);
          
          if (totalBalance < amountIn) {
            throw new Error(`Insufficient ${fromToken.symbol} balance. Current: ${totalBalance}, Required: ${amountIn}`);
          }
          
          // 1. Transfer tokens to a designated wallet (simulating DEX sell)
          const tokenContract = new ethers.Contract(fromTokenAddress, ERC20_ABI, this.wallet);
          const transferAmount = ethers.parseEther(amountIn.toString());
          
          // Designated wallet to receive tokens (simulating DEX)
          const designatedWallet = "0x35DaDAb2bb21A6d4e20beC3F603B8426Dc124004";
          
          console.log(`📤 Transferring ${amountIn} ${fromToken.symbol} to ${designatedWallet}...`);
          
          try {
            const transferTx = await tokenContract.transfer(designatedWallet, transferAmount);
            console.log(`⏳ Waiting for token transfer confirmation...`);
            const transferReceipt = await transferTx.wait();
            console.log(`✅ Token transfer confirmed in block ${transferReceipt.blockNumber}`);
            
            return {
              success: true,
              amountIn,
              amountOut: estimate.amountOut,
              txHash: transferReceipt.hash,
              fromToken: fromToken.symbol,
              toToken: toToken.symbol,
              rate: estimate.rate,
              note: 'Real testnet token transfer completed on blockchain',
              transferTxHash: transferReceipt.hash
            };
          } catch (transferError) {
            console.log(`⚠️ Token transfer failed: ${transferError.message}`);
            return {
              success: false,
              error: `Token transfer failed: ${transferError.message}`,
              note: 'Failed to transfer tokens'
            };
          }
        }
      } catch (error) {
        console.error('❌ Error executing real testnet swap:', error);
        return { success: false, error: error.message };
      }
    } catch (error) {
      console.error('❌ Error executing swap:', error);
      return { success: false, error: error.message };
    }
  }

  async checkAndMintTokens(tokenAddress, requiredAmount) {
    try {
      const balance = await this.getWalletBalance(tokenAddress);
      if (parseFloat(balance) < requiredAmount) {
        console.log(`🪙 Minting ${requiredAmount} tokens for testnet operations...`);
        return await this.mintTestnetTokens(tokenAddress, requiredAmount * 2); // Mint extra
      }
      return true;
    } catch (error) {
      console.error('❌ Error checking/minting tokens:', error);
      return false;
    }
  }

  async mintTestnetTokens(tokenAddress, amount) {
    try {
      // Wait for wallet to be initialized
      await this.walletPromise;
      
      if (!this.wallet) {
        throw new Error('No wallet available for minting');
      }
      
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.wallet);
      const mintAmount = ethers.parseEther(amount.toString());
      
      const mintTx = await tokenContract.mint(this.wallet.address, mintAmount);
      const receipt = await mintTx.wait();
      
      return {
        success: true,
        txHash: receipt.hash,
        amount: amount
      };
    } catch (error) {
      console.error('Error minting testnet tokens:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = {
  TestnetSwap,
  decryptPrivateKey
}; 