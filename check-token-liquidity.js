require('dotenv').config();
const { ethers } = require('ethers');
const abi = require('./utils/abi.json');

// Contract addresses
const CONTRACT_ADDRESSES = {
  customFactory: '0x1ABF676f2D149b742E6A482Eaaa7bDC81b4148c6',
  stt: '0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7',
  targetToken: '0x33E7fAB0a8a5da1A923180989bD617c9c2D1C493'
};

async function checkTokenLiquidity() {
  try {
    console.log('🔍 Checking token liquidity...\n');
    
    // Initialize provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://dream-rpc.somnia.network/');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '6db2f8420a8388c0fe02f021c5ce1c1b5aa7e18fb8a2c57eb6f2092d4822d92d', provider);
    
    console.log('👤 Wallet address:', wallet.address);
    console.log('🪙 Target token:', CONTRACT_ADDRESSES.targetToken);
    console.log('🪙 STT token:', CONTRACT_ADDRESSES.stt);
    
    // Initialize contracts
    const targetToken = new ethers.Contract(CONTRACT_ADDRESSES.targetToken, abi.TokenA, wallet);
    const stt = new ethers.Contract(CONTRACT_ADDRESSES.stt, ['function balanceOf(address) view returns (uint256)'], provider);
    
    // Check if target token exists and get info
    console.log('\n📊 Getting target token information...');
    let tokenName, tokenSymbol, tokenDecimals, tokenTotalSupply;
    try {
      tokenName = await targetToken.name();
      tokenSymbol = await targetToken.symbol();
      tokenDecimals = await targetToken.decimals();
      tokenTotalSupply = await targetToken.totalSupply();
      
      console.log('✅ Target token info:');
      console.log(`   Name: ${tokenName}`);
      console.log(`   Symbol: ${tokenSymbol}`);
      console.log(`   Decimals: ${tokenDecimals}`);
      console.log(`   Total Supply: ${ethers.formatUnits(tokenTotalSupply, tokenDecimals)}`);
    } catch (error) {
      console.log('❌ Could not get target token info:', error.message);
      return;
    }
    
    // Check wallet balances
    console.log('\n💰 Checking wallet balances...');
    const targetTokenBalance = await targetToken.balanceOf(wallet.address);
    const sttBalance = await stt.balanceOf(wallet.address);
    
    console.log(`👤 Wallet ${tokenSymbol} balance: ${ethers.formatUnits(targetTokenBalance, 18)}`);
    console.log(`👤 Wallet STT balance: ${ethers.formatUnits(sttBalance, 18)}`);
    
    // Check if there's a pool for target token/STT
    console.log('\n🏊 Checking for target token/STT pools...');
    
    // Try to find existing pools
    const customFactory = new ethers.Contract(CONTRACT_ADDRESSES.customFactory, abi.CustomFactory, wallet);
    
    // Check different fee tiers
    const feeTiers = [100, 500, 3000, 10000];
    let existingPool = null;
    let existingPoolFee = null;
    
    for (const fee of feeTiers) {
      try {
        const pool = await customFactory.getPool(CONTRACT_ADDRESSES.stt, CONTRACT_ADDRESSES.targetToken, fee);
        if (pool !== ethers.ZeroAddress) {
          existingPool = pool;
          existingPoolFee = fee;
          console.log(`✅ Found existing pool at ${pool} with fee ${fee}`);
          break;
        }
      } catch (error) {
        console.log(`⚠️ Error checking fee tier ${fee}:`, error.message);
      }
    }
    
    if (!existingPool) {
      console.log('❌ No existing pool found for target token/STT pair');
      console.log('🏗️ Creating new pool...');
      
      try {
        // Create pool with 3000 fee tier
        const createPoolTx = await customFactory.createPool(
          CONTRACT_ADDRESSES.stt,
          CONTRACT_ADDRESSES.targetToken,
          3000
        );
        await createPoolTx.wait();
        console.log('✅ Pool created successfully');
        
        // Get the new pool address
        const newPool = await customFactory.getPool(CONTRACT_ADDRESSES.stt, CONTRACT_ADDRESSES.targetToken, 3000);
        existingPool = newPool;
        existingPoolFee = 3000;
        console.log(`📍 New pool address: ${newPool}`);
      } catch (error) {
        console.log('❌ Error creating pool:', error.message);
        return;
      }
    }
    
    // Check pool liquidity
    console.log('\n🏊 Checking pool liquidity...');
    const poolContract = new ethers.Contract(existingPool, abi.CustomPool, wallet);
    
    try {
      const token0 = await poolContract.token0();
      const token1 = await poolContract.token1();
      const fee = await poolContract.fee();
      const liquidity = await poolContract.liquidity();
      
      console.log('📊 Pool info:');
      console.log(`   Token0: ${token0}`);
      console.log(`   Token1: ${token1}`);
      console.log(`   Fee: ${fee} bps`);
      console.log(`   Liquidity: ${ethers.formatUnits(liquidity, 18)}`);
      
      // Check token balances in pool
      const targetTokenInPool = await targetToken.balanceOf(existingPool);
      const sttInPool = await stt.balanceOf(existingPool);
      
      console.log('💰 Pool balances:');
      console.log(`   Target Token: ${ethers.formatUnits(targetTokenInPool, 18)}`);
      console.log(`   STT: ${ethers.formatUnits(sttInPool, 18)}`);
      
      // Check if pool has sufficient liquidity
      const minLiquidity = ethers.parseUnits('10', 18); // 10 tokens minimum
      
      if (targetTokenInPool < minLiquidity || sttInPool < minLiquidity) {
        console.log('\n⚠️ Pool has insufficient liquidity for meaningful trading');
        console.log('💡 Pool exists but needs more liquidity to be useful');
      } else {
        console.log('\n✅ Pool has sufficient liquidity for trading');
        
        // Test swap estimation
        console.log('\n🧪 Testing swap estimation...');
        try {
          const amountIn = ethers.parseUnits('1', 18); // 1 STT
          const amountInWithFee = amountIn * 997n; // 0.3% fee
          const reserveIn = sttInPool;
          const reserveOut = targetTokenInPool;
          
          if (reserveIn > 0 && reserveOut > 0) {
            const numerator = amountInWithFee * reserveOut;
            const denominator = (reserveIn * 1000n) + amountInWithFee;
            const amountOut = numerator / denominator;
            
            console.log(`✅ Swap estimation: 1 STT → ${ethers.formatUnits(amountOut, 18)} ${tokenSymbol}`);
            console.log('🎉 Pool is ready for trading!');
          }
        } catch (error) {
          console.log('❌ Error testing swap estimation:', error.message);
        }
      }
      
    } catch (error) {
      console.log('❌ Error checking pool liquidity:', error.message);
      console.log('💡 Pool may exist but has no liquidity yet');
    }
    
  } catch (error) {
    console.error('❌ Error checking token liquidity:', error);
  }
}

// Run the function
checkTokenLiquidity(); 