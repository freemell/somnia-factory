const SomniaBot = require('../bot.js');

async function main() {
    const FACTORY_ADDRESS = "0x4E25079599d1bBb489d84A9323343a90fFC1D936";
    const TOKEN_A_ADDRESS = "0xedc17b0704Da16F0A677C107715AeD9359F8b451";
    const TOKEN_B_ADDRESS = "0x0909e23179b6D181C254eC7096284Df5A13D303F";
    
    console.log("Testing Somnia Bot with deployed contracts...");
    console.log("Factory Address:", FACTORY_ADDRESS);
    console.log("Token A Address:", TOKEN_A_ADDRESS);
    console.log("Token B Address:", TOKEN_B_ADDRESS);
    
    const bot = new SomniaBot(FACTORY_ADDRESS);
    
    try {
        // Get factory information
        console.log("\n=== Testing Factory Information ===");
        await bot.getFactoryInfo();
        
        // List all pools
        console.log("\n=== Testing Pool Listing ===");
        await bot.listAllPools();
        
        // Create a pool
        console.log("\n=== Testing Pool Creation ===");
        const poolAddress = await bot.createPool(TOKEN_A_ADDRESS, TOKEN_B_ADDRESS, 3000, 60);
        console.log("Created pool at:", poolAddress);
        
        // Get pool information
        console.log("\n=== Testing Pool Information ===");
        await bot.getPoolInfo(poolAddress);
        
        // Add liquidity
        console.log("\n=== Testing Liquidity Addition ===");
        await bot.addLiquidity(poolAddress, 1000);
        
        // Get balances and reserves
        console.log("\n=== Testing Balance Functions ===");
        await bot.getTotalBalance(poolAddress);
        await bot.getReserves(poolAddress);
        
        // List all pools again
        console.log("\n=== Testing Updated Pool Listing ===");
        await bot.listAllPools();
        
        console.log("\n=== All Tests Passed Successfully! ===");
        console.log("Your factory and bot are working correctly on Somnia Testnet!");
        
    } catch (error) {
        console.error("Bot test error:", error);
    }
}

main().catch(console.error); 