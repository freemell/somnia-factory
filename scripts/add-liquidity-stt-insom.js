// Add liquidity to INSOM/STT pool using wallet 0x35DaDAb2bb21A6d4e20beC3F603B8426Dc124004
require('dotenv').config();
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL;
const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

const INSOMIACS_ABI = require('../utils/abi.json').Insomiacs;
const CUSTOM_FACTORY_ABI = [
  "function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool)",
  "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"
];
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function mint(address,uint256)"
];
const NONFUNGIBLE_POSITION_MANAGER_ABI = [
  "function mint((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256)) returns (uint256,uint128,uint256,uint256)",
  "event IncreaseLiquidity(uint256 indexed tokenId,uint128 liquidity,uint256 amount0,uint256 amount1)"
];

const INSOM_ADDRESS = '0x0C726E446865FFb19Cc13f21aBf0F515106C9662';
const STT_ADDRESS = '0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7';
const CUSTOM_FACTORY_ADDRESS = '0x0C2bBdd5C86C874BB37120121468D2ba9726FAd7';
const NONFUNGIBLE_POSITION_MANAGER_ADDRESS = '0x37A4950b4ea0C46596404895c5027B088B0e70e7';
const FEE_TIER = 3000;
const INSOM_AMOUNT = ethers.parseEther('100');
const STT_AMOUNT = ethers.parseEther('100');
const OWNER_ADDRESS = signer.address;

async function main() {
  // 1. Check INSOM balance and mint if needed
  const insomAddress = INSOM_ADDRESS;
  const insomToken = new ethers.Contract(insomAddress, INSOMIACS_ABI, signer);
  let balance = await insomToken.balanceOf(OWNER_ADDRESS);
  if (balance < INSOM_AMOUNT) {
    console.log(`Not enough INSOM in wallet. Please ask the Insomiacs owner to mint more to ${OWNER_ADDRESS}.`);
    return;
  }
  console.log(`INSOM balance: ${ethers.formatEther(balance)}`);

  // 2. Create pool if it doesn't exist
  const customFactory = new ethers.Contract(CUSTOM_FACTORY_ADDRESS, CUSTOM_FACTORY_ABI, signer);
  let poolAddress = await customFactory.getPool(insomAddress, STT_ADDRESS, FEE_TIER);
  if (poolAddress === ethers.ZeroAddress) {
    console.log('Creating INSOM/STT pool...');
    const createPoolTx = await customFactory.createPool(insomAddress, STT_ADDRESS, FEE_TIER);
    await createPoolTx.wait();
    poolAddress = await customFactory.getPool(insomAddress, STT_ADDRESS, FEE_TIER);
    console.log(`Pool created at: ${poolAddress}`);
  } else {
    console.log(`Pool already exists at: ${poolAddress}`);
  }

  // 3. Approve tokens
  const sttToken = new ethers.Contract(STT_ADDRESS, ERC20_ABI, signer);
  const approveInsomTx = await insomToken.approve(NONFUNGIBLE_POSITION_MANAGER_ADDRESS, INSOM_AMOUNT);
  await approveInsomTx.wait();
  const approveSttTx = await sttToken.approve(NONFUNGIBLE_POSITION_MANAGER_ADDRESS, STT_AMOUNT);
  await approveSttTx.wait();
  console.log('Tokens approved for NonfungiblePositionManager.');

  // 4. Add liquidity
  const nonfungiblePositionManager = new ethers.Contract(NONFUNGIBLE_POSITION_MANAGER_ADDRESS, NONFUNGIBLE_POSITION_MANAGER_ABI, signer);
  const tickLower = -887220;
  const tickUpper = 887220;
  const deadline = Math.floor(Date.now() / 1000) + 3600;
  const mintParams = {
    token0: insomAddress < STT_ADDRESS ? insomAddress : STT_ADDRESS,
    token1: insomAddress < STT_ADDRESS ? STT_ADDRESS : insomAddress,
    fee: FEE_TIER,
    tickLower,
    tickUpper,
    amount0Desired: insomAddress < STT_ADDRESS ? INSOM_AMOUNT : STT_AMOUNT,
    amount1Desired: insomAddress < STT_ADDRESS ? STT_AMOUNT : INSOM_AMOUNT,
    amount0Min: 0,
    amount1Min: 0,
    recipient: OWNER_ADDRESS,
    deadline
  };
  const mintTx = await nonfungiblePositionManager.mint(mintParams);
  const mintReceipt = await mintTx.wait();
  let tokenId = null;
  for (const log of mintReceipt.logs) {
    try {
      const parsed = nonfungiblePositionManager.interface.parseLog(log);
      if (parsed.name === 'IncreaseLiquidity') {
        tokenId = parsed.args.tokenId;
        break;
      }
    } catch {}
  }
  console.log(`Liquidity position created. TokenId: ${tokenId}`);

  // 5. Save results
  const result = {
    poolAddress,
    insomAddress,
    sttAddress: STT_ADDRESS,
    liquidityTokenId: tokenId,
    owner: OWNER_ADDRESS,
    amounts: {
      insom: ethers.formatEther(INSOM_AMOUNT),
      stt: ethers.formatEther(STT_AMOUNT)
    }
  };
  fs.writeFileSync(path.join(__dirname, '../add-liquidity-stt-insom.json'), JSON.stringify(result, null, 2));
  console.log('Liquidity details saved to add-liquidity-stt-insom.json');
}

main().catch(console.error); 