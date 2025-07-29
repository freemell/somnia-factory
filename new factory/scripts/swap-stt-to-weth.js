const hre = require("hardhat");

async function main() {
    console.log("Swapping 20 STT for WETH on Somnia Testnet...");
    
    const [deployer] = await hre.ethers.getSigners();
    console.log("Swapping with account:", deployer.address);

    // Contract addresses
    const FACTORY_ADDRESS = "0x73367ace5E99095A51B0b4991516A7CFC4c7d229";
    const SWAP_ROUTER_ADDRESS = "0xE94de02e52Eaf9F0f6Bf7f16E4927FcBc2c09bC7";
    const WETH_ADDRESS = "0xd2480162Aa7F02Ead7BF4C127465446150D58452";

    // Get contract instances
    const factory = await hre.ethers.getContractAt("Factory", FACTORY_ADDRESS);
    const weth = await hre.ethers.getContractAt("IERC20", WETH_ADDRESS);

    console.log("\n=== Contract Addresses ===");
    console.log("Factory Address:", FACTORY_ADDRESS);
    console.log("WETH Address:", WETH_ADDRESS);

    // Check initial balances
    const initialSTTBalance = await hre.ethers.provider.getBalance(deployer.address);
    const initialWETHBalance = await weth.balanceOf(deployer.address);

    console.log("\n=== Initial Balances ===");
    console.log("STT Balance:", ethers.formatEther(initialSTTBalance));
    console.log("WETH Balance:", ethers.formatEther(initialWETHBalance));

    // Check if pool exists for STT/WETH pair
    console.log("\n=== Checking Pool ===");
    const poolAddress = await factory.getPool(ethers.ZeroAddress, WETH_ADDRESS, 3000);
    console.log("STT/WETH Pool Address:", poolAddress);

    if (poolAddress === ethers.ZeroAddress) {
        console.log("Pool doesn't exist. Creating STT/WETH pool...");
        
        // Create pool for STT/WETH pair
        const createPoolTx = await factory.createPool(ethers.ZeroAddress, WETH_ADDRESS, 3000, 60);
        await createPoolTx.wait();
        
        const newPoolAddress = await factory.getPool(ethers.ZeroAddress, WETH_ADDRESS, 3000);
        console.log("New STT/WETH Pool created at:", newPoolAddress);
    } else {
        console.log("STT/WETH Pool already exists");
    }

    // Get the pool instance
    const pool = await hre.ethers.getContractAt("CustomPool", poolAddress !== ethers.ZeroAddress ? poolAddress : await factory.getPool(ethers.ZeroAddress, WETH_ADDRESS, 3000));

    // Check pool liquidity
    console.log("\n=== Checking Pool Liquidity ===");
    const poolSTTBalance = await hre.ethers.provider.getBalance(pool.address);
    const poolWETHBalance = await weth.balanceOf(pool.address);
    
    console.log("Pool STT Balance:", ethers.formatEther(poolSTTBalance));
    console.log("Pool WETH Balance:", ethers.formatEther(poolWETHBalance));

    if (poolSTTBalance === 0n || poolWETHBalance === 0n) {
        console.log("⚠️  Pool has no liquidity. Adding some liquidity first...");
        
        // Add some liquidity to the pool
        const liquidityAmount = ethers.parseEther("10"); // 10 WETH
        
        // Approve WETH for the pool
        await weth.approve(pool.address, liquidityAmount);
        console.log("WETH approval completed");
        
        // Add liquidity
        await pool.addLiquidity(liquidityAmount);
        console.log("Added liquidity: 10 WETH");
        
        // Send some STT to the pool
        const sttLiquidity = ethers.parseEther("20"); // 20 STT
        await deployer.sendTransaction({
            to: pool.address,
            value: sttLiquidity
        });
        console.log("Sent 20 STT to pool for liquidity");
        
        // Check updated pool balances
        const newPoolSTTBalance = await hre.ethers.provider.getBalance(pool.address);
        const newPoolWETHBalance = await weth.balanceOf(pool.address);
        console.log("Updated Pool STT Balance:", ethers.formatEther(newPoolSTTBalance));
        console.log("Updated Pool WETH Balance:", ethers.formatEther(newPoolWETHBalance));
    }

    // Now perform the swap: 20 STT for WETH
    console.log("\n=== Performing STT to WETH Swap ===");
    const swapAmount = ethers.parseEther("20"); // 20 STT
    const minAmountOut = ethers.parseEther("0.1"); // Minimum 0.1 WETH out (adjust as needed)
    
    console.log("Swapping 20 STT for WETH...");
    console.log("Minimum WETH out:", ethers.formatEther(minAmountOut));
    
    const swapTx = await pool.swapExactSTTForTokens(
        minAmountOut,
        WETH_ADDRESS,
        deployer.address,
        { value: swapAmount }
    );
    console.log("Swap transaction hash:", swapTx.hash);
    
    const swapReceipt = await swapTx.wait();
    console.log("✅ Swap completed successfully!");

    // Check balances after swap
    const afterSwapSTTBalance = await hre.ethers.provider.getBalance(deployer.address);
    const afterSwapWETHBalance = await weth.balanceOf(deployer.address);

    console.log("\n=== Balances After Swap ===");
    console.log("STT Balance:", ethers.formatEther(afterSwapSTTBalance));
    console.log("WETH Balance:", ethers.formatEther(afterSwapWETHBalance));

    // Calculate changes
    const sttChange = afterSwapSTTBalance - initialSTTBalance;
    const wethChange = afterSwapWETHBalance - initialWETHBalance;

    console.log("\n=== Swap Results ===");
    console.log("STT Spent:", ethers.formatEther(-sttChange));
    console.log("WETH Received:", ethers.formatEther(wethChange));
    console.log("Exchange Rate: 1 STT =", ethers.formatEther(wethChange * 1000000000000000000n / (-sttChange)), "WETH");

    // Check pool balances after swap
    const afterSwapPoolSTTBalance = await hre.ethers.provider.getBalance(pool.address);
    const afterSwapPoolWETHBalance = await weth.balanceOf(pool.address);

    console.log("\n=== Pool Balances After Swap ===");
    console.log("Pool STT Balance:", ethers.formatEther(afterSwapPoolSTTBalance));
    console.log("Pool WETH Balance:", ethers.formatEther(afterSwapPoolWETHBalance));

    console.log("\n=== STT to WETH Swap Completed Successfully! ===");
    console.log("✅ Successfully swapped 20 STT for WETH!");
    console.log("✅ Pool address:", pool.address);
    console.log("✅ Transaction hash:", swapTx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 