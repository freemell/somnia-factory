require('dotenv').config();
const { ethers } = require('hardhat');
const CUSTOM_FACTORY_ADDRESS = '0x0C2bBdd5C86C874BB37120121468D2ba9726FAd7';
const STT_ADDRESS = '0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7';
const INSOM_ADDRESS = '0x0C726E446865FFb19Cc13f21aBf0F515106C9662';
const FEE_TIER = 3000;
const ABI = require('../utils/abi.json').CustomFactory;

async function main() {
  const [signer] = await ethers.getSigners();
  const factory = new ethers.Contract(CUSTOM_FACTORY_ADDRESS, ABI, signer);
  const pool = await factory.getPool(STT_ADDRESS, INSOM_ADDRESS, FEE_TIER);
  console.log('Pool address:', pool);
  if (pool === ethers.ZeroAddress) {
    console.log('No pool exists for this pair and fee tier.');
  } else {
    console.log('Pool exists!');
  }
}
main(); 