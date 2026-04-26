const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');
const { getSettings } = require('./api-client');

async function deploy() {
    let token = config.discordToken;

    if (!token) {
        console.log('⏳ Buscando token no backend...');
        const settings = await getSettings();
        token = settings?.discord_bot_token;
    }

    if (!token) {
        console.error('❌ Token não encontrado. Configure no .env ou no Backend.');
        process.exit(1);
    }

    const commands = [];
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        }
    }

    const rest = new REST().setToken(token);

    try {
        console.log(`⏳ Iniciando atualização de ${commands.length} comandos globais...`);

        // Busca o CLIENT_ID (bot ID)
        // Uma forma simples é fazer um request fake ou decodificar o token
        // Mas o Discord.js permite pegar o ID após o login. 
        // Aqui vamos usar o token para pegar as infos do bot primeiro.
        const userData = await rest.get(Routes.user());
        const clientId = userData.id;

        console.log(`🤖 Bot ID: ${clientId}`);

        // Para registro GLOBAL (pode levar até 1 hora para propagar)
        console.log('⏳ Registrando comandos globais...');
        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );

        // Para registro em um servidor específico (INSTANTÂNEO para testes):
        /*
        const guildId = 'ID_DO_SEU_SERVIDOR';
        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );
        */

        console.log(`✅ Sucesso! ${data.length} comandos registrados.`);
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
    }
}

deploy();
