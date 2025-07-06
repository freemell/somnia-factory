const { ethers } = require('ethers');

async function testRouter() {
  try {
    // Initialize provider
    const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network');
    
    // Load ABI
    const abi = require('./utils/abi.json');
    
    // Correct Router contract address for QuickSwap on Somnia testnet
    const routerAddress = '0x9726bc6F5ceff07dA975Ec666a6F967390814e4d';
    const router = new ethers.Contract(routerAddress, abi, provider);
    
    console.log('Testing QuickSwap router...');
    console.log('Router address:', routerAddress);
    
    // Test WETH function
    try {
      const weth = await router.WETH();
      console.log('WETH address:', weth);
    } catch (error) {
      console.log('WETH function failed:', error.message);
    }
    
    // Test factory function
    try {
      const factory = await router.factory();
      console.log('Factory address:', factory);
    } catch (error) {
      console.log('Factory function failed:', error.message);
    }
    
    // Test getAmountsOut with dummy values
    const tokenA = '0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7';
    const tokenB = '0xd2480162aa7f02ead7bf4c127465446150d58452';
    const amountIn = ethers.parseUnits('1', 18);
    const path = [tokenA, tokenB];
    
    console.log('\nTesting getAmountsOut...');
    console.log('Token A:', tokenA);
    console.log('Token B:', tokenB);
    console.log('Amount In:', amountIn.toString());
    
    try {
      const amounts = await router.getAmountsOut(amountIn, path);
      console.log('✅ getAmountsOut successful!');
      console.log('Amounts:', amounts.map(a => a.toString()));
    } catch (error) {
      console.log('❌ getAmountsOut failed:', error.message);
    }
    
  } catch (error) {
    console.error('Error testing router:', error);
  }
}

// Run the test
testRouter(); 