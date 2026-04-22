const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');
const DiscordBot = require('./discord-bot');

// Inicializa o cliente Discord com os intents configurados
const client = new Client({
    intents: config.intents.map(intent => GatewayIntentBits[intent]),
});

// Inicializa a lógica do Bot
const bot = new DiscordBot(client);

// Login
client.login(config.discordToken).catch(err => {
    console.error('❌ Falha ao fazer login no Discord:', err.message);
    process.exit(1);
});

// Tratamento de encerramento gracioso
process.on('SIGINT', () => {
    console.log('\n👋 Encerrando Voice Bridge...');
    client.destroy();
    process.exit(0);
});
