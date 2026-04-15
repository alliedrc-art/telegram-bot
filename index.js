const TelegramBot = require('node-telegram-bot-api');
const https = require('https');

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const CHANNEL_ID = '-1003775562827';
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown per asset
const AUTO_SCAN_MS = 15 * 60 * 1000; // every 15 minutes

const lastAlertAt = {};

function getJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function getMarketData() {
  const url =
    'https://api.coingecko.com/api/v3/simple/price' +
    '?ids=bitcoin,ethereum,solana' +
    '&vs_currencies=usd' +
    '&include_24hr_change=true' +
    '&include_24hr_vol=true';

  const data = await getJSON(url);

  return [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      price: data.bitcoin.usd,
      change24h: data.bitcoin.usd_24h_change || 0,
      volume24h: data.bitcoin.usd_24h_vol || 0,
      key: 'bitcoin'
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      price: data.ethereum.usd,
      change24h: data.ethereum.usd_24h_change || 0,
      volume24h: data.ethereum.usd_24h_vol || 0,
      key: 'ethereum'
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      price: data.solana.usd,
      change24h: data.solana.usd_24h_change || 0,
      volume24h: data.solana.usd_24h_vol || 0,
      key: 'solana'
    }
  ];
}

function scoreAsset(asset) {
  let score = 50;
  let reasons = [];

  if (asset.change24h >= 6) {
    score += 25;
    reasons.push('strong 24h momentum');
  } else if (asset.change24h >= 3) {
    score += 15;
    reasons.push('healthy 24h momentum');
  } else if (asset.change24h <= -5) {
    score -= 20;
    reasons.push('heavy 24h weakness');
  } else if (asset.change24h <= -2) {
    score -= 10;
    reasons.push('negative 24h trend');
  }

  if (asset.volume24h >= 10000000000) {
    score += 10;
    reasons.push('very high volume');
  } else if (asset.volume24h >= 1000000000) {
    score += 5;
    reasons.push('strong volume');
  }

  let bias = 'NEUTRAL';
  if (score >= 80) bias = 'STRONG BUY';
  else if (score >= 65) bias = 'BUY';
  else if (score <= 30) bias = 'AVOID';
  else if (score <= 40) bias = 'WEAK';

  return {
    ...asset,
    score,
    bias,
    reasons
  };
}

function formatPrice(n) {
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatPct(n) {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function buildSignalMessage(a) {
  const reasons = a.reasons.length ? a.reasons.join(', ') : 'no strong edge';
  return (
    `🚨 ${a.symbol} SIGNAL\n\n` +
    `Bias: ${a.bias}\n` +
    `Score: ${a.score}/100\n` +
    `Price: ${formatPrice(a.price)}\n` +
    `24h Change: ${formatPct(a.change24h)}\n` +
    `24h Volume: ${formatPrice(a.volume24h)}\n` +
    `Reason: ${reasons}`
  );
}
