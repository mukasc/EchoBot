import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WebRtcRecorder from './WebRtcRecorder';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock react-i18next to correctly support default value strings
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (typeof options === 'string') return options;
      if (options && typeof options === 'object' && options.defaultValue) {
        return options.defaultValue;
      }
      return key;
    }
  })
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    loading: vi.fn()
  }
}));

// Mock api client
vi.mock('../../lib/api', () => ({
  default: {
    post: vi.fn(() => Promise.resolve({ data: new Blob() }))
  }
}));

describe('WebRtcRecorder component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      fill: vi.fn(),
      createLinearGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn()
      })
    });

    // Mock mediaDevices API
    const mockStream = {
      getTracks: () => [{ stop: vi.fn() }]
    };
    
    if (!global.navigator.mediaDevices) {
      Object.defineProperty(global.navigator, 'mediaDevices', {
        writable: true,
        value: {}
      });
    }
    global.navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue(mockStream);
    global.navigator.mediaDevices.enumerateDevices = vi.fn().mockResolvedValue([
      { kind: 'audioinput', deviceId: 'default-mic', label: 'Default Microphone' }
    ]);

    // Mock AudioContext & AnalyserNode on global & window using Object.defineProperty
    const mockAudioContext = vi.fn().mockImplementation(function() {
      return {
        createAnalyser: () => ({
          fftSize: 0,
          frequencyBinCount: 32,
          getByteFrequencyData: vi.fn()
        }),
        createMediaStreamSource: () => ({
          connect: vi.fn()
        }),
        close: vi.fn()
      };
    });

    Object.defineProperty(global, 'AudioContext', { value: mockAudioContext, writable: true, configurable: true });
    Object.defineProperty(global, 'webkitAudioContext', { value: mockAudioContext, writable: true, configurable: true });
    Object.defineProperty(window, 'AudioContext', { value: mockAudioContext, writable: true, configurable: true });
    Object.defineProperty(window, 'webkitAudioContext', { value: mockAudioContext, writable: true, configurable: true });

    // Mock MediaRecorder using Object.defineProperty
    const mockMediaRecorder = vi.fn().mockImplementation(function() {
      return {
        start: vi.fn(),
        stop: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        mimeType: 'audio/webm'
      };
    });
    mockMediaRecorder.isTypeSupported = vi.fn().mockReturnValue(true);

    Object.defineProperty(global, 'MediaRecorder', { value: mockMediaRecorder, writable: true, configurable: true });
    Object.defineProperty(window, 'MediaRecorder', { value: mockMediaRecorder, writable: true, configurable: true });

    // Mock requestAnimationFrame to prevent loops/leaks
    global.requestAnimationFrame = vi.fn().mockImplementation(cb => setTimeout(cb, 0));
    global.cancelAnimationFrame = vi.fn().mockImplementation(id => clearTimeout(id));
    window.requestAnimationFrame = global.requestAnimationFrame;
    window.cancelAnimationFrame = global.cancelAnimationFrame;
  });

  it('renders WebRtcRecorder with microfone selector and speaker name input', async () => {
    render(<WebRtcRecorder />);

    expect(screen.getByText('Gravador WebRTC')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Default Microphone')).toBeInTheDocument();
    });

    const speakerInput = screen.getByPlaceholderText('Ex: Mestre, Jogador 1');
    expect(speakerInput).toBeInTheDocument();
    expect(speakerInput.value).toBe('Jogador');
  });

  it('starts and stops recording flow', async () => {
    const consoleSpy = vi.spyOn(console, 'error');
    render(<WebRtcRecorder />);

    // Wait for the microphone list to load so that the button is not disabled
    await waitFor(() => {
      expect(screen.getByText('Default Microphone')).toBeInTheDocument();
    });

    const startBtn = screen.getByRole('button', { name: /Iniciar Gravação/i });
    expect(startBtn).toBeInTheDocument();
    expect(startBtn.disabled).toBe(false);

    // Click start recording
    fireEvent.click(startBtn);

    await waitFor(() => {
      if (consoleSpy.mock.calls.length > 0) {
        console.log("CONSOLE ERROR CALLED:", consoleSpy.mock.calls);
      }
      expect(screen.getByText('Parar e Salvar')).toBeInTheDocument();
    });

    const pauseBtn = screen.getByText('Pausar');
    expect(pauseBtn).toBeInTheDocument();

    // Pause recording
    fireEvent.click(pauseBtn);
    
    await waitFor(() => {
      expect(screen.getByText('Retomar')).toBeInTheDocument();
    });

    // Stop recording
    const stopBtn = screen.getByText('Parar e Salvar');
    fireEvent.click(stopBtn);
  });
});
