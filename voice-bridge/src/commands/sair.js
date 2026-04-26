const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sair')
        .setDescription('Faz o bot sair do canal de voz e finalizar a gravação.'),
    async execute(interaction, bot) {
        await bot.handleLeave(interaction);
    },
};
