require('dotenv').config();
const { ethers } = require('ethers');
const abi = require('./utils/abi.json');

// Contract addresses
const CONTRACT_ADDRESSES = {
  stt: '0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7',
  ping: '0x33E7fAB0a8a5da1A923180989bD617c9c2D1C493',
  insomiacs: '0x0C726E446865FFb19Cc13f21aBf0F515106C9662'
};

class SimpleTestnetSwap {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://dream-rpc.somnia.network/');
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '6db2f8420a8388c0fe02f021c5ce1c1b5aa7e18fb8a2c57eb6f2092d4822d92d', this.provider);
    
    // Testnet exchange rates (simulated)
    this.exchangeRates = {
      'WSTT': 1.0,   // Base rate
      'PING': 0.5,   // 1 STT = 0.5 PING
      'INSOM': 2.0   // 1 STT = 2.0 INSOM
    };
  }

  async getTokenInfo(tokenAddress) {
    try {
      const token = new ethers.Contract(tokenAddress, abi.TokenA, this.wallet);
      const name = await token.name();
      const symbol = await token.symbol();
      const decimals = await token.decimals();
      
      return {
        name,
        symbol,
        decimals,
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

  async simulateSwap(fromTokenAddress, toTokenAddress, amountIn) {
    try {
      const fromToken = await this.getTokenInfo(fromTokenAddress);
      const toToken = await this.getTokenInfo(toTokenAddress);
      
      if (!fromToken || !toToken) {
        return { success: false, error: 'Could not get token information' };
      }
      
      console.log(`🔄 Simulating swap: ${amountIn} ${fromToken.symbol} → ${toToken.symbol}`);
      
      // Get exchange rate
      const rate = this.exchangeRates[toToken.symbol] / this.exchangeRates[fromToken.symbol];
      const expectedOutput = amountIn * rate;
      
      console.log(`📊 Exchange rate: 1 ${fromToken.symbol} = ${rate} ${toToken.symbol}`);
      console.log(`📈 Expected output: ${expectedOutput.toFixed(6)} ${toToken.symbol}`);
      
      // Check if we have enough input tokens
      const fromBalance = await this.getWalletBalance(fromTokenAddress);
      if (parseFloat(fromBalance) < amountIn) {
        console.log(`❌ Insufficient ${fromToken.symbol} balance. Current: ${fromBalance}, Required: ${amountIn}`);
        return { success: false, error: 'Insufficient balance' };
      }
      
      // For testnet simulation, we'll just show what would happen
      // without actually executing the swap
      console.log(`✅ Swap simulation successful!`);
      console.log(`   Input: ${amountIn} ${fromToken.symbol}`);
      console.log(`   Output: ${expectedOutput.toFixed(6)} ${toToken.symbol}`);
      console.log(`   Rate: 1 ${fromToken.symbol} = ${rate} ${toToken.symbol}`);
      
      // Generate fake transaction hash
      const fakeTxHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
      
      return {
        success: true,
        amountIn,
        amountOut: expectedOutput,
        txHash: fakeTxHash,
        fromToken: fromToken.symbol,
        toToken: toToken.symbol,
        rate,
        note: 'Testnet swap simulation - no real liquidity required'
      };
      
    } catch (error) {
      console.error('❌ Error simulating swap:', error);
      return { success: false, error: error.message };
    }
  }

  async testSwaps() {
    console.log('🧪 Testing simple testnet swap simulation...\n');
    
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
    const sttBalance = await this.getWalletBalance(CONTRACT_ADDRESSES.stt);
    const pingBalance = await this.getWalletBalance(CONTRACT_ADDRESSES.ping);
    const insomiacsBalance = await this.getWalletBalance(CONTRACT_ADDRESSES.insomiacs);
    
    console.log(`   STT: ${sttBalance}`);
    console.log(`   PING: ${pingBalance}`);
    console.log(`   INSOM: ${insomiacsBalance}`);
    
    // Test various swaps
    console.log('\n🔄 Testing swap simulations...');
    
    // Test STT → PING
    console.log('\n--- STT → PING Swap ---');
    const swap1 = await this.simulateSwap(CONTRACT_ADDRESSES.stt, CONTRACT_ADDRESSES.ping, 10);
    console.log('Result:', swap1.success ? '✅ Success' : '❌ Failed');
    
    // Test PING → INSOM
    console.log('\n--- PING → INSOM Swap ---');
    const swap2 = await this.simulateSwap(CONTRACT_ADDRESSES.ping, CONTRACT_ADDRESSES.insomiacs, 5);
    console.log('Result:', swap2.success ? '✅ Success' : '❌ Failed');
    
    // Test INSOM → STT
    console.log('\n--- INSOM → STT Swap ---');
    const swap3 = await this.simulateSwap(CONTRACT_ADDRESSES.insomiacs, CONTRACT_ADDRESSES.stt, 20);
    console.log('Result:', swap3.success ? '✅ Success' : '❌ Failed');
    
    // Test STT → INSOM
    console.log('\n--- STT → INSOM Swap ---');
    const swap4 = await this.simulateSwap(CONTRACT_ADDRESSES.stt, CONTRACT_ADDRESSES.insomiacs, 5);
    console.log('Result:', swap4.success ? '✅ Success' : '❌ Failed');
    
    console.log('\n🎉 Testnet swap simulation completed!');
    console.log('\n💡 This system allows testing swaps without requiring liquidity pools.');
    console.log('💡 In a real scenario, you would need to add liquidity to pools first.');
  }
}

// Run the test
async function runTest() {
  const simulator = new SimpleTestnetSwap();
  await simulator.testSwaps();
}

runTest(); 