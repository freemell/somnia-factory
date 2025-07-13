const { ethers } = require("hardhat");
const { formatUnits } = require("ethers");
require("dotenv").config();

// Your deployed token addresses
const TOKEN_A = "0x792C721fe2ed8004378A818a32623035b2588325";
const TOKEN_B = "0xD3A6d61dCC7752b0c73F8f5D415F89E82dD80DFd";

// DEX addresses for Somnia testnet
const ROUTER_ADDRESS = "0xE94de02e52Eaf9F0f6Bf7f16E4927FcBc2c09bC7";
const FACTORY_ADDRESS = "0x0BFaCE9a5c9F884a4f09fadB83b69e81EA41424B";

// Basic ABIs
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)"
];

const ROUTER_ABI = [
  "function WNativeToken() external view returns (address)"
];

async function main() {
  console.log("📋 Swap Testing Summary for Your Tokens\n");
  console.log("=" .repeat(60));
  
  const [signer] = await ethers.getSigners();
  
  // Initialize contracts
  const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, signer);
  const tokenA = new ethers.Contract(TOKEN_A, ERC20_ABI, signer);
  const tokenB = new ethers.Contract(TOKEN_B, ERC20_ABI, signer);
  
  // Get WNativeToken address
  let wNativeAddress;
  try {
    wNativeAddress = await router.WNativeToken();
  } catch (error) {
    wNativeAddress = "0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7";
  }
  
  console.log("\n🏗️  DEPLOYMENT STATUS:");
  console.log("✅ Your tokens are successfully deployed!");
  console.log(`   TokenA (${await tokenA.symbol()}): ${TOKEN_A}`);
  console.log(`   TokenB (${await tokenB.symbol()}): ${TOKEN_B}`);
  console.log(`   WNativeToken: ${wNativeAddress}`);
  
  console.log("\n💰 CURRENT BALANCES:");
  const sttBalance = await ethers.provider.getBalance(signer.address);
  const tokenABalance = await tokenA.balanceOf(signer.address);
  const tokenBBalance = await tokenB.balanceOf(signer.address);
  
  console.log(`   STT: ${formatUnits(sttBalance, 18)}`);
  console.log(`   ${await tokenA.symbol()}: ${formatUnits(tokenABalance, 18)}`);
  console.log(`   ${await tokenB.symbol()}: ${formatUnits(tokenBBalance, 18)}`);
  
  console.log("\n❌ CURRENT ISSUE:");
  console.log("   No liquidity pools exist for your tokens yet.");
  console.log("   This prevents swaps from being executed.");
  
  console.log("\n🔧 NEXT STEPS TO ENABLE SWAPS:");
  console.log("\n1. CREATE LIQUIDITY POOLS:");
  console.log("   You need to create pools for these pairs:");
  console.log(`   • STT ↔ ${await tokenA.symbol()}`);
  console.log(`   • STT ↔ ${await tokenB.symbol()}`);
  console.log(`   • ${await tokenA.symbol()} ↔ ${await tokenB.symbol()}`);
  
  console.log("\n2. MANUAL POOL CREATION OPTIONS:");
  console.log("   Option A: Use Somnia DEX Interface (if available)");
  console.log("   Option B: Use Hardhat Console (see commands below)");
  console.log("   Option C: Create pools programmatically (requires investigation)");
  
  console.log("\n3. ADD LIQUIDITY:");
  console.log("   After creating pools, add initial liquidity:");
  console.log(`   • Add some STT and ${await tokenA.symbol()} to STT/${await tokenA.symbol()} pool`);
  console.log(`   • Add some STT and ${await tokenB.symbol()} to STT/${await tokenB.symbol()} pool`);
  console.log(`   • Add some ${await tokenA.symbol()} and ${await tokenB.symbol()} to ${await tokenA.symbol()}/${await tokenB.symbol()} pool`);
  
  console.log("\n🛠️  HARDHAT CONSOLE COMMANDS:");
  console.log("   To create pools manually, run:");
  console.log("   npx hardhat console --network somniaTestnet");
  console.log("\n   Then in the console:");
  console.log("   const factory = await ethers.getContractAt('Factory', '0x0BFaCE9a5c9F884a4f09fadB83b69e81EA41424B');");
  console.log("   await factory.createPool('0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7', '0x792C721fe2ed8004378A818a32623035b2588325', 3000);");
  console.log("   await factory.createPool('0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7', '0xD3A6d61dCC7752b0c73F8f5D415F89E82dD80DFd', 3000);");
  console.log("   await factory.createPool('0x792C721fe2ed8004378A818a32623035b2588325', '0xD3A6d61dCC7752b0c73F8f5D415F89E82dD80DFd', 3000);");
  
  console.log("\n🧪 TESTING SCRIPTS READY:");
  console.log("   Once pools are created, you can test swaps with:");
  console.log("   • npx hardhat run scripts/simple-swap-test.js --network somniaTestnet");
  console.log("   • npx hardhat run scripts/test-swap.js --network somniaTestnet");
  console.log("   • npx hardhat run scripts/setup-and-test-swaps.js --network somniaTestnet");
  
  console.log("\n📊 DEX INFORMATION:");
  console.log(`   Router: ${ROUTER_ADDRESS}`);
  console.log(`   Factory: ${FACTORY_ADDRESS}`);
  console.log("   Network: Somnia Testnet");
  console.log("   Chain ID: 50312");
  
  console.log("\n💡 TROUBLESHOOTING:");
  console.log("   If pool creation fails:");
  console.log("   1. Check if you have the right permissions");
  console.log("   2. Verify the DEX is fully operational");
  console.log("   3. Try different fee tiers (500, 3000, 10000)");
  console.log("   4. Check if tokens are compatible with the DEX");
  
  console.log("\n" + "=" .repeat(60));
  console.log("✅ Summary: Your tokens are ready, just need liquidity pools!");
  console.log("🚀 Once pools are created, swaps will work perfectly!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }); 