const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// User management
async function createUser(userId, username) {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert({
        user_id: userId,
        username: username,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
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

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
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

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating wallet:', error);
    throw error;
  }
}

async function getWallet(userId) {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting wallet:', error);
    throw error;
  }
}

// Trade history
async function saveTrade(userId, tradeData) {
  try {
    const { data, error } = await supabase
      .from('trades')
      .insert({
        user_id: userId,
        ...tradeData,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving trade:', error);
    throw error;
  }
}

async function getTradeHistory(userId) {
  try {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting trade history:', error);
    throw error;
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

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating alert:', error);
    throw error;
  }
}

async function getAlerts(userId) {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting alerts:', error);
    throw error;
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
  createAlert,
  getAlerts
}; 