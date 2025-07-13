const hre = require("hardhat");

async function main() {
  console.log("Deploying CustomFactory to Somnia Testnet...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  
  if (!deployer) {
    throw new Error("No deployer account found. Please check your private key in .env file.");
  }
  
  console.log("Deploying contracts with the account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", balance.toString());

  // Deploy CustomFactory
  const CustomFactory = await hre.ethers.getContractFactory("CustomFactory");
  console.log("Deploying CustomFactory...");
  
  const factory = await CustomFactory.deploy(deployer.address);
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log("CustomFactory deployed to:", factoryAddress);

  // Create a test pool (placeholder)
  console.log("Creating a test pool...");
  const tokenA = "0x0000000000000000000000000000000000000001"; // Placeholder token address
  const tokenB = "0x0000000000000000000000000000000000000002"; // Placeholder token address
  const fee = 3000; // 0.3% fee
  const tickSpacing = 60;

  const tx = await factory.createPool(tokenA, tokenB, fee, tickSpacing);
  console.log("Pool creation transaction hash:", tx.hash);
  const receipt = await tx.wait();

  // Get the pool address from the event
  const poolCreatedEvent = receipt.logs.find(log => {
    try {
      const parsed = factory.interface.parseLog(log);
      return parsed.name === "PoolCreated";
    } catch {
      return false;
    }
  });

  if (poolCreatedEvent) {
    const parsed = factory.interface.parseLog(poolCreatedEvent);
    console.log("Pool created at:", parsed.args.pool);
    console.log("Token0:", parsed.args.token0);
    console.log("Token1:", parsed.args.token1);
    console.log("Fee:", parsed.args.fee.toString());
  }

  console.log("Deployment completed successfully!");
  console.log("CustomFactory address:", factoryAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  }); 