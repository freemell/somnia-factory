require('dotenv').config();
const { ethers } = require('ethers');
const CustomSwap = require('./utils/customSwap');

async function testCustomSwap() {
  try {
    console.log('🚀 Starting Custom Swap Test...\n');
    
    // Initialize CustomSwap with your wallet
    const customSwap = new CustomSwap(
      process.env.RPC_URL || 'https://dream-rpc.somnia.network/',
      process.env.PRIVATE_KEY || '6db2f8420a8388c0fe02f021c5ce1c1b5aa7e18fb8a2c57eb6f2092d4822d92d'
    );
    
    console.log('✅ CustomSwap initialized');
    console.log('👤 Wallet address:', customSwap.wallet.address);
    console.log('🏭 Factory address:', '0x1ABF676f2D149b742E6A482Eaaa7bDC81b4148c6');
    console.log('🏊 Pool address:', '0x05942239059D344BD5c25b597Abf89F00A91537e');
    console.log('🪙 TokenA address:', '0x94E2ae13081636bd62E596E08bE6342d3F585aD2');
    console.log('🪙 TokenB address:', '0xA3ea70ADb7818e13ba55064158252D2e0f9a918c\n');
    
    // Test 1: Get pool information
    console.log('📊 Test 1: Getting pool information...');
    try {
      const poolInfo = await customSwap.getPoolInfo();
      console.log('✅ Pool info retrieved successfully\n');
    } catch (error) {
      console.log('❌ Failed to get pool info:', error.message);
      console.log('⚠️  This might indicate the pool is not properly initialized\n');
    }
    
    // Test 2: Get token information
    console.log('📊 Test 2: Getting token information...');
    try {
      const tokenAInfo = await customSwap.getTokenInfo('0x94E2ae13081636bd62E596E08bE6342d3F585aD2');
      console.log('✅ TokenA info retrieved successfully');
      
      const tokenBInfo = await customSwap.getTokenInfo('0xA3ea70ADb7818e13ba55064158252D2e0f9a918c');
      console.log('✅ TokenB info retrieved successfully\n');
    } catch (error) {
      console.log('❌ Failed to get token info:', error.message);
      console.log('⚠️  This might indicate the tokens are not deployed or accessible\n');
    }
    
    // Test 3: Get wallet balances
    console.log('💰 Test 3: Getting wallet balances...');
    try {
      const balanceA = await customSwap.getWalletBalance('0x94E2ae13081636bd62E596E08bE6342d3F585aD2', customSwap.wallet.address);
      console.log(`✅ TokenA balance: ${balanceA.formattedBalance}`);
      
      const balanceB = await customSwap.getWalletBalance('0xA3ea70ADb7818e13ba55064158252D2e0f9a918c', customSwap.wallet.address);
      console.log(`✅ TokenB balance: ${balanceB.formattedBalance}\n`);
    } catch (error) {
      console.log('❌ Failed to get wallet balances:', error.message);
      console.log('⚠️  This might indicate insufficient token balances\n');
    }
    
    // Test 4: Estimate swap
    console.log('🔍 Test 4: Estimating swap...');
    try {
      const swapAmount = ethers.parseUnits('1', 18); // 1 token
      const estimatedOutput = await customSwap.estimateSwap(
        '0x94E2ae13081636bd62E596E08bE6342d3F585aD2',
        '0xA3ea70ADb7818e13ba55064158252D2e0f9a918c',
        swapAmount
      );
      console.log(`✅ Swap estimation: 1 TokenA → ${ethers.formatUnits(estimatedOutput, 18)} TokenB\n`);
    } catch (error) {
      console.log('❌ Failed to estimate swap:', error.message);
      console.log('⚠️  This might indicate insufficient liquidity in the pool\n');
    }
    
    // Test 5: Execute swap (only if all previous tests pass)
    console.log('🚀 Test 5: Executing swap...');
    try {
      const swapResult = await customSwap.testSwap();
      console.log('✅ Swap executed successfully!');
      console.log('📊 Swap result:', swapResult);
    } catch (error) {
      console.log('❌ Failed to execute swap:', error.message);
      console.log('⚠️  This might indicate issues with the swap execution\n');
    }
    
    console.log('\n🎉 Custom Swap Test completed!');
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
  }
}

// Run the test
testCustomSwap(); 