const TelegramBot = require('node-telegram-bot-api');
const https = require('https');

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const OWNER_ID = 7434611094;

function isOwner(msg) {
  return msg.from.id === OWNER_ID;
}

function getJSON(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({}); }
      });
    }).on('error', () => resolve({}));
  });
}

async function getPrices() {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd';
  const data = await getJSON(url);

  return [
    { symbol: 'BTC', price: data.bitcoin?.usd || 0 },
    { symbol: 'ETH', price: data.ethereum?.usd || 0 },
    { symbol: 'SOL', price: data.solana?.usd || 0 }
  ];
}

bot.onText(/\/start/, (msg) => {
  if (!isOwner(msg)) return;
  bot.sendMessage(msg.chat.id, '🚀 Atlas V3 Lite Ready\n\n/price');
});

bot.onText(/\/price/, async (msg) => {
  if (!isOwner(msg)) return;

  const prices = await getPrices();

  const text = prices.map(p => `${p.symbol}: $${p.price}`).join('\n');

  bot.sendMessage(msg.chat.id, text);
});
