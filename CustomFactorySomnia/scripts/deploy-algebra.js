const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy tokens first
  console.log("\n=== Deploying Tokens ===");
  
  const TokenA = await ethers.getContractFactory("TokenA");
  const tokenA = await TokenA.deploy();
  await tokenA.waitForDeployment();
  const tokenAAddress = await tokenA.getAddress();
  console.log("TokenA deployed to:", tokenAAddress);

  const TokenB = await ethers.getContractFactory("TokenB");
  const tokenB = await TokenB.deploy();
  await tokenB.waitForDeployment();
  const tokenBAddress = await tokenB.getAddress();
  console.log("TokenB deployed to:", tokenBAddress);

  // Get the creation bytecode from TestPool contract factory
  console.log("\n=== Getting TestPool creation bytecode ===");
  const TestPool = await ethers.getContractFactory("TestPool");
  const testPoolBytecode = TestPool.bytecode;
  console.log("TestPool creation bytecode length:", testPoolBytecode.length);
  console.log("TestPool creation bytecode hash:", ethers.keccak256(testPoolBytecode));

  // Deploy CustomPoolDeployer
  console.log("\n=== Deploying CustomPoolDeployer ===");
  const CustomPoolDeployer = await ethers.getContractFactory("CustomPoolDeployer");
  const customPoolDeployer = await CustomPoolDeployer.deploy(deployer.address);
  await customPoolDeployer.waitForDeployment();
  const customPoolDeployerAddress = await customPoolDeployer.getAddress();
  console.log("CustomPoolDeployer deployed to:", customPoolDeployerAddress);

  // Set the bytecode in the deployer
  console.log("\n=== Setting bytecode in CustomPoolDeployer ===");
  const setBytecodeTx = await customPoolDeployer.setPoolBytecode(testPoolBytecode);
  await setBytecodeTx.wait();
  console.log("Bytecode set successfully");

  // Deploy CustomFactory
  console.log("\n=== Deploying CustomFactory ===");
  const CustomFactory = await ethers.getContractFactory("CustomFactory");
  const customFactory = await CustomFactory.deploy(deployer.address, customPoolDeployerAddress, deployer.address);
  await customFactory.waitForDeployment();
  const customFactoryAddress = await customFactory.getAddress();
  console.log("CustomFactory deployed to:", customFactoryAddress);

  // Link the factory to the deployer
  console.log("\n=== Linking Factory to Deployer ===");
  const linkTx = await customPoolDeployer.setFactory(customFactoryAddress);
  await linkTx.wait();
  console.log("Factory linked successfully");

  // Create a pool
  console.log("\n=== Creating Pool ===");
  const fee = 3000; // 0.3%
  
  try {
    const createPoolTx = await customFactory.createPool(tokenAAddress, tokenBAddress, fee);
    const receipt = await createPoolTx.wait();
    console.log("Pool creation transaction hash:", createPoolTx.hash);
    
    // Look for PoolCreated event
    const poolCreatedEvent = receipt.logs.find(log => {
      try {
        const parsed = customFactory.interface.parseLog(log);
        return parsed.name === "PoolCreated";
      } catch {
        return false;
      }
    });
    
    if (poolCreatedEvent) {
      const parsed = customFactory.interface.parseLog(poolCreatedEvent);
      console.log("Pool created at address:", parsed.args.pool);
      console.log("Token0:", parsed.args.token0);
      console.log("Token1:", parsed.args.token1);
      console.log("Fee:", parsed.args.fee.toString());
      
      // Verify the pool was initialized correctly
      const TestPool = await ethers.getContractFactory("TestPool");
      const pool = TestPool.attach(parsed.args.pool);
      console.log("Pool initialized:", await pool.initialized());
      console.log("Pool token0:", await pool.token0());
      console.log("Pool token1:", await pool.token1());
      console.log("Pool fee:", await pool.fee());
      console.log("Pool factory:", await pool.factory());
    } else {
      console.log("PoolCreated event not found in transaction receipt");
    }
  } catch (error) {
    console.error("Error creating pool:", error.message);
    if (error.reason) {
      console.error("Revert reason:", error.reason);
    }
  }

  // Test getPool function
  console.log("\n=== Testing getPool ===");
  try {
    const poolAddress = await customFactory.getPool(tokenAAddress, tokenBAddress, fee);
    console.log("getPool returned:", poolAddress);
    if (poolAddress !== ethers.ZeroAddress) {
      console.log("Pool exists!");
    } else {
      console.log("Pool does not exist yet");
    }
  } catch (error) {
    console.error("Error calling getPool:", error.message);
  }

  // Save deployment info
  const deploymentInfo = {
    network: "somnia-testnet",
    deployer: deployer.address,
    tokens: {
      tokenA: tokenAAddress,
      tokenB: tokenBAddress
    },
    contracts: {
      customPoolDeployer: customPoolDeployerAddress,
      customFactory: customFactoryAddress
    },
    poolCreation: {
      fee: fee
    }
  };

  const deploymentPath = path.join(__dirname, "../deployment-info.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\nDeployment info saved to:", deploymentPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 