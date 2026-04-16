const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// ===== PRICE FETCH =====
async function getPrices() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd'
    );
    const data = await res.json();

    return {
      btc: data.bitcoin.usd,
      eth: data.ethereum.usd,
      sol: data.solana.usd,
    };
  } catch (e) {
    console.log("Price error:", e);
    return null;
  }
}

// ===== START =====
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, `🚀 Atlas V3 LIVE

Commands:
/price
/alert btc 70000
/alerts`);
});

// ===== PRICE =====
bot.onText(/\/price/, async (msg) => {
  const prices = await getPrices();

  if (!prices) {
    return bot.sendMessage(msg.chat.id, '❌ Failed to fetch prices');
  }

  bot.sendMessage(
    msg.chat.id,
    `📊 LIVE PRICES

BTC: $${prices.btc.toLocaleString()}
ETH: $${prices.eth.toLocaleString()}
SOL: $${prices.sol.toLocaleString()}`
  );
});

// ===== ALERTS =====
let alerts = [];

bot.onText(/\/alert (.+)/, (msg, match) => {
  const [coin, price] = match[1].split(" ");

  alerts.push({
    coin: coin.toLowerCase(),
    price: Number(price),
    chatId: msg.chat.id,
  });

  bot.sendMessage(msg.chat.id, `✅ Alert set for ${coin.toUpperCase()} at $${price}`);
});

bot.onText(/\/alerts/, (msg) => {
  if (alerts.length === 0) {
    return bot.sendMessage(msg.chat.id, "No alerts set.");
  }

  let text = "🔔 Active Alerts:\n";
  alerts.forEach((a, i) => {
    text += `${i + 1}. ${a.coin.toUpperCase()} → $${a.price}\n`;
  });

  bot.sendMessage(msg.chat.id, text);
});

// ===== CHECK LOOP =====
setInterval(async () => {
  if (alerts.length === 0) return;

  const prices = await getPrices();
  if (!prices) return;

  alerts = alerts.filter(alert => {
    const current =
      alert.coin === 'btc' ? prices.btc :
      alert.coin === 'eth' ? prices.eth :
      prices.sol;

    if (current >= alert.price) {
      bot.sendMessage(
        alert.chatId,
        `🚨 ALERT TRIGGERED

${alert.coin.toUpperCase()} hit $${current}`
      );
      return false;
    }

    return true;
  });
}, 10000);
