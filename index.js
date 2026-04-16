const TelegramBot = require('node-telegram-bot-api');
const https = require('https');

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

function isOwner(msg) {
  return true;
}

function ownerOnly(handler) {
  return async (msg, match) => {
    if (!isOwner(msg)) return;
    try {
      await handler(msg, match);
    } catch (err) {
      bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`);
    }
  };
}

const alerts = [];
const CHECK_INTERVAL_MS = 60 * 1000;

function getJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(
      url,
      { headers: { 'User-Agent': 'Mozilla/5.0' } },
      (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error('Bad API response'));
          }
        });
      }
    ).on('error', () => {
      reject(new Error('API request failed'));
    });
  });
}

async function getPrices() {
  const url =
    'https://api.coingecko.com/api/v3/simple/price' +
    '?ids=bitcoin,ethereum,solana&vs_currencies=usd';

  const data = await getJSON(url);

  return {
    btc: Number(data.bitcoin?.usd || 0),
    eth: Number(data.ethereum?.usd || 0),
    sol: Number(data.solana?.usd || 0)
  };
}

function formatPrice(n) {
  return `$${Number(n).toLocaleString(undefined, {
    maximumFractionDigits: 2
  })}`;
}

bot.onText(/\/start/, ownerOnly(async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    '🚀 Atlas V3 Step 1 Ready\n\nCommands:\n/price\n/alert btc 80000\n/alert eth 3000\n/alerts\n/clearalerts'
  );
}));

bot.onText(/\/version/, ownerOnly(async (msg) => {
  await bot.sendMessage(msg.chat.id, 'ATLAS_V3_STEP1');
}));

bot.onText(/\/price/, ownerOnly(async (msg) => {
  const prices = await getPrices();

  const text =
    `BTC: ${formatPrice(prices.btc)}\n` +
    `ETH: ${formatPrice(prices.eth)}\n` +
    `SOL: ${formatPrice(prices.sol)}`;

  await bot.sendMessage(msg.chat.id, `📊 LIVE PRICES\n\n${text}`);
}));

bot.onText(/\/alert\s+(btc|eth|sol)\s+(\d+(\.\d+)?)/i, ownerOnly(async (msg, match) => {
  const symbol = match[1].toLowerCase();
  const target = Number(match[2]);

  alerts.push({
    chatId: msg.chat.id,
    symbol,
    target,
    triggered: false
  });

  await bot.sendMessage(
    msg.chat.id,
    `✅ Alert added\n\nCoin: ${symbol.toUpperCase()}\nTarget: ${formatPrice(target)}`
  );
}));

bot.onText(/\/alerts/, ownerOnly(async (msg) => {
  const userAlerts = alerts.filter((a) => a.chatId === msg.chat.id && !a.triggered);

  if (!userAlerts.length) {
    await bot.sendMessage(msg.chat.id, 'No active alerts.');
    return;
  }

  const text = userAlerts
    .map((a, i) => `${i + 1}. ${a.symbol.toUpperCase()} → ${formatPrice(a.target)}`)
    .join('\n');

  await bot.sendMessage(msg.chat.id, `🔔 ACTIVE ALERTS\n\n${text}`);
}));

bot.onText(/\/clearalerts/, ownerOnly(async (msg) => {
  for (const alert of alerts) {
    if (alert.chatId === msg.chat.id) {
      alert.triggered = true;
    }
  }

  await bot.sendMessage(msg.chat.id, '🗑 Cleared all your alerts.');
}));

async function checkAlerts() {
  try {
    const prices = await getPrices();

    for (const alert of alerts) {
      if (alert.triggered) continue;

      const current = prices[alert.symbol];

      if (!current) continue;

      if (current >= alert.target) {
        alert.triggered = true;

        await bot.sendMessage(
          alert.chatId,
          `🚨 ALERT TRIGGERED\n\nCoin: ${alert.symbol.toUpperCase()}\nTarget: ${formatPrice(alert.target)}\nCurrent: ${formatPrice(current)}`
        );
      }
    }
  } catch (err) {
    console.log('Alert check failed:', err.message);
  }
}

setInterval(checkAlerts, CHECK_INTERVAL_MS);
checkAlerts();
