const { ethers } = require('ethers');

async function testRouterFactory() {
  try {
    // Initialize provider
    const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network');
    
    // Load ABI
    const abi = require('./utils/abi.json');
    
    // Router contract address
    const routerAddress = '0x9726bc6F5ceff07dA975Ec666a6F967390814e4d';
    const router = new ethers.Contract(routerAddress, abi, provider);
    
    console.log('Testing router factory connection...');
    console.log('Router address:', routerAddress);
    
    // Get the factory address from the router
    const factoryAddress = await router.factory();
    console.log('Factory address from router:', factoryAddress);
    
    // Check if this factory is deployed
    const factoryCode = await provider.getCode(factoryAddress);
    console.log('Factory bytecode length:', factoryCode.length);
    
    if (factoryCode === '0x') {
      console.log('❌ Factory contract not deployed');
    } else {
      console.log('✅ Factory contract deployed');
      
      // Test getPair on this factory
      const factory = new ethers.Contract(factoryAddress, abi, provider);
      const WETH = '0xf4759546ca8D848156eb84cA4dfa66e6BC478452';
      const testToken = '0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7';
      
      try {
        const pair = await factory.getPair(WETH, testToken);
        console.log('Pair address:', pair);
        if (pair !== ethers.ZeroAddress) {
          console.log('✅ Pair exists!');
        } else {
          console.log('❌ No pair found');
        }
      } catch (error) {
        console.log('getPair error:', error.message);
      }
    }
    
  } catch (error) {
    console.error('Error testing router factory:', error);
  }
}

// Run the test
testRouterFactory(); 