const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('entrar')
        .setDescription('Faz o bot entrar no seu canal de voz e iniciar uma sessão de gravação.')
        .setDescriptionLocalizations({
            'en-US': 'Makes the bot join your voice channel and start a recording session.',
            'pt-BR': 'Faz o bot entrar no seu canal de voz e iniciar uma sessão de gravação.'
        })
        .addStringOption(option => 
            option.setName('sessao_id')
                .setDescription('O ID da sessão no EchoBot (opcional para gravação avulsa)')
                .setDescriptionLocalizations({
                    'en-US': 'The session ID in EchoBot (optional for standalone recording)',
                    'pt-BR': 'O ID da sessão no EchoBot (opcional para gravação avulsa)'
                })
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('duracao_chunk')
                .setDescription('Duração de cada parte gravada em minutos (padrão: 20)')
                .setDescriptionLocalizations({
                    'en-US': 'Duration of each recorded chunk in minutes (default: 20)',
                    'pt-BR': 'Duração de cada parte gravada em minutos (padrão: 20)'
                })
                .setRequired(false)),
    async execute(interaction, bot) {
        await bot.handleJoin(interaction);
    },
};
