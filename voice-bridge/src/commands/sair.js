const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sair')
        .setDescription('Faz o bot sair do canal de voz e finalizar a gravação.')
        .setDescriptionLocalizations({
            'en-US': 'Makes the bot leave the voice channel and end the recording.',
            'pt-BR': 'Faz o bot sair do canal de voz e finalizar a gravação.'
        }),
    async execute(interaction, bot) {
        await bot.handleLeave(interaction);
    },
};
