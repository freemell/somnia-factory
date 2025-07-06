const { ethers } = require('ethers');

async function testFactoryGetPair() {
  try {
    // Initialize provider
    const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network');
    
    // Factory ABI with getPair function
    const abi = [
      {
        "inputs": [
          { "internalType": "address", "name": "tokenA", "type": "address" },
          { "internalType": "address", "name": "tokenB", "type": "address" }
        ],
        "name": "getPair",
        "outputs": [{ "internalType": "address", "name": "pair", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
      }
    ];
    
    // Correct Factory contract address for QuickSwap on Somnia testnet
    const factoryAddress = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
    const factory = new ethers.Contract(factoryAddress, abi, provider);
    
    // WETH address from router test
    const WETH = '0xf4759546ca8D848156eb84cA4dfa66e6BC478452';
    
    // Test with WETH and a test token
    const tokenA = WETH;
    const tokenB = '0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7';
    
    console.log('Testing factory getPair function...');
    console.log('Factory address:', factoryAddress);
    console.log('WETH address:', WETH);
    console.log('Token A (WETH):', tokenA);
    console.log('Token B:', tokenB);
    
    // Test getPair function
    const pair = await factory.getPair(tokenA, tokenB);
    console.log('Pair address:', pair);
    
    // Check if pair exists (non-zero address)
    if (pair !== ethers.ZeroAddress) {
      console.log('✅ Pair exists!');
      console.log('Pair address:', pair);
    } else {
      console.log('❌ No pair found for these tokens');
    }
    
    // Test with reversed token order
    console.log('\nTesting with reversed token order...');
    const pairReversed = await factory.getPair(tokenB, tokenA);
    console.log('Pair address (reversed):', pairReversed);
    
    if (pair === pairReversed) {
      console.log('✅ Pair addresses match (as expected)');
    } else {
      console.log('❌ Pair addresses do not match');
    }
    
    // Test with another token pair
    console.log('\nTesting with another token pair...');
    const tokenC = '0xd2480162aa7f02ead7bf4c127465446150d58452';
    const pair2 = await factory.getPair(WETH, tokenC);
    console.log('Pair (WETH, TokenC):', pair2);
    
    if (pair2 !== ethers.ZeroAddress) {
      console.log('✅ Second pair exists!');
    } else {
      console.log('❌ No second pair found');
    }
    
  } catch (error) {
    console.error('Error testing factory getPair:', error);
  }
}

// Run the test
testFactoryGetPair(); 