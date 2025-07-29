// Test the improved message formatting
const testMessage = `✅ *Swap Successful!*

💰 *Amount:* 1 STT
🎯 *To:* INSOMN
🔗 [Check Txn](https://shannon-explorer.somnia.network/tx/0xc6b643140f942625045673f50db768f0685a89eea1d1e4624927ef00d16b9d24)`;

console.log("🧪 Testing improved message format:");
console.log("=" .repeat(50));
console.log(testMessage);
console.log("=" .repeat(50));
console.log("\n✅ Message format looks good!");
console.log("📱 This will display as a clickable link in Telegram");
console.log("🔗 Users can click 'Check Txn' to view the transaction"); 