const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Contract addresses on Somnia Testnet
// NOTE: Update these if deploying to a different network
const CUSTOM_FACTORY_ADDRESS = "0x0C2bBdd5C86C874BB37120121468D2ba9726FAd7";
const STT_TOKEN_ADDRESS = "0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7";
const NONFUNGIBLE_POSITION_MANAGER_ADDRESS = "0x37A4950b4ea0C46596404895c5027B088B0e70e7";
const QUICKSWAP_ROUTER_ADDRESS = "0xE94de02e52Eaf9F0f6Bf7f16E4927FcBc2c09bC7";

// Deployment configuration
const OWNER_ADDRESS = "0x14FD085974c62315fd5a02Eb6DB3ba950644B70b";
const PRIVATE_KEY = "e0ca98f46499e6813ace8282687dc6c36aa026356f02bb922ab763cd0ed4dd75";
const FEE_TIER = 3000; // 0.3%
const INSOM_AMOUNT = ethers.parseEther("100"); // 100 INSOM
const STT_AMOUNT = ethers.parseEther("100"); // 100 STT

// ABI for NonfungiblePositionManager (simplified for minting)
const NONFUNGIBLE_POSITION_MANAGER_ABI = [
    "function mint((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
    "function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)"
];

// ABI for CustomFactory (simplified)
const CUSTOM_FACTORY_ABI = [
    "function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool)",
    "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"
];

