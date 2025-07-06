require('dotenv').config();
const { JsonRpcProvider, Contract } = require('ethers');
const factoryAbi = require('./abis/factory.json');

const provider = new JsonRpcProvider(process.env.RPC_URL);
const factory = new Contract(process.env.DEX_FACTORY_ADDRESS, factoryAbi, provider);

async function checkPair() {
  const WSTT = process.env.WETH_ADDRESS;
  const TOKEN = '0xd2480162Aa7F02Ead7BF4C127465446150D58452'; // replace with your token
  const pair1 = await factory.getPair(WSTT, TOKEN);
  const pair2 = await factory.getPair(TOKEN, WSTT);
  console.log('Pair (WSTT, TOKEN):', pair1);
  console.log('Pair (TOKEN, WSTT):', pair2);
}
checkPair();