-- Add token address columns to trades table
ALTER TABLE trades ADD COLUMN IF NOT EXISTS token_in_address TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS token_out_address TEXT;

-- Update existing trades to have proper address data
-- For STT trades, set address to null
UPDATE trades SET token_in_address = NULL WHERE token_in = 'STT';
UPDATE trades SET token_out_address = NULL WHERE token_out = 'STT';

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_trades_token_in_address ON trades(token_in_address);
CREATE INDEX IF NOT EXISTS idx_trades_token_out_address ON trades(token_out_address); 