async function main() {
    try {
        console.log("🚀 Starting Insomiacs token deployment on Somnia Testnet...");
        
        // Get the signer
        const [deployer] = await ethers.getSigners();
        console.log(`📝 Deploying contracts with account: ${deployer.address}`);
        console.log(`💰 Account balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
        
        // 1. Deploy Insomiacs Token
        console.log("\n📦 Deploying Insomiacs token...");
        const Insomiacs = await ethers.getContractFactory("Insomiacs");
        const insomiacsToken = await Insomiacs.deploy(OWNER_ADDRESS);
        await insomiacsToken.waitForDeployment();
        const insomiacsAddress = await insomiacsToken.getAddress();
        
        console.log(`✅ Insomiacs token deployed to: ${insomiacsAddress}`);
        console.log(`📊 Token name: ${await insomiacsToken.name()}`);
        console.log(`📊 Token symbol: ${await insomiacsToken.symbol()}`);
        console.log(`📊 Token decimals: ${await insomiacsToken.decimals()}`);
        console.log(`📊 Total supply: ${ethers.formatEther(await insomiacsToken.totalSupply())} INSOM`);
        console.log(`👑 Owner: ${await insomiacsToken.owner()}`);
        
        // 2. Create liquidity pool using CustomFactory
        console.log("\n🏭 Creating liquidity pool using CustomFactory...");
        const customFactory = new ethers.Contract(CUSTOM_FACTORY_ADDRESS, CUSTOM_FACTORY_ABI, deployer);
        
        // Check if pool already exists
        let poolAddress = await customFactory.getPool(insomiacsAddress, STT_TOKEN_ADDRESS, FEE_TIER);
        
        if (poolAddress === ethers.ZeroAddress) {
            console.log("🆕 Pool doesn't exist, creating new pool...");
            const createPoolTx = await customFactory.createPool(insomiacsAddress, STT_TOKEN_ADDRESS, FEE_TIER);
            await createPoolTx.wait();
            
            // Get the pool address after creation
            poolAddress = await customFactory.getPool(insomiacsAddress, STT_TOKEN_ADDRESS, FEE_TIER);
            console.log(`✅ Pool created at: ${poolAddress}`);
        } else {
            console.log(`✅ Pool already exists at: ${poolAddress}`);
        }
        
        // 3. Approve tokens for NonfungiblePositionManager
        console.log("\n✅ Approving tokens for liquidity provision...");
        
        // Approve INSOM tokens
        const approveInsomTx = await insomiacsToken.approve(NONFUNGIBLE_POSITION_MANAGER_ADDRESS, INSOM_AMOUNT);
        await approveInsomTx.wait();
        console.log(`✅ Approved ${ethers.formatEther(INSOM_AMOUNT)} INSOM for NonfungiblePositionManager`);
        
        // Approve STT tokens (need to get STT token contract)
        const STT_ABI = ["function approve(address spender, uint256 amount) external returns (bool)"];
        const sttToken = new ethers.Contract(STT_TOKEN_ADDRESS, STT_ABI, deployer);
        const approveSTTTx = await sttToken.approve(NONFUNGIBLE_POSITION_MANAGER_ADDRESS, STT_AMOUNT);
        await approveSTTTx.wait();
        console.log(`✅ Approved ${ethers.formatEther(STT_AMOUNT)} STT for NonfungiblePositionManager`);
        
        // 4. Add liquidity using NonfungiblePositionManager
        console.log("\n💧 Adding liquidity to the pool...");
        const nonfungiblePositionManager = new ethers.Contract(
            NONFUNGIBLE_POSITION_MANAGER_ADDRESS, 
            NONFUNGIBLE_POSITION_MANAGER_ABI, 
            deployer
        );
        
        // Calculate tick range for 0.3% fee tier
        // For simplicity, we'll use a wide range around current price
        const tickLower = -887220; // Wide range lower tick
        const tickUpper = 887220;  // Wide range upper tick
        
        const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
        
        const mintParams = {
            token0: insomiacsAddress < STT_TOKEN_ADDRESS ? insomiacsAddress : STT_TOKEN_ADDRESS,
            token1: insomiacsAddress < STT_TOKEN_ADDRESS ? STT_TOKEN_ADDRESS : insomiacsAddress,
            fee: FEE_TIER,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0Desired: insomiacsAddress < STT_TOKEN_ADDRESS ? INSOM_AMOUNT : STT_AMOUNT,
            amount1Desired: insomiacsAddress < STT_TOKEN_ADDRESS ? STT_AMOUNT : INSOM_AMOUNT,
            amount0Min: 0,
            amount1Min: 0,
            recipient: deployer.address,
            deadline: deadline
        };
        
        console.log("📋 Minting liquidity position with parameters:");
        console.log(`   Token0: ${mintParams.token0}`);
        console.log(`   Token1: ${mintParams.token1}`);
        console.log(`   Fee: ${mintParams.fee}`);
        console.log(`   Tick Lower: ${mintParams.tickLower}`);
        console.log(`   Tick Upper: ${mintParams.tickUpper}`);
        console.log(`   Amount0 Desired: ${ethers.formatEther(mintParams.amount0Desired)}`);
        console.log(`   Amount1 Desired: ${ethers.formatEther(mintParams.amount1Desired)}`);
        
        const mintTx = await nonfungiblePositionManager.mint(mintParams);
        const mintReceipt = await mintTx.wait();
        
        // Extract tokenId from the event
        const mintEvent = mintReceipt.logs.find(log => {
            try {
                const parsed = nonfungiblePositionManager.interface.parseLog(log);
                return parsed.name === "IncreaseLiquidity";
            } catch {
                return false;
            }
        });
        
        if (mintEvent) {
            const parsedEvent = nonfungiblePositionManager.interface.parseLog(mintEvent);
            const tokenId = parsedEvent.args.tokenId;
            console.log(`✅ Liquidity position created with tokenId: ${tokenId}`);
        } else {
            console.log("✅ Liquidity position created successfully");
        }
        
        // 5. Save deployment information
        const deploymentInfo = {
            network: "Somnia Testnet",
            chainId: 50312,
            deploymentDate: new Date().toISOString(),
            contracts: {
                insomiacsToken: {
                    address: insomiacsAddress,
                    name: "Insomiacs",
                    symbol: "INSOM",
                    decimals: 18,
                    totalSupply: ethers.formatEther(await insomiacsToken.totalSupply()),
                    owner: await insomiacsToken.owner()
                },
                customFactory: {
                    address: CUSTOM_FACTORY_ADDRESS
                },
                sttToken: {
                    address: STT_TOKEN_ADDRESS
                },
                pool: {
                    address: poolAddress,
                    token0: mintParams.token0,
                    token1: mintParams.token1,
                    fee: FEE_TIER
                },
                nonfungiblePositionManager: {
                    address: NONFUNGIBLE_POSITION_MANAGER_ADDRESS
                },
                quickswapRouter: {
                    address: QUICKSWAP_ROUTER_ADDRESS
                }
            },
            deployment: {
                deployer: deployer.address,
                owner: OWNER_ADDRESS,
                initialLiquidity: {
                    insom: ethers.formatEther(INSOM_AMOUNT),
                    stt: ethers.formatEther(STT_AMOUNT)
                }
            }
        };
        
        const deploymentPath = path.join(__dirname, "..", "deployment-insomiacs.json");
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
        console.log(`\n💾 Deployment information saved to: ${deploymentPath}`);
        
        // 6. Display final summary
        console.log("\n🎉 Insomiacs token deployment completed successfully!");
        console.log("=" .repeat(60));
        console.log("📋 DEPLOYMENT SUMMARY:");
        console.log("=" .repeat(60));
        console.log(`🏷️  Token Name: Insomiacs`);
        console.log(`🏷️  Token Symbol: INSOM`);
        console.log(`📍 Token Address: ${insomiacsAddress}`);
        console.log(`👑 Owner: ${OWNER_ADDRESS}`);
        console.log(`💰 Total Supply: ${ethers.formatEther(await insomiacsToken.totalSupply())} INSOM`);
        console.log(`🏭 Factory: ${CUSTOM_FACTORY_ADDRESS}`);
        console.log(`🏊 Pool Address: ${poolAddress}`);
        console.log(`💧 Initial Liquidity: ${ethers.formatEther(INSOM_AMOUNT)} INSOM + ${ethers.formatEther(STT_AMOUNT)} STT`);
        console.log(`🔗 Fee Tier: ${FEE_TIER} (0.3%)`);
        console.log("=" .repeat(60));
        console.log("\n🔗 QuickSwap Somnia Testnet: https://quickswap.exchange/");
        console.log("🔍 Shannon Explorer: https://shannon-explorer.somnia.network/");
        console.log("📄 Deployment file: deployment-insomiacs.json");
    } catch (error) {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    }); 