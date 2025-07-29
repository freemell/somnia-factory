const hre = require("hardhat");

async function main() {
  console.log("Deploying Factory with Swap functionality to Somnia Testnet...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy Factory
  const Factory = await hre.ethers.getContractFactory("Factory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();

  console.log("Factory deployed to:", await factory.getAddress());
  console.log("Factory owner:", await factory.owner());
  
  // Deploy Test Tokens
  const TestToken = await hre.ethers.getContractFactory("TestToken");
  const tokenA = await TestToken.deploy("Test Token A", "TTA");
  await tokenA.waitForDeployment();

  const tokenB = await TestToken.deploy("Test Token B", "TTB");
  await tokenB.waitForDeployment();

  console.log("Token A deployed to:", await tokenA.getAddress());
  console.log("Token B deployed to:", await tokenB.getAddress());

  // Create a pool
  console.log("\nCreating pool...");
  const tx = await factory.createPool(await tokenA.getAddress(), await tokenB.getAddress(), 3000, 60);
  await tx.wait();
  
  const poolAddress = await factory.getPool(await tokenA.getAddress(), await tokenB.getAddress(), 3000);
  console.log("Pool created at:", poolAddress);

  // Save deployment info
  const deploymentInfo = {
    network: "somnia-testnet",
    chainId: 50312,
    factory: {
      address: await factory.getAddress(),
      owner: await factory.owner(),
      deployer: deployer.address
    },
    tokens: {
      tokenA: await tokenA.getAddress(),
      tokenB: await tokenB.getAddress()
    },
    pool: {
      address: poolAddress
    },
    timestamp: new Date().toISOString()
  };

  console.log("\n=== Deployment Summary ===");
  console.log("Network: Somnia Testnet");
  console.log("Chain ID: 50312");
  console.log("Factory Address:", await factory.getAddress());
  console.log("Factory Owner:", await factory.owner());
  console.log("Token A (TTA):", await tokenA.getAddress());
  console.log("Token B (TTB):", await tokenB.getAddress());
  console.log("Pool Address:", poolAddress);
  console.log("Deployer:", deployer.address);
  console.log("Block Explorer: https://shannon-explorer.somnia.network/");
  console.log("\nNext steps:");
  console.log("1. Verify the contracts on explorer");
  console.log("2. Test swaps using the new pool");
  console.log("3. Update bot.js with new addresses");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 