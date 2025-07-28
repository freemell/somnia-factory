require('dotenv').config();
const { ethers } = require('ethers');
const abi = require('./utils/abi.json');

// Contract addresses
const CONTRACT_ADDRESSES = {
  customFactory: '0x1ABF676f2D149b742E6A482Eaaa7bDC81b4148c6',
  stt: '0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7',
  ping: '0x33E7fAB0a8a5da1A923180989bD617c9c2D1C493',
  insomiacs: '0x0C726E446865FFb19Cc13f21aBf0F515106C9662'
};

class TestnetSwapSimulator {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://dream-rpc.somnia.network/');
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '6db2f8420a8388c0fe02f021c5ce1c1b5aa7e18fb8a2c57eb6f2092d4822d92d', this.provider);
    
    // Initialize contracts
    this.stt = new ethers.Contract(CONTRACT_ADDRESSES.stt, abi.TokenA, this.wallet);
    this.ping = new ethers.Contract(CONTRACT_ADDRESSES.ping, abi.TokenA, this.wallet);
    this.insomiacs = new ethers.Contract(CONTRACT_ADDRESSES.insomiacs, abi.Insomiacs, this.wallet);
    
    // Testnet exchange rates (simulated)
    this.exchangeRates = {
      'PING': 0.5,  // 1 STT = 0.5 PING
      'INSOM': 2.0, // 1 STT = 2.0 INSOM
      'WSTT': 1.0,  // Base rate
      'STT': 1.0    // Base rate
    };
  }

  async getTokenInfo(tokenAddress) {
    try {
      const token = new ethers.Contract(tokenAddress, abi.TokenA, this.wallet);
      const name = await token.name();
      const symbol = await token.symbol();
      const decimals = await token.decimals();
      const totalSupply = await token.totalSupply();
      
      return {
        name,
        symbol,
        decimals,
        totalSupply: ethers.formatUnits(totalSupply, decimals),
        address: tokenAddress
      };
    } catch (error) {
      console.log(`❌ Error getting token info for ${tokenAddress}:`, error.message);
      return null;
    }
  }

  async getWalletBalance(tokenAddress) {
    try {
      const token = new ethers.Contract(tokenAddress, abi.TokenA, this.wallet);
      const balance = await token.balanceOf(this.wallet.address);
      return ethers.formatUnits(balance, 18);
    } catch (error) {
      console.log(`❌ Error getting balance for ${tokenAddress}:`, error.message);
      return '0';
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

  async simulateSwap(fromToken, toToken, amount) {
    try {
      console.log(`🔄 Simulating swap: ${amount} ${fromToken.symbol} → ${toToken.symbol}`);
      
      // Get exchange rate
      const rate = this.exchangeRates[toToken.symbol] / this.exchangeRates[fromToken.symbol];
      const expectedOutput = amount * rate;
      
      console.log(`📊 Exchange rate: 1 ${fromToken.symbol} = ${rate} ${toToken.symbol}`);
      console.log(`📈 Expected output: ${expectedOutput.toFixed(6)} ${toToken.symbol}`);
      
      // Check if we have enough tokens
      const fromBalance = await this.getWalletBalance(fromToken.address);
      if (parseFloat(fromBalance) < amount) {
        console.log(`❌ Insufficient ${fromToken.symbol} balance. Current: ${fromBalance}, Required: ${amount}`);
        return { success: false, error: 'Insufficient balance' };
      }
      
      // Check if we have enough target tokens to "swap"
      const toBalance = await this.getWalletBalance(toToken.address);
      if (parseFloat(toBalance) < expectedOutput) {
        console.log(`⚠️ Need to mint ${toToken.symbol} tokens for swap simulation`);
        await this.mintTestnetTokens(toToken.address, expectedOutput * 2); // Mint extra for future swaps
      }
      
      // Simulate the swap by transferring tokens
      console.log(`💸 Transferring ${amount} ${fromToken.symbol} to "pool"...`);
      
      // For testnet, we'll just burn the input tokens and mint output tokens
      // This simulates a real swap without needing liquidity
      
      // Burn input tokens (transfer to zero address)
      const fromTokenContract = new ethers.Contract(fromToken.address, abi.TokenA, this.wallet);
      const burnTx = await fromTokenContract.transfer(ethers.ZeroAddress, ethers.parseUnits(amount.toString(), 18));
      await burnTx.wait();
      console.log(`🔥 Burned ${amount} ${fromToken.symbol}`);
      
      // Mint output tokens
      const toTokenContract = new ethers.Contract(toToken.address, abi.TokenA, this.wallet);
      const mintTx = await toTokenContract.mint(this.wallet.address, ethers.parseUnits(expectedOutput.toString(), 18));
      await mintTx.wait();
      console.log(`🪙 Minted ${expectedOutput.toFixed(6)} ${toToken.symbol}`);
      
      // Generate fake transaction hash
      const fakeTxHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
      
      return {
        success: true,
        amountIn: amount,
        amountOut: expectedOutput,
        txHash: fakeTxHash,
        note: 'Testnet swap simulation - no real liquidity required'
      };
      
    } catch (error) {
      console.error('❌ Error simulating swap:', error);
      return { success: false, error: error.message };
    }
  }

  async testSwap() {
    console.log('🧪 Testing testnet swap simulation...\n');
    
    // Get token info
    const sttInfo = await this.getTokenInfo(CONTRACT_ADDRESSES.stt);
    const pingInfo = await this.getTokenInfo(CONTRACT_ADDRESSES.ping);
    const insomiacsInfo = await this.getTokenInfo(CONTRACT_ADDRESSES.insomiacs);
    
    if (!sttInfo || !pingInfo || !insomiacsInfo) {
      console.log('❌ Could not get token information');
      return;
    }
    
    console.log('📊 Token Information:');
    console.log(`   STT: ${sttInfo.name} (${sttInfo.symbol})`);
    console.log(`   PING: ${pingInfo.name} (${pingInfo.symbol})`);
    console.log(`   INSOM: ${insomiacsInfo.name} (${insomiacsInfo.symbol})`);
    
    // Check balances
    console.log('\n💰 Current Balances:');
    let sttBalance = await this.getWalletBalance(CONTRACT_ADDRESSES.stt);
    const pingBalance = await this.getWalletBalance(CONTRACT_ADDRESSES.ping);
    const insomiacsBalance = await this.getWalletBalance(CONTRACT_ADDRESSES.insomiacs);
    
    console.log(`   STT: ${sttBalance}`);
    console.log(`   PING: ${pingBalance}`);
    console.log(`   INSOM: ${insomiacsBalance}`);
    
    // Mint some tokens if needed
    if (parseFloat(sttBalance) < 10) {
      console.log('\n🪙 Minting STT tokens for testing...');
      const mintSuccess = await this.mintTestnetTokens(CONTRACT_ADDRESSES.stt, 100);
      if (mintSuccess) {
        console.log('✅ STT tokens minted successfully');
        // Wait a moment for the transaction to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Check balance again
        sttBalance = await this.getWalletBalance(CONTRACT_ADDRESSES.stt);
        console.log(`💰 Updated STT balance: ${sttBalance}`);
      } else {
        console.log('❌ Failed to mint STT tokens');
        return;
      }
    }
    
    // Test swap STT → PING
    console.log('\n🔄 Testing STT → PING swap...');
    const swap1 = await this.simulateSwap(sttInfo, pingInfo, 5);
    console.log('Swap result:', swap1);
    
    // Test swap PING → INSOM
    console.log('\n🔄 Testing PING → INSOM swap...');
    const swap2 = await this.simulateSwap(pingInfo, insomiacsInfo, 2);
    console.log('Swap result:', swap2);
    
    // Test swap INSOM → STT
    console.log('\n🔄 Testing INSOM → STT swap...');
    const swap3 = await this.simulateSwap(insomiacsInfo, sttInfo, 10);
    console.log('Swap result:', swap3);
    
    // Check final balances
    console.log('\n💰 Final Balances:');
    const finalSttBalance = await this.getWalletBalance(CONTRACT_ADDRESSES.stt);
    const finalPingBalance = await this.getWalletBalance(CONTRACT_ADDRESSES.ping);
    const finalInsomiacsBalance = await this.getWalletBalance(CONTRACT_ADDRESSES.insomiacs);
    
    console.log(`   STT: ${finalSttBalance}`);
    console.log(`   PING: ${finalPingBalance}`);
    console.log(`   INSOM: ${finalInsomiacsBalance}`);
    
    console.log('\n🎉 Testnet swap simulation completed!');
  }
}

// Run the test
async function runTest() {
  const simulator = new TestnetSwapSimulator();
  await simulator.testSwap();
}

runTest(); 