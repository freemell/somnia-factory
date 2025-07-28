require('dotenv').config();
const { ethers } = require('ethers');
const abi = require('./utils/abi.json');

// Contract addresses
const CONTRACT_ADDRESSES = {
  customFactory: '0x1ABF676f2D149b742E6A482Eaaa7bDC81b4148c6',
  customPoolDeployer: '0x954543565985E48dF582Ac452c4CbffB028961dB',
  poolAddress: '0x05942239059D344BD5c25b597Abf89F00A91537e',
  tokenA: '0x94E2ae13081636bd62E596E08bE6342d3F585aD2',
  tokenB: '0xA3ea70ADb7818e13ba55064158252D2e0f9a918c',
  deployer: '0x35DaDAb2bb21A6d4e20beC3F603b8426Dc124004',
  insomiacs: '0x0C726E446865FFb19Cc13f21aBf0F515106C9662',
  stt: '0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7'
};

async function checkInsomiacsLiquidity() {
  try {
    console.log('🔍 Checking Insomiacs token liquidity...\n');
    
    // Initialize provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://dream-rpc.somnia.network/');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '6db2f8420a8388c0fe02f021c5ce1c1b5aa7e18fb8a2c57eb6f2092d4822d92d', provider);
    
    console.log('👤 Wallet address:', wallet.address);
    console.log('🪙 Insomiacs token:', CONTRACT_ADDRESSES.insomiacs);
    console.log('🪙 STT token:', CONTRACT_ADDRESSES.stt);
    
    // Initialize contracts
    const insomiacs = new ethers.Contract(CONTRACT_ADDRESSES.insomiacs, abi.Insomiacs, wallet);
    const stt = new ethers.Contract(CONTRACT_ADDRESSES.stt, ['function balanceOf(address) view returns (uint256)'], provider);
    
    // Check if Insomiacs token exists and get info
    console.log('\n📊 Getting Insomiacs token information...');
    try {
      const name = await insomiacs.name();
      const symbol = await insomiacs.symbol();
      const decimals = await insomiacs.decimals();
      const totalSupply = await insomiacs.totalSupply();
      
      console.log('✅ Insomiacs token info:');
      console.log(`   Name: ${name}`);
      console.log(`   Symbol: ${symbol}`);
      console.log(`   Decimals: ${decimals}`);
      console.log(`   Total Supply: ${ethers.formatUnits(totalSupply, decimals)}`);
    } catch (error) {
      console.log('❌ Could not get Insomiacs token info:', error.message);
      return;
    }
    
    // Check wallet balances
    console.log('\n💰 Checking wallet balances...');
    const insomiacsBalance = await insomiacs.balanceOf(wallet.address);
    const sttBalance = await stt.balanceOf(wallet.address);
    
    console.log(`👤 Wallet Insomiacs balance: ${ethers.formatUnits(insomiacsBalance, 18)}`);
    console.log(`👤 Wallet STT balance: ${ethers.formatUnits(sttBalance, 18)}`);
    
    // Check if there's a pool for Insomiacs/STT
    console.log('\n🏊 Checking for Insomiacs/STT pool...');
    
    // Try to find existing pools
    const customFactory = new ethers.Contract(CONTRACT_ADDRESSES.customFactory, abi.CustomFactory, wallet);
    
    // Check different fee tiers
    const feeTiers = [100, 500, 3000, 10000];
    let existingPool = null;
    let existingPoolFee = null;
    
    for (const fee of feeTiers) {
      try {
        const pool = await customFactory.getPool(CONTRACT_ADDRESSES.stt, CONTRACT_ADDRESSES.insomiacs, fee);
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
      console.log('❌ No existing pool found for Insomiacs/STT pair');
      console.log('🏗️ Creating new pool...');
      
      try {
        // Create pool with 3000 fee tier
        const createPoolTx = await customFactory.createPool(
          CONTRACT_ADDRESSES.stt,
          CONTRACT_ADDRESSES.insomiacs,
          3000
        );
        await createPoolTx.wait();
        console.log('✅ Pool created successfully');
        
        // Get the new pool address
        const newPool = await customFactory.getPool(CONTRACT_ADDRESSES.stt, CONTRACT_ADDRESSES.insomiacs, 3000);
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
      const insomiacsInPool = await insomiacs.balanceOf(existingPool);
      const sttInPool = await stt.balanceOf(existingPool);
      
      console.log('💰 Pool balances:');
      console.log(`   Insomiacs: ${ethers.formatUnits(insomiacsInPool, 18)}`);
      console.log(`   STT: ${ethers.formatUnits(sttInPool, 18)}`);
      
      // Check if pool has sufficient liquidity
      const minLiquidity = ethers.parseUnits('10', 18); // 10 tokens minimum
      
      if (insomiacsInPool < minLiquidity || sttInPool < minLiquidity) {
        console.log('\n⚠️ Pool has insufficient liquidity. Adding liquidity...');
        await addLiquidityToInsomiacsPool(existingPool, insomiacs, stt, wallet);
      } else {
        console.log('\n✅ Pool has sufficient liquidity for trading');
      }
      
    } catch (error) {
      console.log('❌ Error checking pool liquidity:', error.message);
      console.log('🏗️ Adding liquidity to pool...');
      await addLiquidityToInsomiacsPool(existingPool, insomiacs, stt, wallet);
    }
    
  } catch (error) {
    console.error('❌ Error checking Insomiacs liquidity:', error);
  }
}

async function addLiquidityToInsomiacsPool(poolAddress, insomiacs, stt, wallet) {
  try {
    console.log('\n🏊 Adding liquidity to Insomiacs/STT pool...');
    
    // Check if we need to mint Insomiacs tokens
    const insomiacsBalance = await insomiacs.balanceOf(wallet.address);
    const sttBalance = await stt.balanceOf(wallet.address);
    
    const requiredAmount = ethers.parseUnits('100', 18); // 100 tokens each
    
    if (insomiacsBalance < requiredAmount) {
      console.log('🪙 Minting Insomiacs tokens...');
      const mintTx = await insomiacs.mint(wallet.address, ethers.parseUnits('1000', 18));
      await mintTx.wait();
      console.log('✅ Insomiacs tokens minted');
    }
    
    // Approve tokens for pool
    console.log('✅ Approving Insomiacs...');
    const approveInsomiacsTx = await insomiacs.approve(poolAddress, requiredAmount);
    await approveInsomiacsTx.wait();
    console.log('✅ Insomiacs approved');
    
    console.log('✅ Approving STT...');
    const sttContract = new ethers.Contract(CONTRACT_ADDRESSES.stt, abi.TokenA, wallet);
    const approveSTTTx = await sttContract.approve(poolAddress, requiredAmount);
    await approveSTTTx.wait();
    console.log('✅ STT approved');
    
    // Transfer tokens to pool
    console.log('🔄 Transferring tokens to pool...');
    const transferInsomiacsTx = await insomiacs.transfer(poolAddress, requiredAmount);
    await transferInsomiacsTx.wait();
    console.log('✅ Insomiacs transferred to pool');
    
    const transferSTTTx = await sttContract.transfer(poolAddress, requiredAmount);
    await transferSTTTx.wait();
    console.log('✅ STT transferred to pool');
    
    // Try to call addLiquidity on the pool
    try {
      const poolContract = new ethers.Contract(poolAddress, abi.CustomPool, wallet);
      const addLiquidityTx = await poolContract.addLiquidity(requiredAmount);
      await addLiquidityTx.wait();
      console.log('✅ Liquidity added to pool');
    } catch (error) {
      console.log('⚠️ Could not call addLiquidity (function might not exist):', error.message);
      console.log('✅ Tokens transferred to pool manually');
    }
    
    // Check final pool balances
    const finalInsomiacsInPool = await insomiacs.balanceOf(poolAddress);
    const finalSTTInPool = await stt.balanceOf(poolAddress);
    
    console.log('\n🎉 Liquidity addition completed!');
    console.log('📊 Final pool balances:');
    console.log(`   Insomiacs: ${ethers.formatUnits(finalInsomiacsInPool, 18)}`);
    console.log(`   STT: ${ethers.formatUnits(finalSTTInPool, 18)}`);
    
  } catch (error) {
    console.error('❌ Error adding liquidity:', error);
  }
}

// Run the function
checkInsomiacsLiquidity(); 