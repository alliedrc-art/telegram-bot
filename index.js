const TelegramBot = require('node-telegram-bot-api');
const https = require('https');

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const CHANNEL_ID = '-1003775562827';

function getJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (err) {
          console.log('JSON parse error:', data);
          reject(err);
        }
      });
    }).on('error', (err) => {
      console.log('Request error:', err);
      reject(err);
    });
  });
}
async function getMarketData() {
  const url =
    'https://api.coingecko.com/api/v3/simple/price' +
    '?ids=bitcoin,ethereum,solana' +
    '&vs_currencies=usd' +
    '&include_24hr_change=true';

  const data = await getJSON(url);

  function safe(obj, key) {
    return obj && typeof obj[key] !== 'undefined' ? obj[key] : 0;
  }

  return [
    {
      symbol: 'BTC',
      price: safe(data.bitcoin, 'usd'),
      change: safe(data.bitcoin, 'usd_24h_change')
    },
    {
      symbol: 'ETH',
      price: safe(data.ethereum, 'usd'),
      change: safe(data.ethereum, 'usd_24h_change')
    },
    {
      symbol: 'SOL',
      price: safe(data.solana, 'usd'),
      change: safe(data.solana, 'usd_24h_change')
    }
  ];
}

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, '🚀 Atlas system ready\n\n/price\n/scan');
});

bot.on('message', (msg) => {
  if (msg.text && msg.text.toLowerCase() === 'test') {
    bot.sendMessage(msg.chat.id, '✅ Working');
  }
});

bot.onText(/\/price/, async (msg) => {
  const data = await getMarketData();
  const text = data.map((c) => `${c.symbol}: $${c.price}`).join('\n');
  bot.sendMessage(msg.chat.id, text);
});

bot.onText(/\/scan/, async (msg) => {
  const data = await getMarketData();

  const text = data
    .map(
      (c) =>
        `${c.symbol}\nPrice: $${c.price}\n24h: ${Number(c.change).toFixed(2)}%\n`
    )
    .join('\n');

  bot.sendMessage(msg.chat.id, `🧠 SCAN\n\n${text}`);
});

bot.onText(/\/alert (.+)/, (msg, match) => {
  bot.sendMessage(CHANNEL_ID, match[1]);
  bot.sendMessage(msg.chat.id, '✅ Sent to Atlas Alerts');
});
