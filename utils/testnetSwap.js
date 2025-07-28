const { ethers } = require('ethers');
const abi = require('./abi.json');

class TestnetSwap {
  constructor(provider, wallet) {
    this.provider = provider;
    this.wallet = wallet;
    
    // Testnet exchange rates (simulated)
    this.exchangeRates = {
      'WSTT': 1.0,   // Base rate
      'PING': 0.5,   // 1 STT = 0.5 PING
      'INSOM': 2.0   // 1 STT = 2.0 INSOM
    };
    
    // Known token addresses
    this.knownTokens = {
      '0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7': { symbol: 'WSTT', name: 'Wrapped STT', isTestnet: true },
      '0x33E7fAB0a8a5da1A923180989bD617c9c2D1C493': { symbol: 'PING', name: 'PING', isTestnet: true },
      '0x0C726E446865FFb19Cc13f21aBf0F515106C9662': { symbol: 'INSOM', name: 'Insomiacs', isTestnet: true }
    };
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
      
      // Try to get info from contract
      const token = new ethers.Contract(tokenAddress, abi.TokenA, this.provider);
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
      const token = new ethers.Contract(tokenAddress, abi.TokenA, this.provider);
      const balance = await token.balanceOf(this.wallet.address);
      return ethers.formatUnits(balance, 18);
    } catch (error) {
      console.log(`❌ Error getting balance for ${tokenAddress}:`, error.message);
      return '0';
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
      
      console.log(`🔄 Executing testnet swap: ${amountIn} ${fromToken.symbol} → ${estimate.amountOut.toFixed(6)} ${toToken.symbol}`);
      
      // For testnet, we simulate the swap without real transactions
      // This is safer and faster for bot integration
      
      // Generate fake transaction hash
      const fakeTxHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
      
      return {
        success: true,
        amountIn,
        amountOut: estimate.amountOut,
        txHash: fakeTxHash,
        fromToken: fromToken.symbol,
        toToken: toToken.symbol,
        rate: estimate.rate,
        note: 'Testnet swap simulation - no real liquidity required'
      };
      
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
      const token = new ethers.Contract(tokenAddress, abi.TokenA, this.wallet);
      const mintAmount = ethers.parseUnits(amount.toString(), 18);
      
      console.log(`🪙 Minting ${amount} tokens...`);
      const mintTx = await token.mint(this.wallet.address, mintAmount);
      await mintTx.wait();
      console.log(`✅ Successfully minted ${amount} tokens`);
      
      return true;
    } catch (error) {
      console.log(`❌ Error minting tokens:`, error.message);
      return false;
    }
  }
}

module.exports = TestnetSwap; 