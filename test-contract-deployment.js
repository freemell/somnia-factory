const { ethers } = require('ethers');

async function testContractDeployment() {
  try {
    // Initialize provider
    const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network');
    
    // Contract addresses
    const factoryAddress = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
    const routerAddress = '0x9726bc6F5ceff07dA975Ec666a6F967390814e4d';
    
    console.log('Testing contract deployment...');
    console.log('Factory address:', factoryAddress);
    console.log('Router address:', routerAddress);
    
    // Check if contracts exist by getting their bytecode
    const factoryCode = await provider.getCode(factoryAddress);
    const routerCode = await provider.getCode(routerAddress);
    
    console.log('\nFactory bytecode length:', factoryCode.length);
    console.log('Router bytecode length:', routerCode.length);
    
    if (factoryCode === '0x') {
      console.log('❌ Factory contract not deployed or address incorrect');
    } else {
      console.log('✅ Factory contract deployed');
    }
    
    if (routerCode === '0x') {
      console.log('❌ Router contract not deployed or address incorrect');
    } else {
      console.log('✅ Router contract deployed');
    }
    
    // Try to get the latest block to verify network connectivity
    const latestBlock = await provider.getBlockNumber();
    console.log('\nLatest block number:', latestBlock);
    
    // Try to get balance of a known address
    const balance = await provider.getBalance('0x0000000000000000000000000000000000000000');
    console.log('Zero address balance:', balance.toString());
    
  } catch (error) {
    console.error('Error testing contract deployment:', error);
  }
}

// Run the test
testContractDeployment(); 