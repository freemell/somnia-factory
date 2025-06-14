const { Markup } = require('telegraf');

// Main menu buttons
const mainMenuButtons = [
  [
    Markup.button.callback('💵 Buy', 'buy'),
    Markup.button.callback('💸 Fund', 'fund'),
    Markup.button.callback('🛠 Alerts', 'alerts')
  ],
  [
    Markup.button.callback('📖 Help', 'help'),
    Markup.button.callback('🎁 Refer Friends', 'refer'),
    Markup.button.callback('🔔 Notifications', 'notifications')
  ],
  [
    Markup.button.callback('🧬 Wallet', 'wallet'),
    Markup.button.callback('⚙️ Settings', 'settings'),
    Markup.button.callback('🔁 Refresh', 'refresh')
  ],
  [
    Markup.button.callback('📉 DCA Orders', 'dca'),
    Markup.button.callback('📈 Limit Orders', 'limit')
  ]
];

// Token info buttons
const tokenInfoButtons = (tokenAddress) => [
  [
    Markup.button.callback('DCA', `dca_${tokenAddress}`),
    Markup.button.callback('✅ Swap', `swap_${tokenAddress}`),
    Markup.button.callback('Limit', `limit_${tokenAddress}`)
  ],
  [
    Markup.button.callback('Buy 1 SOM', `buy_${tokenAddress}_1`),
    Markup.button.callback('Buy 5 SOM', `buy_${tokenAddress}_5`),
    Markup.button.callback('Buy X SOM', `buy_${tokenAddress}_x`)
  ],
  [
    Markup.button.callback('📊 Chart', `chart_${tokenAddress}`),
    Markup.button.callback('🔍 Explorer', `explorer_${tokenAddress}`),
    Markup.button.callback('🧠 Scan', `scan_${tokenAddress}`)
  ],
  [Markup.button.callback('🔄 Refresh', `refresh_${tokenAddress}`)]
];

// Persistent control buttons
const persistentButtons = [
  [
    Markup.button.callback('🔁 Refresh', 'refresh'),
    Markup.button.callback('🏠 Menu', 'menu'),
    Markup.button.callback('🧬 Wallet', 'wallet')
  ]
];

// Buy amount buttons
const buyAmountButtons = (tokenAddress) => [
  [
    Markup.button.callback('0.1 SOM', `buy_${tokenAddress}_0.1`),
    Markup.button.callback('1 SOM', `buy_${tokenAddress}_1`),
    Markup.button.callback('5 SOM', `buy_${tokenAddress}_5`)
  ],
  [
    Markup.button.callback('10 SOM', `buy_${tokenAddress}_10`),
    Markup.button.callback('50 SOM', `buy_${tokenAddress}_50`),
    Markup.button.callback('100 SOM', `buy_${tokenAddress}_100`)
  ],
  [Markup.button.callback('❌ Cancel', 'cancel')]
];

// Alert type buttons
const alertTypeButtons = (tokenAddress) => [
  [
    Markup.button.callback('Above Price', `alert_above_${tokenAddress}`),
    Markup.button.callback('Below Price', `alert_below_${tokenAddress}`)
  ],
  [
    Markup.button.callback('Price Change %', `alert_change_${tokenAddress}`),
    Markup.button.callback('Volume Spike', `alert_volume_${tokenAddress}`)
  ],
  [Markup.button.callback('❌ Cancel', 'cancel')]
];

// Notification settings buttons
const notificationButtons = [
  [
    Markup.button.callback('🔔 Enable All', 'notify_enable_all'),
    Markup.button.callback('🔕 Disable All', 'notify_disable_all')
  ],
  [
    Markup.button.callback('📈 Price Alerts', 'notify_price'),
    Markup.button.callback('💱 Trade Alerts', 'notify_trade')
  ],
  [
    Markup.button.callback('📊 Portfolio Updates', 'notify_portfolio'),
    Markup.button.callback('🎁 Referral Alerts', 'notify_referral')
  ],
  [Markup.button.callback('❌ Close', 'cancel')]
];

// Settings buttons
const settingsButtons = [
  [
    Markup.button.callback('👤 Profile', 'settings_profile'),
    Markup.button.callback('🔐 Security', 'settings_security')
  ],
  [
    Markup.button.callback('💱 Trading', 'settings_trading'),
    Markup.button.callback('🔔 Notifications', 'settings_notifications')
  ],
  [
    Markup.button.callback('🌐 Language', 'settings_language'),
    Markup.button.callback('🎨 Theme', 'settings_theme')
  ],
  [Markup.button.callback('❌ Close', 'cancel')]
];

module.exports = {
  mainMenuButtons,
  tokenInfoButtons,
  persistentButtons,
  buyAmountButtons,
  alertTypeButtons,
  notificationButtons,
  settingsButtons
}; 