# Database Setup

The bot requires several database tables to function properly. Since Supabase doesn't have a built-in `exec_sql` RPC function, you need to create the tables manually.

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor** tab
3. Copy the contents of `schema.sql` and paste it into the editor
4. Click **Run** to execute the SQL

## Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase db reset
```

Then copy the contents of `schema.sql` and run it in your local Supabase instance.

## Required Tables

The following tables will be created:

- **users** - Stores user information
- **wallets** - Stores encrypted wallet data
- **trades** - Stores trade history
- **limit_orders** - Stores pending limit orders
- **bridge_transactions** - Stores cross-chain bridge transactions
- **alerts** - Stores price alerts
- **user_settings** - Stores user preferences

## Schema Details

### Users Table
```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
```

### Wallets Table
```sql
CREATE TABLE wallets (
  id SERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  private_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
```

### Trades Table
```sql
CREATE TABLE trades (
  id SERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
  token_in TEXT NOT NULL,
  token_out TEXT NOT NULL,
  amount_in TEXT NOT NULL,
  amount_out TEXT NOT NULL,
  tx_hash TEXT,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
```

### Limit Orders Table
```sql
CREATE TABLE limit_orders (
  id SERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
  token_in TEXT NOT NULL,
  token_out TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  price DECIMAL NOT NULL,
  order_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  executed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
```

### Bridge Transactions Table
```sql
CREATE TABLE bridge_transactions (
  id SERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
  source_chain TEXT NOT NULL,
  destination_chain TEXT NOT NULL,
  asset TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  status TEXT DEFAULT 'pending',
  tx_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
```

### Alerts Table
```sql
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
  token_address TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  price_target DECIMAL NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
```

### User Settings Table
```sql
CREATE TABLE user_settings (
  id SERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
  slippage_tolerance DECIMAL DEFAULT 1.0,
  default_gas_price TEXT DEFAULT 'auto',
  language TEXT DEFAULT 'en',
  theme TEXT DEFAULT 'light',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
```

## After Creating Tables

Once you've created the tables, restart the bot:

```bash
node bot.js
```

The bot should now work without database errors. 