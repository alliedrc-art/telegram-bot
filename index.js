const TelegramBot = require('node-telegram-bot-api');
const https = require('https');

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const OWNER_ID = 7434611094;
const CHANNEL_ID = '-1003775562827';

function isOwner(msg) {
  return msg && msg.from && Number(msg.from.id) === OWNER_ID;
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
          } catch (err) {
            reject(new Error('Bad API response'));
          }
        });
      }
    ).on('error', () => {
      reject(new Error('API request failed'));
    });
  });
}

function formatPrice(n) {
  return `$${Number(n).toLocaleString(undefined, {
    maximumFractionDigits: 2
  })}`;
}

function formatPct(n) {
  const num = Number(n || 0);
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

async function getMarketData() {
  const url =
    'https://api.coingecko.com/api/v3/simple/price' +
    '?ids=bitcoin,ethereum,solana' +
    '&vs_currencies=usd' +
    '&include_24hr_change=true' +
    '&include_24hr_vol=true';

  const data = await getJSON(url);

  function safe(obj, key) {
    return obj && typeof obj[key] !== 'undefined' ? obj[key] : 0;
  }

  return [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      price: safe(data.bitcoin, 'usd'),
      change24h: safe(data.bitcoin, 'usd_24h_change'),
      volume24h: safe(data.bitcoin, 'usd_24h_vol')
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      price: safe(data.ethereum, 'usd'),
      change24h: safe(data.ethereum, 'usd_24h_change'),
      volume24h: safe(data.ethereum, 'usd_24h_vol')
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      price: safe(data.solana, 'usd'),
      change24h: safe(data.solana, 'usd_24h_change'),
      volume24h: safe(data.solana, 'usd_24h_vol')
    }
  ];
}

function scoreAsset(asset) {
  let score = 50;
  const reasons = [];

  if (asset.change24h >= 8) {
    score += 30;
    reasons.push('explosive momentum');
  } else if (asset.change24h >= 5) {
    score += 20;
    reasons.push('strong momentum');
  } else if (asset.change24h >= 2) {
    score += 10;
    reasons.push('positive trend');
  } else if (asset.change24h <= -8) {
    score -= 30;
    reasons.push('heavy weakness');
  } else if (asset.change24h <= -4) {
    score -= 15;
    reasons.push('negative trend');
  }

  if (asset.volume24h >= 15000000000) {
    score += 10;
    reasons.push('extreme volume');
  } else if (asset.volume24h >= 3000000000) {
    score += 5;
    reasons.push('strong volume');
  }

  let bias = 'NEUTRAL';
  if (score >= 80) bias = 'STRONG BUY';
  else if (score >= 65) bias = 'BUY';
  else if (score <= 30) bias = 'AVOID';
  else if (score <= 40) bias = 'WEAK';

  return { ...asset, score, bias, reasons };
}

async function runScan() {
  const assets = await getMarketData();
  return assets.map(scoreAsset).sort((a, b) => b.score - a.score);
}

bot.onText(/\/start/, ownerOnly(async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    '🚀 Atlas Secure Clean Build\n\nCommands:\n/price\n/scan\n/alert your message\n/alerttest\n/version'
  );
}));

bot.onText(/\/version/, ownerOnly(async (msg) => {
  await bot.sendMessage(msg.chat.id, 'ATLAS_CLEAN_V1');
}));

bot.on('message', async (msg) => {
  if (!isOwner(msg)) return;
  if (msg.text && msg.text.toLowerCase() === 'test') {
    await bot.sendMessage(msg.chat.id, '✅ Working');
  }
});

bot.onText(/\/price/, ownerOnly(async (msg) => {
  const assets = await getMarketData();

  const text = assets
    .map(
      (a) => `${a.symbol}: ${formatPrice(a.price)} | ${formatPct(a.change24h)}`
    )
    .join('\n');

  await bot.sendMessage(msg.chat.id, `📊 LIVE PRICES\n\n${text}`);
}));

bot.onText(/\/scan/, ownerOnly(async (msg) => {
  const scored = await runScan();

  const text = scored
    .map(
      (a) =>
        `${a.symbol} — ${a.bias}\n` +
        `Score: ${a.score}/100\n` +
        `Price: ${formatPrice(a.price)}\n` +
        `24h: ${formatPct(a.change24h)}\n`
    )
    .join('\n');

  await bot.sendMessage(msg.chat.id, `🧠 ATLAS SCAN\n\n${text}`);
}));

bot.onText(/\/alerttest/, ownerOnly(async (msg) => {
  await bot.sendMessage(CHANNEL_ID, '🚀 TEST ALERT FROM ATLAS CLEAN BUILD');
  await bot.sendMessage(msg.chat.id, '✅ Sent test alert to Atlas Alerts');
}));

bot.onText(/\/alert (.+)/, ownerOnly(async (msg, match) => {
  const text = match[1];
  await bot.sendMessage(CHANNEL_ID, text);
  await bot.sendMessage(msg.chat.id, '✅ Sent to Atlas Alerts');
}));
