const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, '🚀 Atlas system ready');
});

bot.on('message', (msg) => {
  if (msg.text && msg.text.toLowerCase() === 'test') {
    bot.sendMessage(msg.chat.id, '✅ Working');
  }
});
bot.onText(/\/price/, (msg) => {
  bot.sendMessage(msg.chat.id, 'BTC: $67,000');
});
