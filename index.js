const https = require("https");

const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

function sendMessage(text) {
  const url = "https://api.telegram.org/bot" + TOKEN + "/sendMessage?chat_id=" + CHAT_ID + "&text=" + encodeURIComponent(text);

  https.get(url, function(res) {
    console.log("Message sent");
  }).on("error", function(e) {
    console.error(e);
  });
}

sendMessage("Bot is LIVE on Railway!");
