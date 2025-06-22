const { Markup } = require('telegraf');

// Main menu buttons - 3x3 grid layout
const mainMenuButtons = [
  [
    Markup.button.callback('🔄 Buy', 'buy'),
    Markup.button.callback('💰 Fund', 'fund'),
    Markup.button.callback('🌉 Bridge', 'bridge')
  ],
  [
    Markup.button.callback('📊 Trade', 'trade'),
    Markup.button.callback('⏱️ Limits', 'limits'),
    Markup.button.callback('📈 History', 'history')
  ],
  [
    Markup.button.callback('👛 Wallet', 'wallet'),
    Markup.button.callback('🔔 Alerts', 'alerts'),
    Markup.button.callback('❓ Help', 'help')
  ]
];

// Token info buttons - 3-column layout
function tokenInfoButtons(tokenAddress) {
  return [
    [
      Markup.button.callback('📈 Buy', `buy_${tokenAddress}`),
      Markup.button.callback('📉 Sell', `sell_${tokenAddress}`),
      Markup.button.callback('⏱️ Limit', `limit_${tokenAddress}`)
    ],
    [
      Markup.button.callback('💰 0.1', `amount_0.1_${tokenAddress}`),
      Markup.button.callback('💰 0.5', `amount_0.5_${tokenAddress}`),
      Markup.button.callback('💰 1.0', `amount_1.0_${tokenAddress}`)
    ],
    [
      Markup.button.callback('💰 2.0', `amount_2.0_${tokenAddress}`),
      Markup.button.callback('💰 5.0', `amount_5.0_${tokenAddress}`),
      Markup.button.callback('💰 10.0', `amount_10.0_${tokenAddress}`)
    ],
    [
      Markup.button.callback('📊 Info', `info_${tokenAddress}`),
      Markup.button.callback('📈 Chart', `chart_${tokenAddress}`),
      Markup.button.callback('🏠 Menu', 'main_menu')
    ]
  ];
}

// Trade action buttons
function tradeActionButtons(tokenAddress, action) {
  return [
    [
      Markup.button.callback('✅ Confirm', `confirm_${action}_${tokenAddress}`),
      Markup.button.callback('❌ Cancel', `cancel_${action}_${tokenAddress}`),
      Markup.button.callback('⚙️ Settings', 'settings')
    ],
    [
      Markup.button.callback('💰 0.1', `amount_0.1_${action}_${tokenAddress}`),
      Markup.button.callback('💰 0.5', `amount_0.5_${action}_${tokenAddress}`),
      Markup.button.callback('💰 1.0', `amount_1.0_${action}_${tokenAddress}`)
    ],
    [
      Markup.button.callback('💰 2.0', `amount_2.0_${action}_${tokenAddress}`),
      Markup.button.callback('💰 5.0', `amount_5.0_${action}_${tokenAddress}`),
      Markup.button.callback('💰 10.0', `amount_10.0_${action}_${tokenAddress}`)
    ]
  ];
}

// Limit order buttons
const limitOrderButtons = [
  [
    Markup.button.callback('➕ Create', 'limit_create'),
    Markup.button.callback('👁️ View', 'limit_view'),
    Markup.button.callback('❌ Cancel', 'limit_cancel')
  ],
  [
    Markup.button.callback('📈 Buy Limit', 'limit_buy'),
    Markup.button.callback('📉 Sell Limit', 'limit_sell'),
    Markup.button.callback('⚙️ Settings', 'limit_settings')
  ],
  [
    Markup.button.callback('📊 History', 'limit_history'),
    Markup.button.callback('🔄 Refresh', 'refresh'),
    Markup.button.callback('🏠 Menu', 'main_menu')
  ]
];

