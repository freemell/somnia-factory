require('dotenv').config();
const { ethers } = require('ethers');
const abi = require('./utils/abi.json');

async function testMinting() {
  try {
    console.log('🧪 Testing token minting...\n');
    
    // Initialize provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://dream-rpc.somnia.network/');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '6db2f8420a8388c0fe02f021c5ce1c1b5aa7e18fb8a2c57eb6f2092d4822d92d', provider);
    
    console.log('👤 Wallet address:', wallet.address);
    
    // Test STT token
    const sttAddress = '0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7';
    const stt = new ethers.Contract(sttAddress, abi.TokenA, wallet);
    
    console.log('\n📊 Testing STT token...');
    
    // Get token info
    try {
      const name = await stt.name();
      const symbol = await stt.symbol();
      const decimals = await stt.decimals();
      console.log(`   Name: ${name}`);
      console.log(`   Symbol: ${symbol}`);
      console.log(`   Decimals: ${decimals}`);
    } catch (error) {
      console.log('❌ Error getting STT info:', error.message);
    }
    
    // Check initial balance
    const initialBalance = await stt.balanceOf(wallet.address);
    console.log(`   Initial balance: ${ethers.formatUnits(initialBalance, 18)}`);
    
    // Try to mint
    console.log('\n🪙 Attempting to mint STT...');
    try {
      const mintAmount = ethers.parseUnits('50', 18);
      const mintTx = await stt.mint(wallet.address, mintAmount);
      console.log('   Mint transaction sent:', mintTx.hash);
      
      const receipt = await mintTx.wait();
      console.log('   Mint transaction confirmed in block:', receipt.blockNumber);
      
      // Check new balance
      const newBalance = await stt.balanceOf(wallet.address);
      console.log(`   New balance: ${ethers.formatUnits(newBalance, 18)}`);
      
      if (newBalance > initialBalance) {
        console.log('✅ Minting successful!');
      } else {
        console.log('❌ Balance did not increase');
      }
      
    } catch (error) {
      console.log('❌ Error minting STT:', error.message);
    }
    
    // Test PING token
    const pingAddress = '0x33E7fAB0a8a5da1A923180989bD617c9c2D1C493';
    const ping = new ethers.Contract(pingAddress, abi.TokenA, wallet);
    
    console.log('\n📊 Testing PING token...');
    
    // Get token info
    try {
      const name = await ping.name();
      const symbol = await ping.symbol();
      const decimals = await ping.decimals();
      console.log(`   Name: ${name}`);
      console.log(`   Symbol: ${symbol}`);
      console.log(`   Decimals: ${decimals}`);
    } catch (error) {
      console.log('❌ Error getting PING info:', error.message);
    }
    
    // Check initial balance
    const pingInitialBalance = await ping.balanceOf(wallet.address);
    console.log(`   Initial balance: ${ethers.formatUnits(pingInitialBalance, 18)}`);
    
    // Try to mint
    console.log('\n🪙 Attempting to mint PING...');
    try {
      const mintAmount = ethers.parseUnits('100', 18);
      const mintTx = await ping.mint(wallet.address, mintAmount);
      console.log('   Mint transaction sent:', mintTx.hash);
      
      const receipt = await mintTx.wait();
      console.log('   Mint transaction confirmed in block:', receipt.blockNumber);
      
      // Check new balance
      const pingNewBalance = await ping.balanceOf(wallet.address);
      console.log(`   New balance: ${ethers.formatUnits(pingNewBalance, 18)}`);
      
      if (pingNewBalance > pingInitialBalance) {
        console.log('✅ PING minting successful!');
      } else {
        console.log('❌ PING balance did not increase');
      }
      
    } catch (error) {
      console.log('❌ Error minting PING:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error in test:', error);
  }
}

testMinting(); 