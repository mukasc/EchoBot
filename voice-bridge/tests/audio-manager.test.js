import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use standard vi.mock for prism and fs
vi.mock('fs', () => ({
  createWriteStream: vi.fn(() => ({
    on: vi.fn(),
    pipe: vi.fn().mockReturnThis(),
    unpipe: vi.fn().mockReturnThis(),
    end: vi.fn(),
  })),
  existsSync: vi.fn(() => true),
  unlinkSync: vi.fn(),
}));

const mockDecoderInstance = {
  on: vi.fn(),
  pipe: vi.fn().mockReturnThis(),
  unpipe: vi.fn().mockReturnThis(),
};
vi.mock('prism-media', () => ({
  opus: {
    Decoder: vi.fn(() => mockDecoderInstance),
  },
}));

vi.mock('../src/config', () => ({
  ffmpegPath: 'ffmpeg-mock',
  tempDir: '/tmp',
}));

// Mock child_process BEFORE requiring audio-manager
const cp = require('child_process');
const execSpy = vi.spyOn(cp, 'exec').mockImplementation((cmd, cb) => {
  if (cb) cb(null);
  return { on: vi.fn() };
});

// Import audioManager
const audioManager = require('../src/audio-manager');

describe('AudioManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('subscribeUser creates a new user data structure', () => {
    const mockOpusStream = {
      pipe: vi.fn().mockReturnThis(),
    };
    const mockReceiver = {
      subscribe: vi.fn(() => mockOpusStream),
    };
    const subscribedUsers = new Map();
    const userId = 'user123';
    const sessionId = 'session456';

    audioManager.subscribeUser(mockReceiver, userId, sessionId, subscribedUsers);

    expect(subscribedUsers.has(userId)).toBe(true);
  });

  it('rotateUserStream switches to a new chunk file', () => {
    const subscribedUsers = new Map();
    const userId = 'user123';
    const mockStream = { end: vi.fn() };
    
    subscribedUsers.set(userId, {
      stream: mockStream,
      file: 'old.pcm',
      decoder: mockDecoderInstance
    });

    const result = audioManager.rotateUserStream(userId, 'session456', subscribedUsers, 1);

    expect(result.oldFile).toBe('old.pcm');
    expect(subscribedUsers.get(userId).file).toContain('chunk_1.pcm');
  });

  it('convertToOpus generates correct FFmpeg command', async () => {
    const pcmFile = 'input.pcm';
    const oggFile = 'output.ogg';

    audioManager.ffmpegPath = 'ffmpeg-mock';

    await audioManager.convertToOpus(pcmFile, oggFile);

    expect(execSpy).toHaveBeenCalledWith(
      expect.stringContaining(`ffmpeg-mock -y -f s16le -ar 48000 -ac 1 -i "input.pcm"`),
      expect.any(Function)
    );
  });
});
