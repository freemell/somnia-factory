const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../db.json');

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// Initialize user in db.json with actual balances
function initUser(chatId, stt, insom) {
  const db = loadDB();
  if (!db[chatId]) {
    db[chatId] = {
      balance: { stt: Number(stt), insom: Number(insom) },
      positions: { insom: 0 }
    };
    saveDB(db);
  }
}

function getUserData(chatId) {
  const db = loadDB();
  return db[chatId] || { balance: { stt: 0, insom: 0 }, positions: { insom: 0 } };
}

function setUserBalance(chatId, stt, insom) {
  const db = loadDB();
  if (!db[chatId]) db[chatId] = { balance: { stt: 0, insom: 0 }, positions: { insom: 0 } };
  db[chatId].balance = { stt, insom };
  saveDB(db);
}

function updateUserPosition(chatId, tokenSymbol, amount) {
  const db = loadDB();
  if (!db[chatId]) db[chatId] = { balance: { stt: 0, insom: 0 }, positions: {} };
  if (!db[chatId].positions) db[chatId].positions = {};
  db[chatId].positions[tokenSymbol.toLowerCase()] = amount;
  saveDB(db);
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);
console.log('Supabase client initialized. URL:', process.env.SUPABASE_URL ? 'Loaded' : 'MISSING!');

