const hre = require("hardhat");

async function main() {
  console.log("Deploying Factory contract to Somnia Testnet...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy Factory
  const Factory = await hre.ethers.getContractFactory("Factory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();

  console.log("Factory deployed to:", await factory.getAddress());
  console.log("Factory owner:", await factory.owner());
  
  // Save deployment info
  const deploymentInfo = {
    network: "somnia-testnet",
    chainId: 50312,
    factory: {
      address: await factory.getAddress(),
      owner: await factory.owner(),
      deployer: deployer.address
    },
    timestamp: new Date().toISOString()
  };

  console.log("\n=== Deployment Summary ===");
  console.log("Network: Somnia Testnet");
  console.log("Chain ID: 50312");
  console.log("Factory Address:", await factory.getAddress());
  console.log("Factory Owner:", await factory.owner());
  console.log("Deployer:", deployer.address);
  console.log("Block Explorer: https://shannon-explorer.somnia.network/");
  console.log("\nNext steps:");
  console.log("1. Verify the contract on explorer");
  console.log("2. Deploy test tokens: npm run deploy:test-tokens");
  console.log("3. Create pools using the factory");
  console.log("4. Update bot.js with factory address and ABI");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 