// Bridge buttons
const bridgeButtons = [
  [
    Markup.button.callback('🌉 Sepolia', 'bridge_sepolia'),
    Markup.button.callback('🌉 Mumbai', 'bridge_mumbai'),
    Markup.button.callback('🌉 BSC Test', 'bridge_bsc')
  ],
  [
    Markup.button.callback('📊 Status', 'bridge_status'),
    Markup.button.callback('🔄 Retry', 'bridge_retry'),
    Markup.button.callback('❓ How', 'bridge_how')
  ],
  [
    Markup.button.callback('📈 History', 'bridge_history'),
    Markup.button.callback('🔄 Refresh', 'refresh'),
    Markup.button.callback('🏠 Menu', 'main_menu')
  ]
];

// Persistent control buttons - 3-column layout
const persistentButtons = [
  [
    Markup.button.callback('🏠 Menu', 'main_menu'),
    Markup.button.callback('🔄 Refresh', 'refresh'),
    Markup.button.callback('❓ Help', 'help')
  ]
];

// Alert type buttons
const alertTypeButtons = [
  [
    Markup.button.callback('📈 Price Up', 'alert_price_up'),
    Markup.button.callback('📉 Price Down', 'alert_price_down'),
    Markup.button.callback('📊 Volume', 'alert_volume')
  ],
  [
    Markup.button.callback('💫 New Token', 'alert_new_token'),
    Markup.button.callback('🔔 All Alerts', 'alert_all'),
    Markup.button.callback('❌ Clear All', 'alert_clear')
  ],
  [
    Markup.button.callback('⚙️ Settings', 'alert_settings'),
    Markup.button.callback('🔄 Refresh', 'refresh'),
    Markup.button.callback('🏠 Menu', 'main_menu')
  ]
];

// Notification settings buttons
const notificationButtons = [
  [
    Markup.button.callback('✅ Price Alerts', 'notify_price'),
    Markup.button.callback('✅ Trade Confirmations', 'notify_trade'),
    Markup.button.callback('✅ Wallet Updates', 'notify_wallet')
  ],
  [
    Markup.button.callback('✅ System Announcements', 'notify_system'),
    Markup.button.callback('❌ Disable All', 'notify_disable'),
    Markup.button.callback('🔄 Refresh', 'refresh')
  ],
  [
    Markup.button.callback('⚙️ Settings', 'settings'),
    Markup.button.callback('📊 History', 'notification_history'),
    Markup.button.callback('🏠 Menu', 'main_menu')
  ]
];

// User settings buttons
const settingsButtons = [
  [
    Markup.button.callback('⚡ Slippage', 'setting_slippage'),
    Markup.button.callback('⛽ Gas Price', 'setting_gas'),
    Markup.button.callback('🌐 Language', 'setting_language')
  ],
  [
    Markup.button.callback('🎨 Theme', 'setting_theme'),
    Markup.button.callback('🔐 Security', 'setting_security'),
    Markup.button.callback('📊 Analytics', 'setting_analytics')
  ],
  [
    Markup.button.callback('🔄 Refresh', 'refresh'),
    Markup.button.callback('📊 History', 'settings_history'),
    Markup.button.callback('🏠 Menu', 'main_menu')
  ]
];

// Wallet buttons
const walletButtons = [
  [
    Markup.button.callback('💰 Fund', 'fund'),
    Markup.button.callback('📤 Send', 'send'),
    Markup.button.callback('📥 Receive', 'receive')
  ],
  [
    Markup.button.callback('📊 Balance', 'balance'),
    Markup.button.callback('📈 Portfolio', 'portfolio'),
    Markup.button.callback('🔐 Security', 'wallet_security')
  ],
  [
    Markup.button.callback('🔄 Refresh', 'refresh'),
    Markup.button.callback('📊 History', 'wallet_history'),
    Markup.button.callback('🏠 Menu', 'main_menu')
  ]
];

module.exports = {
  mainMenuButtons,
  tokenInfoButtons,
  tradeActionButtons,
  limitOrderButtons,
  bridgeButtons,
  persistentButtons,
  alertTypeButtons,
  notificationButtons,
  settingsButtons,
  walletButtons
}; 