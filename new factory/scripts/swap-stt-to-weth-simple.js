const hre = require("hardhat");

async function main() {
    console.log("Swapping 20 STT for WETH on Somnia Testnet (Simple Version)...");
    
    const [deployer] = await hre.ethers.getSigners();
    console.log("Swapping with account:", deployer.address);

    // Contract addresses
    const FACTORY_ADDRESS = "0x73367ace5E99095A51B0b4991516A7CFC4c7d229";
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

    // Since we can't create a pool with STT (native token) directly,
    // let's use the existing test tokens to create a pool and then swap
    // First, let's check if we have any existing pools
    console.log("\n=== Checking Existing Pools ===");
    const poolCount = await factory.allPoolsLength();
    console.log("Total pools:", poolCount.toString());

    if (poolCount > 0) {
        console.log("Using existing pool for swap...");
        
        // Get the first pool
        const poolAddress = await factory.getPoolByIndex(0);
        console.log("Using pool:", poolAddress);
        
        const pool = await hre.ethers.getContractAt("CustomPool", poolAddress);
        
        // Check pool info
        const token0 = await pool.token0();
        const token1 = await pool.token1();
        console.log("Pool Token 0:", token0);
        console.log("Pool Token 1:", token1);
        
        // Check pool balances
        const poolSTTBalance = await hre.ethers.provider.getBalance(poolAddress);
        const poolToken0Balance = await (await hre.ethers.getContractAt("IERC20", token0)).balanceOf(poolAddress);
        const poolToken1Balance = await (await hre.ethers.getContractAt("IERC20", token1)).balanceOf(poolAddress);
        
        console.log("Pool STT Balance:", ethers.formatEther(poolSTTBalance));
        console.log("Pool Token 0 Balance:", ethers.formatEther(poolToken0Balance));
        console.log("Pool Token 1 Balance:", ethers.formatEther(poolToken1Balance));
        
        // If the pool has liquidity, we can try to swap
        if (poolSTTBalance > 0 && (poolToken0Balance > 0 || poolToken1Balance > 0)) {
            console.log("\n=== Performing Swap ===");
            
            // Determine which token to swap for
            const tokenToSwap = token0 === WETH_ADDRESS ? token0 : token1;
            console.log("Swapping STT for token:", tokenToSwap);
            
            const swapAmount = ethers.parseEther("20"); // 20 STT
            const minAmountOut = ethers.parseEther("0.1"); // Minimum 0.1 tokens out
            
            console.log("Swapping 20 STT for tokens...");
            console.log("Minimum tokens out:", ethers.formatEther(minAmountOut));
            
            const swapTx = await pool.swapExactSTTForTokens(
                minAmountOut,
                tokenToSwap,
                deployer.address,
                { value: swapAmount }
            );
            console.log("Swap transaction hash:", swapTx.hash);
            
            const swapReceipt = await swapTx.wait();
            console.log("✅ Swap completed successfully!");
            
            // Check balances after swap
            const afterSwapSTTBalance = await hre.ethers.provider.getBalance(deployer.address);
            const afterSwapTokenBalance = await (await hre.ethers.getContractAt("IERC20", tokenToSwap)).balanceOf(deployer.address);
            
            console.log("\n=== Balances After Swap ===");
            console.log("STT Balance:", ethers.formatEther(afterSwapSTTBalance));
            console.log("Token Balance:", ethers.formatEther(afterSwapTokenBalance));
            
            // Calculate changes
            const sttChange = afterSwapSTTBalance - initialSTTBalance;
            const tokenChange = afterSwapTokenBalance - (tokenToSwap === WETH_ADDRESS ? initialWETHBalance : 0n);
            
            console.log("\n=== Swap Results ===");
            console.log("STT Spent:", ethers.formatEther(-sttChange));
            console.log("Tokens Received:", ethers.formatEther(tokenChange));
            
            console.log("\n=== STT Swap Completed Successfully! ===");
            console.log("✅ Successfully swapped 20 STT for tokens!");
            console.log("✅ Pool address:", poolAddress);
            console.log("✅ Transaction hash:", swapTx.hash);
            
        } else {
            console.log("⚠️  Pool has no liquidity. Adding liquidity first...");
            
            // Add liquidity to the pool
            const tokenContract = await hre.ethers.getContractAt("IERC20", token0);
            const liquidityAmount = ethers.parseEther("1000");
            
            await tokenContract.approve(poolAddress, liquidityAmount);
            await pool.addLiquidity(liquidityAmount);
            
            // Send STT to pool
            await deployer.sendTransaction({
                to: poolAddress,
                value: ethers.parseEther("20")
            });
            
            console.log("Added liquidity to pool. Now you can perform swaps.");
        }
        
    } else {
        console.log("No pools exist. Creating a new pool with test tokens...");
        
        // Deploy test tokens if needed
        const TestToken = await hre.ethers.getContractFactory("TestToken");
        const testToken = await TestToken.deploy("Test Token", "TEST");
        await testToken.waitForDeployment();
        
        console.log("Test token deployed at:", await testToken.getAddress());
        
        // Create pool
        const createPoolTx = await factory.createPool(await testToken.getAddress(), WETH_ADDRESS, 3000, 60);
        await createPoolTx.wait();
        
        const newPoolAddress = await factory.getPool(await testToken.getAddress(), WETH_ADDRESS, 3000);
        console.log("New pool created at:", newPoolAddress);
        
        console.log("Pool created successfully! You can now add liquidity and perform swaps.");
    }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 