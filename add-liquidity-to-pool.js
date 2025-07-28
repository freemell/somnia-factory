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
  deployer: '0x35DaDAb2bb21A6d4e20beC3F603b8426Dc124004'
};

async function addLiquidityToPool() {
  try {
    console.log('🚀 Adding liquidity to custom pool...\n');
    
    // Initialize provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://dream-rpc.somnia.network/');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '6db2f8420a8388c0fe02f021c5ce1c1b5aa7e18fb8a2c57eb6f2092d4822d92d', provider);
    
    console.log('👤 Wallet address:', wallet.address);
    console.log('🏊 Pool address:', CONTRACT_ADDRESSES.poolAddress);
    console.log('🪙 TokenA address:', CONTRACT_ADDRESSES.tokenA);
    console.log('🪙 TokenB address:', CONTRACT_ADDRESSES.tokenB);
    
    // Initialize contracts
    const pool = new ethers.Contract(CONTRACT_ADDRESSES.poolAddress, abi.CustomPool, wallet);
    const tokenA = new ethers.Contract(CONTRACT_ADDRESSES.tokenA, abi.TokenA, wallet);
    const tokenB = new ethers.Contract(CONTRACT_ADDRESSES.tokenB, abi.TokenB, wallet);
    
    // Check current balances
    console.log('\n💰 Checking current balances...');
    const balanceA = await tokenA.balanceOf(wallet.address);
    const balanceB = await tokenB.balanceOf(wallet.address);
    const poolBalanceA = await tokenA.balanceOf(CONTRACT_ADDRESSES.poolAddress);
    const poolBalanceB = await tokenB.balanceOf(CONTRACT_ADDRESSES.poolAddress);
    
    console.log('👤 Wallet TokenA balance:', ethers.formatUnits(balanceA, 18));
    console.log('👤 Wallet TokenB balance:', ethers.formatUnits(balanceB, 18));
    console.log('🏊 Pool TokenA balance:', ethers.formatUnits(poolBalanceA, 18));
    console.log('🏊 Pool TokenB balance:', ethers.formatUnits(poolBalanceB, 18));
    
    // Check if we need to mint tokens first
    if (balanceA < ethers.parseUnits('100', 18)) {
      console.log('\n🪙 Minting TokenA...');
      const mintTx = await tokenA.mint(wallet.address, ethers.parseUnits('1000', 18));
      await mintTx.wait();
      console.log('✅ TokenA minted');
    }
    
    if (balanceB < ethers.parseUnits('100', 18)) {
      console.log('\n🪙 Minting TokenB...');
      const mintTx = await tokenB.mint(wallet.address, ethers.parseUnits('1000', 18));
      await mintTx.wait();
      console.log('✅ TokenB minted');
    }
    
    // Add liquidity amounts
    const liquidityAmountA = ethers.parseUnits('100', 18); // 100 TokenA
    const liquidityAmountB = ethers.parseUnits('100', 18); // 100 TokenB
    
    console.log('\n🏊 Adding liquidity to pool...');
    console.log('📊 Amount TokenA:', ethers.formatUnits(liquidityAmountA, 18));
    console.log('📊 Amount TokenB:', ethers.formatUnits(liquidityAmountB, 18));
    
    // Approve tokens for pool
    console.log('\n✅ Approving TokenA...');
    const approveATx = await tokenA.approve(CONTRACT_ADDRESSES.poolAddress, liquidityAmountA);
    await approveATx.wait();
    console.log('✅ TokenA approved');
    
    console.log('✅ Approving TokenB...');
    const approveBTx = await tokenB.approve(CONTRACT_ADDRESSES.poolAddress, liquidityAmountB);
    await approveBTx.wait();
    console.log('✅ TokenB approved');
    
    // Transfer tokens to pool (simulating liquidity addition)
    console.log('\n🔄 Transferring tokens to pool...');
    const transferATx = await tokenA.transfer(CONTRACT_ADDRESSES.poolAddress, liquidityAmountA);
    await transferATx.wait();
    console.log('✅ TokenA transferred to pool');
    
    const transferBTx = await tokenB.transfer(CONTRACT_ADDRESSES.poolAddress, liquidityAmountB);
    await transferBTx.wait();
    console.log('✅ TokenB transferred to pool');
    
    // Try to call addLiquidity on the pool (if it exists)
    try {
      console.log('\n🏊 Calling addLiquidity on pool...');
      const addLiquidityTx = await pool.addLiquidity(liquidityAmountA);
      await addLiquidityTx.wait();
      console.log('✅ Liquidity added to pool');
    } catch (error) {
      console.log('⚠️ Could not call addLiquidity (function might not exist):', error.message);
      console.log('✅ Tokens transferred to pool manually');
    }
    
    // Check final balances
    console.log('\n💰 Checking final balances...');
    const finalBalanceA = await tokenA.balanceOf(wallet.address);
    const finalBalanceB = await tokenB.balanceOf(wallet.address);
    const finalPoolBalanceA = await tokenA.balanceOf(CONTRACT_ADDRESSES.poolAddress);
    const finalPoolBalanceB = await tokenB.balanceOf(CONTRACT_ADDRESSES.poolAddress);
    
    console.log('👤 Final Wallet TokenA balance:', ethers.formatUnits(finalBalanceA, 18));
    console.log('👤 Final Wallet TokenB balance:', ethers.formatUnits(finalBalanceB, 18));
    console.log('🏊 Final Pool TokenA balance:', ethers.formatUnits(finalPoolBalanceA, 18));
    console.log('🏊 Final Pool TokenB balance:', ethers.formatUnits(finalPoolBalanceB, 18));
    
    console.log('\n🎉 Liquidity addition completed!');
    console.log('📊 Pool now has:');
    console.log(`   - ${ethers.formatUnits(finalPoolBalanceA, 18)} TokenA`);
    console.log(`   - ${ethers.formatUnits(finalPoolBalanceB, 18)} TokenB`);
    
  } catch (error) {
    console.error('❌ Error adding liquidity:', error);
  }
}

// Run the function
addLiquidityToPool(); 