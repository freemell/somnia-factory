const { createClient } = require('@supabase/supabase-js');

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
  getUserSettings
}; 