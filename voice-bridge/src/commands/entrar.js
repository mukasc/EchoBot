const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('entrar')
        .setDescription('Faz o bot entrar no seu canal de voz e iniciar uma sessão de gravação.')
        .addStringOption(option => 
            option.setName('sessao_id')
                .setDescription('O ID da sessão no EchoBot')
                .setRequired(true)),
    async execute(interaction, bot) {
        await bot.handleJoin(interaction);
    },
};
