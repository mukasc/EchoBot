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
const { getSettings } = require('./api-client');
const fs = require('fs');
const path = require('path');

async function start() {
    console.log('⏳ [Voice Bridge] Aguardando configurações do Backend...');
    
    let token = config.discordToken;
    let retries = 0;
    const maxRetries = 20; // ~1 minute

    // Se não tem token no config (provavelmente removido do .env), busca no backend
    while (!token && retries < maxRetries) {
        const settings = await getSettings();
        if (settings && settings.discord_bot_token) {
            token = settings.discord_bot_token;
            console.log('✅ [Voice Bridge] Token do Discord recuperado do Backend.');
            break;
        }
        
        retries++;
        if (retries % 5 === 0) {
            console.log(`⏳ [Voice Bridge] Backend ainda não configurado ou indisponível (Tentativa ${retries}/${maxRetries})...`);
        }
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    if (!token) {
        console.error('❌ [Voice Bridge] Erro: Token do Discord não encontrado no .env nem no Backend.');
        console.error('👉 Por favor, configure o Token na tela de Configurações do EchoBot.');
        process.exit(1);
    }

    // Inicializa o cliente Discord com os intents configurados
    const client = new Client({
        intents: config.intents.map(intent => GatewayIntentBits[intent]),
    });

    // Carrega comandos
    client.commands = new Map();
    const commandsPath = path.join(__dirname, 'commands');
    if (fs.existsSync(commandsPath)) {
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            }
        }
    }

    // Inicializa a lógica do Bot
    const bot = new DiscordBot(client);

    // Login
    client.login(token).catch(err => {
        console.error('❌ Falha ao fazer login no Discord:', err.message);
        console.error('💡 Verifique se o token inserido nas Configurações é válido.');
        process.exit(1);
    });

    // Tratamento de encerramento gracioso
    process.on('SIGINT', () => {
        console.log('\n👋 Encerrando Voice Bridge...');
        client.destroy();
        process.exit(0);
    });
}

start();
