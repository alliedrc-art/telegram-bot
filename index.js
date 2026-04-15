const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_TOKEN;
const chatId = process.env.CHAT_ID;

const bot = new TelegramBot(token, { polling: true });

// Startup message
bot.sendMessage(chatId, "🚀 Bot is LIVE on Railway!");

// Test reply
bot.on('message', (msg) => {
  if (msg.text === 'test') {
    bot.sendMessage(msg.chat.id, '✅ Working');
  }
});
