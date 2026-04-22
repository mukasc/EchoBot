/**
 * EchoBot - O Cronista das Sombras
 * Copyright (C) 2026 mukas
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

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
