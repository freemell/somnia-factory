const { Markup } = require('telegraf');

// Main menu buttons
const mainMenuButtons = [
  [Markup.button.callback('🔄 Buy', 'buy')],
  [Markup.button.callback('💰 Fund', 'fund')],
  [Markup.button.callback('🌉 Bridge', 'bridge')],
  [Markup.button.callback('🔔 Alerts', 'alerts')],
  [Markup.button.callback('❓ Help', 'help')],
  [Markup.button.callback('👥 Referrals', 'referrals')],
  [Markup.button.callback('🔔 Notifications', 'notifications')],
  [Markup.button.callback('👛 Wallet', 'wallet')],
  [Markup.button.callback('⚙️ Settings', 'settings')]
];

// Token info buttons
function tokenInfoButtons(tokenAddress) {
  return [
    [
      Markup.button.callback('📈 DCA', `dca_${tokenAddress}`),
      Markup.button.callback('🔄 Swap', `swap_${tokenAddress}`),
      Markup.button.callback('⏱️ Limit', `limit_${tokenAddress}`)
    ],
    [
      Markup.button.callback('Buy 0.1', `buy_0.1_${tokenAddress}`),
      Markup.button.callback('Buy 0.5', `buy_0.5_${tokenAddress}`),
      Markup.button.callback('Buy 1.0', `buy_1.0_${tokenAddress}`)
    ],
    [
      Markup.button.callback('Buy 2.0', `buy_2.0_${tokenAddress}`),
      Markup.button.callback('Buy 5.0', `buy_5.0_${tokenAddress}`),
      Markup.button.callback('Buy 10.0', `buy_10.0_${tokenAddress}`)
    ]
  ];
}

// Persistent control buttons
const persistentButtons = [
  [Markup.button.callback('🏠 Main Menu', 'main_menu')],
  [Markup.button.callback('🔄 Refresh', 'refresh')],
  [Markup.button.callback('❓ Help', 'help')],
  [Markup.button.callback('⚙️ Settings', 'settings')]
];

// Alert type buttons
const alertTypeButtons = [
  [
    Markup.button.callback('📈 Price Up', 'alert_price_up'),
    Markup.button.callback('📉 Price Down', 'alert_price_down')
  ],
  [
    Markup.button.callback('📊 Volume', 'alert_volume'),
    Markup.button.callback('💫 New Token', 'alert_new_token')
  ],
  [Markup.button.callback('« Back', 'alerts')]
];

// Notification settings buttons
const notificationButtons = [
  [
    Markup.button.callback('✅ Price Alerts', 'notify_price'),
    Markup.button.callback('✅ Trade Confirmations', 'notify_trade')
  ],
  [
    Markup.button.callback('✅ Wallet Updates', 'notify_wallet'),
    Markup.button.callback('✅ System Announcements', 'notify_system')
  ],
  [Markup.button.callback('« Back', 'settings')]
];

// User settings buttons
const settingsButtons = [
  [
    Markup.button.callback('⚡ Slippage', 'setting_slippage'),
    Markup.button.callback('⛽ Gas Price', 'setting_gas')
  ],
  [
    Markup.button.callback('🌐 Language', 'setting_language'),
    Markup.button.callback('🎨 Theme', 'setting_theme')
  ],
  [Markup.button.callback('« Back', 'settings')]
];

module.exports = {
  mainMenuButtons,
  tokenInfoButtons,
  persistentButtons,
  alertTypeButtons,
  notificationButtons,
  settingsButtons
}; 