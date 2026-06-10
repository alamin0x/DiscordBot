const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const http = require('http');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Discord থেকে n8n এ message পাঠানো
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channelId !== process.env.CHANNEL_ID) return;

  try {
    await axios.post(process.env.WEBHOOK_URL, {
      username: message.author.username,
      userId: message.author.id,
      content: message.content,
      channelId: message.channelId,
      messageId: message.id,
      timestamp: message.createdTimestamp
    });
  } catch (err) {
    console.error('Webhook error:', err.message);
  }
});

// n8n থেকে Discord এ message পাঠানো
const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/send') {
    res.writeHead(404);
    res.end();
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { channelId, message } = JSON.parse(body);
      const channel = await client.channels.fetch(channelId);
      await channel.send(message);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      console.error('Send error:', err.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log('HTTP server ready');
});

client.once('ready', () => {
  console.log(`Bot online: ${client.user.tag}`);
});

client.login(process.env.BOT_TOKEN);
