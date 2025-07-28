# Somnia Trading Bot Usage Guide

## Installation

1. Install dependencies:
   ```sh
   npm install telegraf@4 telegraf-session-local@2
   ```

2. Ensure your `.env` file is set up with the required environment variables (see README.md).

## Running the Bot

Start the bot with:
```sh
node bot.js
```

## Testing the Fake Buy/Sell Flow

1. Open your Telegram bot.
2. Send the Insomniacs token address:
   ```
   0x0C726E446865FFb19Cc13f21aBf0F515106C9662
   ```
3. Use the buy/sell buttons to simulate trades.
4. You will receive confirmation messages and fake transaction hashes.

## Running Tests

To run automated tests:
```sh
node test/bot.test.js
```

## Troubleshooting

- **Session Expired / Please Scan the Token Again:**
  - Make sure you scan the token address before buying/selling.
  - Persistent sessions are stored in `sessions.json`.
- **No Fake Position Found for This Token:**
  - You must complete a fake buy before selling.
- **Debugging:**
  - Check logs for `ctx.session` state.
  - Ensure `sessions.json` and `db.json` are writable.

## Notes
- All trades are simulated. No real tokens are moved.
- For persistent sessions, `sessions.json` is used. For fake balances/positions, `db.json` is used. 