import { describe, it, expect, vi, beforeEach } from 'vitest';
const { Events } = require('discord.js');
const DiscordBot = require('./discord-bot');

// Mock discord.js
vi.mock('discord.js', () => {
    return {
        Events: {
            ClientReady: 'ready',
            InteractionCreate: 'interactionCreate',
        },
        ChannelType: { GuildVoice: 2 },
        EmbedBuilder: vi.fn().mockImplementation(() => ({
            setTitle: vi.fn().mockReturnThis(),
            setDescription: vi.fn().mockReturnThis(),
            setColor: vi.fn().mockReturnThis(),
            addFields: vi.fn().mockReturnThis(),
            setTimestamp: vi.fn().mockReturnThis(),
            setFooter: vi.fn().mockReturnThis(),
        })),
        ActionRowBuilder: vi.fn().mockImplementation(() => ({
            addComponents: vi.fn().mockReturnThis(),
        })),
        ButtonBuilder: vi.fn().mockImplementation(() => ({
            setCustomId: vi.fn().mockReturnThis(),
            setLabel: vi.fn().mockReturnThis(),
            setStyle: vi.fn().mockReturnThis(),
            setEmoji: vi.fn().mockReturnThis(),
        })),
        ButtonStyle: { Danger: 4 },
        Colors: { Green: 0x57F287 },
    };
});

// Mock voice
vi.mock('@discordjs/voice', () => ({
    joinVoiceChannel: vi.fn(),
    VoiceConnectionStatus: { Ready: 'ready', Disconnected: 'disconnected' },
}));

// Mock API and Audio Manager
vi.mock('./api-client', () => ({
    getSession: vi.fn(),
    uploadAudio: vi.fn(),
}));
vi.mock('./audio-manager', () => ({
    subscribeUser: vi.fn(),
    rotateUserStream: vi.fn(),
    cleanup: vi.fn(),
    convertToOpus: vi.fn(),
}));

describe('DiscordBot', () => {
    let mockClient;
    let bot;
    let eventHandlers = {};

    beforeEach(() => {
        vi.clearAllMocks();
        eventHandlers = {};

        // Mock client behavior
        mockClient = {
            on: vi.fn((event, cb) => {
                eventHandlers[event] = cb;
            }),
            user: { tag: 'TestBot#0001', displayAvatarURL: vi.fn() },
            commands: new Map(),
            channels: {
                cache: {
                    get: vi.fn()
                }
            }
        };

        bot = new DiscordBot(mockClient);
    });

    it('should setup event listeners on initialization', () => {
        expect(mockClient.on).toHaveBeenCalledWith(Events.ClientReady, expect.any(Function));
        expect(mockClient.on).toHaveBeenCalledWith(Events.InteractionCreate, expect.any(Function));
    });

    it('should handle slash commands', async () => {
        const mockExecute = vi.fn();
        mockClient.commands.set('test', {
            data: { name: 'test' },
            execute: mockExecute
        });

        const mockInteraction = {
            isChatInputCommand: () => true,
            isButton: () => false,
            commandName: 'test',
            reply: vi.fn(),
        };

        // Trigger the interaction handler
        await eventHandlers[Events.InteractionCreate](mockInteraction);

        expect(mockExecute).toHaveBeenCalledWith(mockInteraction, bot);
    });

    it('should handle button interactions (stop_session)', async () => {
        const mockInteraction = {
            isChatInputCommand: () => false,
            isButton: () => true,
            customId: 'stop_session',
            guildId: '123',
            update: vi.fn(),
            reply: vi.fn(),
        };

        // Mock an active session
        const mockSession = {
            sessionId: 'sess_1',
            subscribedUsers: new Map(),
            centralStream: { unpipe: vi.fn(), end: vi.fn(), on: vi.fn() },
            outStream: { end: vi.fn(), on: vi.fn() },
            rotationTimer: 123,
        };
        bot.activeSessions.set('123', mockSession);

        // Spy on handleLeave
        const handleLeaveSpy = vi.spyOn(bot, 'handleLeave');

        // Trigger the interaction handler
        await eventHandlers[Events.InteractionCreate](mockInteraction);

        expect(handleLeaveSpy).toHaveBeenCalledWith(mockInteraction);
    });

    it('should show error if command does not exist', async () => {
        const mockInteraction = {
            isChatInputCommand: () => true,
            isButton: () => false,
            commandName: 'nonexistent',
            reply: vi.fn(),
        };

        await eventHandlers[Events.InteractionCreate](mockInteraction);
        // Should return early and not call anything
        expect(mockInteraction.reply).not.toHaveBeenCalled();
    });
});