// User management
async function createUser(userId, username) {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        user_id: userId,
        username: username,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      if (error.code === '42P01') {
        console.error('Users table does not exist. Please run: node db/init-db.js');
        throw new Error('Database tables not initialized. Please contact support.');
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

async function getUser(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === '42P01') {
        console.error('Users table does not exist. Please run: node db/init-db.js');
        return null;
      }
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

// Wallet management
async function createWallet(userId, address, privateKey) {
  try {
    console.log(`[DB] Creating wallet for user ${userId}`);
    console.log(`[DB] Encrypted key length: ${privateKey.length}`);
    console.log(`[DB] Encrypted key format: ${privateKey.substring(0, 50)}...`);
    
    const { data, error } = await supabase
      .from('wallets')
      .insert({
        user_id: userId,
        address: address,
        private_key: privateKey,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      if (error.code === '42P01') {
        console.error('Wallets table does not exist. Please run: node db/init-db.js');
        throw new Error('Database tables not initialized. Please contact support.');
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error creating wallet:', error);
    throw error;
  }
}

async function getWallet(userId) {
  try {
    console.log(`[DB] Attempting to get wallet for user_id: ${userId}`);
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error(`[DB] Supabase error getting wallet for user_id ${userId}:`, JSON.stringify(error, null, 2));
      if (error.code === '42P01') {
        console.error('Wallets table does not exist. Please run: node db/init-db.js');
        return null;
      }
      if (error.code === 'PGRST116') {
        console.log(`[DB] No wallet found for user_id ${userId} (PGRST116). This is a new user.`);
        // No rows returned
        return null;
      }
      throw error;
    }
    console.log(`[DB] Supabase data for user_id ${userId}:`, data ? `Wallet found with address ${data.address}` : 'No data');
    
    if (data && data.private_key) {
      console.log(`[DB] Retrieved encrypted key length: ${data.private_key.length}`);
      console.log(`[DB] Retrieved encrypted key format: ${data.private_key.substring(0, 50)}...`);
    }
    
    return data;
  } catch (error) {
    console.error(`[DB] Outer catch error in getWallet for user_id ${userId}:`, error);
    return null;
  }
}

// Trade history
async function saveTrade(tradeData) {
  try {
    const { data, error } = await supabase
      .from('trades')
      .insert({
        ...tradeData,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      if (error.code === '42P01') {
        console.error('Trades table does not exist. Please run: node db/init-db.js');
        return null;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error saving trade:', error);
    return null;
  }
}

async function getTradeHistory(userId, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (error.code === '42P01') {
        console.error('Trades table does not exist. Please run: node db/init-db.js');
        return [];
      }
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error getting trade history:', error);
    return [];
  }
}

// Limit orders
async function saveLimitOrder(orderData) {
  try {
    const { data, error } = await supabase
      .from('limit_orders')
      .insert({
        ...orderData,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      if (error.code === '42P01') {
        console.error('Limit orders table does not exist. Please run: node db/init-db.js');
        return null;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error saving limit order:', error);
    return null;
  }
}

async function getLimitOrders(userId) {
  try {
    const { data, error } = await supabase
      .from('limit_orders')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        console.error('Limit orders table does not exist. Please run: node db/init-db.js');
        return [];
      }
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error getting limit orders:', error);
    return [];
  }
}

async function updateLimitOrder(orderId, updates) {
  try {
    const { data, error } = await supabase
      .from('limit_orders')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      if (error.code === '42P01') {
        console.error('Limit orders table does not exist. Please run: node db/init-db.js');
        return null;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error updating limit order:', error);
    return null;
  }
}

// Bridge transactions
async function saveBridgeTransaction(bridgeData) {
  try {
    const { data, error } = await supabase
      .from('bridge_transactions')
      .insert({
        ...bridgeData,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      if (error.code === '42P01') {
        console.error('Bridge transactions table does not exist. Please run: node db/init-db.js');
        return null;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error saving bridge transaction:', error);
    return null;
  }
}

async function getBridgeTransactions(userId) {
  try {
    const { data, error } = await supabase
      .from('bridge_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        console.error('Bridge transactions table does not exist. Please run: node db/init-db.js');
        return [];
      }
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error getting bridge transactions:', error);
    return [];
  }
}

async function updateBridgeTransaction(transactionId, updates) {
  try {
    const { data, error } = await supabase
      .from('bridge_transactions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (error) {
      if (error.code === '42P01') {
        console.error('Bridge transactions table does not exist. Please run: node db/init-db.js');
        return null;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error updating bridge transaction:', error);
    return null;
  }
}

// Alerts
async function createAlert(userId, alertData) {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .insert({
        user_id: userId,
        ...alertData,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      if (error.code === '42P01') {
        console.error('Alerts table does not exist. Please run: node db/init-db.js');
        return null;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error creating alert:', error);
    return null;
  }
}

async function getAlerts(userId) {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        console.error('Alerts table does not exist. Please run: node db/init-db.js');
        return [];
      }
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error getting alerts:', error);
    return [];
  }
}

// User settings
async function saveUserSettings(userId, settings) {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      if (error.code === '42P01') {
        console.error('User settings table does not exist. Please run: node db/init-db.js');
        return null;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error saving user settings:', error);
    return null;
  }
}

async function getUserSettings(userId) {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === '42P01') {
        console.error('User settings table does not exist. Please run: node db/init-db.js');
        return null;
      }
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error getting user settings:', error);
    return null;
  }
}

// Watchlist functions
async function addTokenToWatchlist(userId, tokenAddress) {
  try {
    const { error } = await supabase
      .from('watchlist')
      .insert({ user_id: userId, token_address: tokenAddress, created_at: new Date().toISOString() });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error adding token to watchlist:', error);
    return { success: false, error };
  }
}

async function removeTokenFromWatchlist(userId, tokenAddress) {
  try {
    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('user_id', userId)
      .eq('token_address', tokenAddress);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error removing token from watchlist:', error);
    return { success: false, error };
  }
}

async function getWatchlist(userId) {
  try {
    const { data, error } = await supabase
      .from('watchlist')
      .select('token_address')
      .eq('user_id', userId);
    if (error) throw error;
    return data.map(row => row.token_address);
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    return [];
  }
}

// --- FAKE SWAP HELPERS ---

// Get user's fake STT balance (from user_settings, or default to 100)
async function getFakeSTTBalance(userId) {
  const settings = await getUserSettings(userId);
  if (settings && settings.fake_stt_balance !== undefined) {
    return Number(settings.fake_stt_balance);
  }
  // Default starting balance
  return 100;
}

// Set user's fake STT balance
async function setFakeSTTBalance(userId, newBalance) {
  const settings = await getUserSettings(userId) || {};
  settings.fake_stt_balance = newBalance;
  await saveUserSettings(userId, settings);
}

// Get user's fake positions (from user_settings, or empty array)
async function getFakePositions(userId) {
  const settings = await getUserSettings(userId);
  if (settings && settings.fake_positions) {
    try {
      return JSON.parse(settings.fake_positions);
    } catch {
      return [];
    }
  }
  return [];
}

// Add a token to user's fake positions
async function addFakePosition(userId, token) {
  const positions = await getFakePositions(userId);
  // If token already exists, add to amount
  const idx = positions.findIndex(p => p.address === token.address);
  // Ensure amount is string (BigInt-safe)
  const addAmount = typeof token.amount === 'bigint' ? token.amount.toString() : token.amount;
  if (idx >= 0) {
    const prevAmount = typeof positions[idx].amount === 'bigint' ? positions[idx].amount.toString() : positions[idx].amount;
    positions[idx].amount = (BigInt(prevAmount) + BigInt(addAmount)).toString();
  } else {
    positions.push({ ...token, amount: addAmount });
  }
  const settings = await getUserSettings(userId) || {};
  settings.fake_positions = JSON.stringify(positions);
  await saveUserSettings(userId, settings);
}

// Remove a percentage of a token from user's fake positions and credit STT
async function removeFakePositionAmount(userId, tokenAddress, percent, sttPerToken) {
  const positions = await getFakePositions(userId);
  const idx = positions.findIndex(p => p.address === tokenAddress);
  if (idx < 0) return;
  const prevAmount = BigInt(positions[idx].amount);
  const removeAmount = (prevAmount * BigInt(percent)) / BigInt(100);
  positions[idx].amount = (prevAmount - removeAmount).toString();
  if (positions[idx].amount === '0') positions.splice(idx, 1);
  // Credit STT
  const sttToCredit = removeAmount * BigInt(sttPerToken);
  const settings = await getUserSettings(userId) || {};
  let fakeStt = settings.fake_stt_balance ? BigInt(settings.fake_stt_balance) : BigInt(100);
  fakeStt += sttToCredit;
  settings.fake_stt_balance = fakeStt.toString();
  settings.fake_positions = JSON.stringify(positions);
  await saveUserSettings(userId, settings);
}

// Get fake STT balance for a user (chatId)
function getFakeSTTBalance(chatId) {
  const db = loadDB();
  return db.balances[chatId] || 100; // Default to 100 STT for new users
}

// Set fake STT balance for a user (chatId)
function setFakeSTTBalance(chatId, balance) {
  const db = loadDB();
  db.balances[chatId] = balance;
  saveDB(db);
}

// Get fake positions for a user (chatId)
function getFakePositions(chatId) {
  const db = loadDB();
  return db.positions[chatId] || [];
}

// Add a fake position for a user (chatId)
function addFakePosition(chatId, position) {
  const db = loadDB();
  if (!db.positions[chatId]) db.positions[chatId] = [];
  db.positions[chatId].push(position);
  saveDB(db);
}

// Remove a fake position for a user (chatId) by token address
function removeFakePosition(chatId, tokenAddress) {
  const db = loadDB();
  if (!db.positions[chatId]) return;
  db.positions[chatId] = db.positions[chatId].filter(p => p.address.toLowerCase() !== tokenAddress.toLowerCase());
  saveDB(db);
}

// --- POSITIONS MANAGEMENT ---

// Save a trade to the database
async function saveUserTrade(userId, tradeData) {
  try {
    // Validate token address before saving
    
    // Validate token address if provided
    if (tradeData.tokenAddress && !ethers.isAddress(tradeData.tokenAddress)) {
      console.error('Invalid token address provided:', tradeData.tokenAddress);
      throw new Error('Invalid token address format');
    }
    
    // Ensure we have valid token data
    const tokenIn = tradeData.type === 'buy' ? 'STT' : tradeData.tokenSymbol;
    const tokenOut = tradeData.type === 'buy' ? tradeData.tokenSymbol : 'STT';
    
    // For non-STT tokens, ensure we have a valid address
    const tokenInAddress = tokenIn === 'STT' ? null : tradeData.tokenAddress;
    const tokenOutAddress = tokenOut === 'STT' ? null : tradeData.tokenAddress;
    
    console.log('🔍 [DEBUG] saveUserTrade - Trade data:', {
      userId,
      tokenIn,
      tokenOut,
      tokenInAddress,
      tokenOutAddress,
      type: tradeData.type
    });
    
    const { data, error } = await supabase
      .from('trades')
      .insert({
        user_id: userId,
        token_in: tokenIn,
        token_out: tokenOut,
        token_in_address: tokenInAddress,
        token_out_address: tokenOutAddress,
        amount_in: tradeData.type === 'buy' ? tradeData.sttAmount.toString() : tradeData.amount.toString(),
        amount_out: tradeData.type === 'buy' ? tradeData.amount.toString() : tradeData.sttAmount.toString(),
        tx_hash: tradeData.txHash,
        type: tradeData.type, // 'buy' or 'sell'
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving trade:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Error saving trade:', error);
    return null;
  }
}

// Get user's positions (all tokens they own)
async function getUserPositions(userId) {
  try {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting positions:', error);
      return [];
    }

    console.log('🔍 [DEBUG] getUserPositions - Raw trades data:', data);

    // Group by token and calculate net positions
    const positions = {};
    data.forEach(trade => {
      // For buy trades: token_out is the token we're buying
      // For sell trades: token_in is the token we're selling
      const tokenSymbol = trade.type === 'buy' ? trade.token_out : trade.token_in;
      const tokenAddress = trade.type === 'buy' ? trade.token_out_address : trade.token_in_address;
      
      console.log('🔍 [DEBUG] getUserPositions - Processing trade:', {
        type: trade.type,
        tokenSymbol,
        tokenAddress,
        token_out: trade.token_out,
        token_in: trade.token_in,
        token_out_address: trade.token_out_address,
        token_in_address: trade.token_in_address
      });
      
      // Skip if we don't have a valid token symbol or address
      if (!tokenSymbol || tokenSymbol === 'STT') {
        console.log('🔍 [DEBUG] getUserPositions - Skipping STT or invalid token');
        return;
      }
      
      // Use token address as key if available, otherwise use symbol
      const positionKey = tokenAddress || tokenSymbol;
      
      if (!positions[positionKey]) {
        positions[positionKey] = {
          tokenAddress: tokenAddress,
          tokenSymbol: tokenSymbol,
          amount: 0,
          totalBought: 0,
          totalSold: 0,
          lastTrade: trade.created_at
        };
      }
      
      if (trade.type === 'buy') {
        const amount = parseFloat(trade.amount_out);
        positions[positionKey].amount += amount;
        positions[positionKey].totalBought += amount;
      } else if (trade.type === 'sell') {
        const amount = parseFloat(trade.amount_in);
        positions[positionKey].amount -= amount;
        positions[positionKey].totalSold += amount;
      }
    });

    console.log('🔍 [DEBUG] getUserPositions - Calculated positions:', positions);

    // Filter out zero or negative positions and validate addresses
    const validPositions = Object.values(positions).filter(pos => {
      if (pos.amount <= 0) {
        console.log('🔍 [DEBUG] getUserPositions - Filtering out zero/negative position:', pos);
        return false;
      }
      
      // Validate token address if present
      if (pos.tokenAddress && !ethers.isAddress(pos.tokenAddress)) {
        console.log('🔍 [DEBUG] getUserPositions - Filtering out invalid address:', pos.tokenAddress);
        return false;
      }
      
      return true;
    });

    console.log('🔍 [DEBUG] getUserPositions - Final valid positions:', validPositions);
    return validPositions;
  } catch (error) {
    console.error('Error getting positions:', error);
    return [];
  }
}

// Track user positions for testnet tokens
async function updateUserPosition(userId, positionData) {
  try {
    const { tokenAddress, tokenSymbol, amount, type } = positionData;
    
    // Get current position
    const { data: existingPosition } = await supabase
      .from('user_positions')
      .select('*')
      .eq('user_id', userId)
      .eq('token_address', tokenAddress)
      .single();
    
    if (existingPosition) {
      // Update existing position
      const newAmount = type === 'buy' 
        ? existingPosition.amount + amount 
        : existingPosition.amount - amount;
      
      await supabase
        .from('user_positions')
        .update({ 
          amount: Math.max(0, newAmount), // Don't go below 0
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('token_address', tokenAddress);
    } else if (type === 'buy') {
      // Create new position
      await supabase
        .from('user_positions')
        .insert({
          user_id: userId,
          token_address: tokenAddress,
          token_symbol: tokenSymbol,
          amount: amount,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }
    
    return true;
  } catch (error) {
    console.error('Error updating user position:', error);
    return false;
  }
}

// Get user position for a specific token
async function getUserPosition(userId, tokenAddress) {
  try {
    console.log(`🔍 [DEBUG] getUserPosition - User ID: ${userId}, Token Address: ${tokenAddress}`);
    
    // Get all trades for this user
    const { data: trades, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting trades for position calculation:', error);
      return null;
    }

    console.log(`🔍 [DEBUG] getUserPosition - Found ${trades?.length || 0} trades`);

    let totalBought = 0;
    let totalSold = 0;
    let tokenSymbol = 'UNKNOWN';
    let lastTrade = null;

    // Calculate position from trades
    for (const trade of trades || []) {
      // Check if this trade involves the target token
      const isTokenIn = trade.token_in_address === tokenAddress;
      const isTokenOut = trade.token_out_address === tokenAddress;
      
      if (isTokenIn || isTokenOut) {
        if (lastTrade === null) {
          lastTrade = trade.created_at;
        }
        
        if (isTokenIn && trade.type === 'sell') {
          // User sold this token
          totalSold += parseFloat(trade.amount_in || 0);
          tokenSymbol = trade.token_in;
        } else if (isTokenOut && trade.type === 'buy') {
          // User bought this token
          totalBought += parseFloat(trade.amount_out || 0);
          tokenSymbol = trade.token_out;
        }
      }
    }

    const amount = totalBought - totalSold;
    
    console.log(`🔍 [DEBUG] getUserPosition - Calculated position:`, {
      tokenAddress,
      tokenSymbol,
      amount,
      totalBought,
      totalSold,
      lastTrade
    });

    return {
      tokenAddress: tokenAddress,
      tokenSymbol: tokenSymbol,
      amount: amount,
      totalBought: totalBought,
      totalSold: totalSold,
      lastTrade: lastTrade
    };
  } catch (error) {
    console.error('Error getting user position:', error);
    return null;
  }
}

// Update user's fake balance (for testnet trading)
async function updateUserFakeBalance(userId, sttBalance) {
  try {
    const settings = await getUserSettings(userId) || {};
    settings.fake_stt_balance = sttBalance;
    await saveUserSettings(userId, settings);
  } catch (error) {
    console.error('Error updating fake balance:', error);
  }
}

// Get user's fake balance (for testnet trading)
async function getUserFakeBalance(userId) {
  try {
    const settings = await getUserSettings(userId);
    return settings?.fake_stt_balance || 1000; // Default 1000 STT
  } catch (error) {
    console.error('Error getting fake balance:', error);
    return 1000;
  }
}

module.exports = {
  supabase,
  createUser,
  getUser,
  createWallet,
  getWallet,
  saveTrade,
  getTradeHistory,
  saveLimitOrder,
  getLimitOrders,
  updateLimitOrder,
  saveBridgeTransaction,
  getBridgeTransactions,
  updateBridgeTransaction,
  createAlert,
  getAlerts,
  saveUserSettings,
  getUserSettings,
  addTokenToWatchlist,
  removeTokenFromWatchlist,
  getWatchlist,
  getFakeSTTBalance,
  setFakeSTTBalance,
  getFakePositions,
  addFakePosition,
  removeFakePositionAmount,
  getFakeSTTBalance,
  setFakeSTTBalance,
  getFakePositions,
  addFakePosition,
  removeFakePosition,
  initUser,
  getUserData,
  setUserBalance,
  updateUserPosition,
  loadDB,
  saveDB,
  saveUserTrade,
  getUserPositions,
  getUserPosition,
  updateUserFakeBalance,
  getUserFakeBalance
}; 