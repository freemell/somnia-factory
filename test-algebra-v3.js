const { ethers } = require('ethers');

async function testAlgebraV3() {
  try {
    // Initialize provider
    const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network');
    
    // Load ABI
    const abi = require('./utils/abi.json');
    
    // Algebra V3 contract addresses
    const routerAddress = '0xE94de02e52Eaf9F0f6Bf7f16E4927FcBc2c09bC7';
    const factoryAddress = '0x0BFaCE9a5c9F884a4f09fadB83b69e81EA41424B';
    
    console.log('Testing Algebra V3 setup...');
    console.log('Router address:', routerAddress);
    console.log('Factory address:', factoryAddress);
    
    // Check contract deployment
    const routerCode = await provider.getCode(routerAddress);
    const factoryCode = await provider.getCode(factoryAddress);
    
    console.log('\nContract deployment check:');
    console.log('Router bytecode length:', routerCode.length);
    console.log('Factory bytecode length:', factoryCode.length);
    
    if (routerCode === '0x') {
      console.log('❌ Router contract not deployed');
      return;
    } else {
      console.log('✅ Router contract deployed');
    }
    
    if (factoryCode === '0x') {
      console.log('❌ Factory contract not deployed');
      return;
    } else {
      console.log('✅ Factory contract deployed');
    }
    
    // Test router functions
    const router = new ethers.Contract(routerAddress, abi, provider);
    
    console.log('\nTesting router functions:');
    
    // Test WNativeToken function
    let wNativeAddress;
    try {
      wNativeAddress = await router.WNativeToken();
      console.log('WNativeToken address:', wNativeAddress);
    } catch (error) {
      console.log('WNativeToken function failed:', error.message);
      return;
    }
    
    // Test factory function
    try {
      const factoryFromRouter = await router.factory();
      console.log('Factory address from router:', factoryFromRouter);
    } catch (error) {
      console.log('Factory function failed:', error.message);
    }
    
    // Test poolDeployer function
    try {
      const poolDeployer = await router.poolDeployer();
      console.log('PoolDeployer address:', poolDeployer);
    } catch (error) {
      console.log('PoolDeployer function failed:', error.message);
    }
    
    // Test factory getPool function
    const factory = new ethers.Contract(factoryAddress, abi, provider);
    
    console.log('\nTesting factory getPool function:');
    
    // Test with WNativeToken and different tokens
    const testTokens = [
      '0xd2480162aa7f02ead7bf4c127465446150d58452',
      '0x1234567890123456789012345678901234567890', // Dummy address
      '0x0000000000000000000000000000000000000001'  // Another dummy
    ];
    
    const feeTiers = [500, 3000, 10000]; // 0.05%, 0.3%, 1%
    
    console.log('WNativeToken:', wNativeAddress);
    
    for (const testToken of testTokens) {
      console.log(`\nTesting with token: ${testToken}`);
      
      for (const fee of feeTiers) {
        try {
          console.log(`  Testing fee tier ${fee} (${fee/10000}%):`);
          
          // Test normal order
          const pool1 = await factory.getPool(wNativeAddress, testToken, fee);
          console.log(`    Pool (WNative, Token) with fee ${fee}:`, pool1);
          
          if (pool1 !== ethers.ZeroAddress) {
            console.log(`    ✅ Pool found with fee ${fee}`);
          }
          
          // Test reverse order
          const pool2 = await factory.getPool(testToken, wNativeAddress, fee);
          console.log(`    Pool (Token, WNative) with fee ${fee}:`, pool2);
          
          if (pool2 !== ethers.ZeroAddress) {
            console.log(`    ✅ Pool found with reverse order and fee ${fee}`);
          }
          
        } catch (error) {
          console.log(`    Error testing fee ${fee}:`, error.message);
        }
      }
    }
    
    // Test with the original token pair
    console.log('\nTesting original token pair:');
    const tokenA = '0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7';
    const tokenB = '0xd2480162aa7f02ead7bf4c127465446150d58452';
    
    console.log('Token A:', tokenA);
    console.log('Token B:', tokenB);
    
    for (const fee of feeTiers) {
      try {
        console.log(`\nTesting fee tier ${fee} (${fee/10000}%):`);
        
        // Test normal order
        const pool1 = await factory.getPool(tokenA, tokenB, fee);
        console.log(`Pool (A,B) with fee ${fee}:`, pool1);
        
        if (pool1 !== ethers.ZeroAddress) {
          console.log(`✅ Pool found with fee ${fee}`);
        }
        
        // Test reverse order
        const pool2 = await factory.getPool(tokenB, tokenA, fee);
        console.log(`Pool (B,A) with fee ${fee}:`, pool2);
        
        if (pool2 !== ethers.ZeroAddress) {
          console.log(`✅ Pool found with reverse order and fee ${fee}`);
        }
        
      } catch (error) {
        console.log(`Error testing fee ${fee}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('Error testing Algebra V3:', error);
  }
}

// Run the test
testAlgebraV3(); 