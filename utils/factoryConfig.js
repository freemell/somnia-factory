// Factory configuration for the bot
const fs = require("fs");
const path = require("path");

function loadFactoryConfig() {
  const configPath = path.join(__dirname, "../deployment-factory.json");
  
  if (!fs.existsSync(configPath)) {
    console.warn("⚠️ deployment-factory.json not found. Using default addresses.");
    return {
      // Default addresses (replace with your deployed addresses)
      customFactory: "0x0000000000000000000000000000000000000000",
      customPoolDeployer: "0x0000000000000000000000000000000000000000",
      tokenA: "0x0000000000000000000000000000000000000000",
      tokenB: "0x0000000000000000000000000000000000000000",
      testPool: "0x0000000000000000000000000000000000000000"
    };
  }

  try {
    const deployment = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return deployment.contracts;
  } catch (error) {
    console.error("❌ Error loading factory config:", error);
    return null;
  }
}

function updateBotConfig() {
  const config = loadFactoryConfig();
  if (!config) return false;

  // Update environment variables or config files
  process.env.CUSTOM_FACTORY_ADDRESS = config.customFactory;
  process.env.CUSTOM_POOL_DEPLOYER_ADDRESS = config.customPoolDeployer;
  
  console.log("✅ Factory config loaded:");
  console.log(`🏭 Factory: ${config.customFactory}`);
  console.log(`📦 Pool Deployer: ${config.customPoolDeployer}`);
  console.log(`🪙 TokenA: ${config.tokenA}`);
  console.log(`🪙 TokenB: ${config.tokenB}`);
  console.log(`🏊 Test Pool: ${config.testPool}`);
  
  return true;
}

module.exports = {
  loadFactoryConfig,
  updateBotConfig
}; 