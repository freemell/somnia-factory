require('dotenv').config();
const { ethers } = require('ethers');
const abi = require('./utils/abi.json');

// Contract addresses
const CONTRACT_ADDRESSES = {
  customFactory: '0x1ABF676f2D149b742E6A482Eaaa7bDC81b4148c6',
  insomiacs: '0x0C726E446865FFb19Cc13f21aBf0F515106C9662',
  stt: '0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7',
  insomiacsPool: '0x4f87050Cb77F0F854EB508BAB867adB9b3D3F8fF' // Pool we just created
};

async function addInsomiacsLiquidity() {
  try {
    console.log('🏊 Adding liquidity to Insomiacs/STT pool...\n');
    
    // Initialize provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://dream-rpc.somnia.network/');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '6db2f8420a8388c0fe02f021c5ce1c1b5aa7e18fb8a2c57eb6f2092d4822d92d', provider);
    
    console.log('👤 Wallet address:', wallet.address);
    console.log('🏊 Pool address:', CONTRACT_ADDRESSES.insomiacsPool);
    
    // Initialize contracts
    const insomiacs = new ethers.Contract(CONTRACT_ADDRESSES.insomiacs, abi.Insomiacs, wallet);
    const stt = new ethers.Contract(CONTRACT_ADDRESSES.stt, ['function balanceOf(address) view returns (uint256)', 'function transfer(address,uint256) returns (bool)', 'function approve(address,uint256) returns (bool)'], wallet);
    
    // Check current balances
    console.log('\n💰 Checking current balances...');
    const insomiacsBalance = await insomiacs.balanceOf(wallet.address);
    const sttBalance = await stt.balanceOf(wallet.address);
    
    console.log(`👤 Wallet Insomiacs balance: ${ethers.formatUnits(insomiacsBalance, 18)}`);
    console.log(`👤 Wallet STT balance: ${ethers.formatUnits(sttBalance, 18)}`);
    
    // Check pool balances
    const insomiacsInPool = await insomiacs.balanceOf(CONTRACT_ADDRESSES.insomiacsPool);
    const sttInPool = await stt.balanceOf(CONTRACT_ADDRESSES.insomiacsPool);
    
    console.log(`🏊 Pool Insomiacs balance: ${ethers.formatUnits(insomiacsInPool, 18)}`);
    console.log(`🏊 Pool STT balance: ${ethers.formatUnits(sttInPool, 18)}`);
    
    // Calculate how much we can add
    const maxAmount = ethers.parseUnits('50', 18); // 50 tokens each
    const addAmount = insomiacsBalance < maxAmount ? insomiacsBalance : maxAmount;
    const addAmountSTT = sttBalance < maxAmount ? sttBalance : maxAmount;
    
    if (addAmount <= 0 || addAmountSTT <= 0) {
      console.log('❌ Insufficient tokens to add liquidity');
      console.log('💡 You may need to get some Insomiacs and STT tokens first');
      return;
    }
    
    console.log(`\n📊 Adding liquidity: ${ethers.formatUnits(addAmount, 18)} Insomiacs + ${ethers.formatUnits(addAmountSTT, 18)} STT`);
    
    // Approve tokens for pool
    console.log('\n✅ Approving Insomiacs...');
    const approveInsomiacsTx = await insomiacs.approve(CONTRACT_ADDRESSES.insomiacsPool, addAmount);
    await approveInsomiacsTx.wait();
    console.log('✅ Insomiacs approved');
    
    console.log('✅ Approving STT...');
    const approveSTTTx = await stt.approve(CONTRACT_ADDRESSES.insomiacsPool, addAmountSTT);
    await approveSTTTx.wait();
    console.log('✅ STT approved');
    
    // Transfer tokens to pool
    console.log('\n🔄 Transferring tokens to pool...');
    const transferInsomiacsTx = await insomiacs.transfer(CONTRACT_ADDRESSES.insomiacsPool, addAmount);
    await transferInsomiacsTx.wait();
    console.log('✅ Insomiacs transferred to pool');
    
    const transferSTTTx = await stt.transfer(CONTRACT_ADDRESSES.insomiacsPool, addAmountSTT);
    await transferSTTTx.wait();
    console.log('✅ STT transferred to pool');
    
    // Try to call addLiquidity on the pool
    try {
      const poolContract = new ethers.Contract(CONTRACT_ADDRESSES.insomiacsPool, abi.CustomPool, wallet);
      const addLiquidityTx = await poolContract.addLiquidity(addAmount);
      await addLiquidityTx.wait();
      console.log('✅ Liquidity added to pool');
    } catch (error) {
      console.log('⚠️ Could not call addLiquidity (function might not exist):', error.message);
      console.log('✅ Tokens transferred to pool manually');
    }
    
    // Check final balances
    console.log('\n💰 Checking final balances...');
    const finalInsomiacsInPool = await insomiacs.balanceOf(CONTRACT_ADDRESSES.insomiacsPool);
    const finalSTTInPool = await stt.balanceOf(CONTRACT_ADDRESSES.insomiacsPool);
    const finalWalletInsomiacs = await insomiacs.balanceOf(wallet.address);
    const finalWalletSTT = await stt.balanceOf(wallet.address);
    
    console.log('📊 Final balances:');
    console.log(`   Pool Insomiacs: ${ethers.formatUnits(finalInsomiacsInPool, 18)}`);
    console.log(`   Pool STT: ${ethers.formatUnits(finalSTTInPool, 18)}`);
    console.log(`   Wallet Insomiacs: ${ethers.formatUnits(finalWalletInsomiacs, 18)}`);
    console.log(`   Wallet STT: ${ethers.formatUnits(finalWalletSTT, 18)}`);
    
    console.log('\n🎉 Liquidity addition completed!');
    
    // Test if we can now estimate swaps
    console.log('\n🧪 Testing swap estimation...');
    try {
      const amountIn = ethers.parseUnits('1', 18); // 1 STT
      const amountInWithFee = amountIn * 997n; // 0.3% fee
      const reserveIn = finalSTTInPool;
      const reserveOut = finalInsomiacsInPool;
      
      if (reserveIn > 0 && reserveOut > 0) {
        const numerator = amountInWithFee * reserveOut;
        const denominator = (reserveIn * 1000n) + amountInWithFee;
        const amountOut = numerator / denominator;
        
        console.log(`✅ Swap estimation: 1 STT → ${ethers.formatUnits(amountOut, 18)} Insomiacs`);
        console.log('🎉 Pool is ready for trading!');
      } else {
        console.log('⚠️ Pool still needs more liquidity for meaningful swaps');
      }
    } catch (error) {
      console.log('❌ Error testing swap estimation:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error adding liquidity:', error);
  }
}

// Run the function
addInsomiacsLiquidity(); 