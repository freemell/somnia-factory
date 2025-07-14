require('dotenv').config();
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

const OWNER_ADDRESS = '0x35DaDAb2bb21A6d4e20beC3F603B8426Dc124004';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL;
const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

const CUSTOM_FACTORY_ADDRESS = '0x0C2bBdd5C86C874BB37120121468D2ba9726FAd7';
const INSOM_ADDRESS = '0x0C726E446865FFb19Cc13f21aBf0F515106C9662';
const STT_ADDRESS = '0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7';
const NONFUNGIBLE_POSITION_MANAGER_ADDRESS = '0x37A4950b4ea0C46596404895c5027B088B0e70e7';
const FEE_TIER = 3000;
const INSOM_AMOUNT = ethers.parseEther('100');
const STT_AMOUNT = ethers.parseEther('100');

// Load ABIs with debug checks
const ABI = require('../utils/abi.json');
console.log('ABI keys:', Object.keys(ABI));
function getAbiOrThrow(key) {
  const arr = ABI[key];
  if (!Array.isArray(arr)) {
    throw new Error(`ABI for ${key} is not an array! Check your abi.json.`);
  }
  return arr;
}
const CustomFactoryABI = getAbiOrThrow('CustomFactory');
const CustomPoolDeployerABI = getAbiOrThrow('CustomPoolDeployer');
const TestPoolABI = getAbiOrThrow('TestPool');
const InsomiacsABI = getAbiOrThrow('Insomiacs');
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)"
];
const NonfungiblePositionManagerABI = [
  "function mint((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256)) returns (uint256,uint128,uint256,uint256)",
  "event IncreaseLiquidity(uint256 indexed tokenId,uint128 liquidity,uint256 amount0,uint256 amount1)"
];

async function main() {
  // 1. Verify signer
  if (signer.address.toLowerCase() !== OWNER_ADDRESS.toLowerCase()) {
    throw new Error(`Signer is not the expected owner: ${OWNER_ADDRESS}`);
  }
  console.log('Using owner wallet:', signer.address);

  // 2. Get CustomPoolDeployer address
  let poolDeployerAddress;
  try {
    const deployment = JSON.parse(fs.readFileSync(path.join(__dirname, '../deployment-info.json')));
    poolDeployerAddress = deployment.contracts.customPoolDeployer;
  } catch {
    throw new Error('CustomPoolDeployer address required. Please provide it in deployment-info.json.');
  }
  if (!poolDeployerAddress) throw new Error('CustomPoolDeployer address required.');
  const poolDeployer = new ethers.Contract(poolDeployerAddress, CustomPoolDeployerABI, signer);

  // 3. Check and set poolBytecode
  let bytecode = await poolDeployer.poolBytecode();
  if (!bytecode || bytecode === '0x') {
    console.log('Setting pool bytecode...');
    const TestPool = await ethers.getContractFactory('TestPool');
    const testPoolBytecode = TestPool.bytecode;
    const tx = await poolDeployer.setPoolBytecode(testPoolBytecode);
    await tx.wait();
    console.log('Pool bytecode set.');
  } else {
    console.log('Pool bytecode already set.');
  }

  // 4. Check and set factory
  let factoryAddr = await poolDeployer.factory();
  if (factoryAddr.toLowerCase() !== CUSTOM_FACTORY_ADDRESS.toLowerCase()) {
    console.log('Setting factory address...');
    const tx = await poolDeployer.setFactory(CUSTOM_FACTORY_ADDRESS);
    await tx.wait();
    console.log('Factory address set.');
  } else {
    console.log('Factory already linked.');
  }

  // 5. Create pool if not exists
  const factory = new ethers.Contract(CUSTOM_FACTORY_ADDRESS, CustomFactoryABI, signer);
  let pool = await factory.getPool(INSOM_ADDRESS, STT_ADDRESS, FEE_TIER);
  if (pool === ethers.ZeroAddress) {
    console.log('Creating INSOM/STT pool...');
    const tx = await factory.createPool(INSOM_ADDRESS, STT_ADDRESS, FEE_TIER);
    await tx.wait();
    pool = await factory.getPool(INSOM_ADDRESS, STT_ADDRESS, FEE_TIER);
    console.log('Pool created at:', pool);
  } else {
    console.log('Pool already exists at:', pool);
  }

  // 6. Approve tokens
  const insom = new ethers.Contract(INSOM_ADDRESS, ERC20_ABI, signer);
  const stt = new ethers.Contract(STT_ADDRESS, ERC20_ABI, signer);
  await (await insom.approve(NONFUNGIBLE_POSITION_MANAGER_ADDRESS, INSOM_AMOUNT)).wait();
  await (await stt.approve(NONFUNGIBLE_POSITION_MANAGER_ADDRESS, STT_AMOUNT)).wait();
  console.log('Tokens approved.');

  // 7. Add liquidity
  const npm = new ethers.Contract(NONFUNGIBLE_POSITION_MANAGER_ADDRESS, NonfungiblePositionManagerABI, signer);
  const tickLower = -887220;
  const tickUpper = 887220;
  const deadline = Math.floor(Date.now() / 1000) + 3600;
  const mintParams = {
    token0: INSOM_ADDRESS < STT_ADDRESS ? INSOM_ADDRESS : STT_ADDRESS,
    token1: INSOM_ADDRESS < STT_ADDRESS ? STT_ADDRESS : INSOM_ADDRESS,
    fee: FEE_TIER,
    tickLower,
    tickUpper,
    amount0Desired: INSOM_ADDRESS < STT_ADDRESS ? INSOM_AMOUNT : STT_AMOUNT,
    amount1Desired: INSOM_ADDRESS < STT_ADDRESS ? STT_AMOUNT : INSOM_AMOUNT,
    amount0Min: 0,
    amount1Min: 0,
    recipient: OWNER_ADDRESS,
    deadline
  };
  const mintTx = await npm.mint(mintParams);
  const mintReceipt = await mintTx.wait();
  let tokenId = null;
  for (const log of mintReceipt.logs) {
    try {
      const parsed = npm.interface.parseLog(log);
      if (parsed.name === 'IncreaseLiquidity') {
        tokenId = parsed.args.tokenId;
        break;
      }
    } catch {}
  }
  console.log('Liquidity position created. TokenId:', tokenId);

  // 8. Save deployment info
  const result = {
    pool,
    insomAddress: INSOM_ADDRESS,
    sttAddress: STT_ADDRESS,
    liquidityTokenId: tokenId,
    owner: OWNER_ADDRESS,
    amounts: {
      insom: ethers.formatEther(INSOM_AMOUNT),
      stt: ethers.formatEther(STT_AMOUNT)
    }
  };
  fs.writeFileSync(path.join(__dirname, '../configure-and-add-liquidity.json'), JSON.stringify(result, null, 2));
  console.log('Deployment info saved to configure-and-add-liquidity.json');
}

main().catch(console.error); 