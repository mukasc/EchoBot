import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SessionCard from './SessionCard';
import { describe, it, expect, vi } from 'vitest';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe('SessionCard component', () => {
  const mockSession = {
    id: 'test-123',
    name: 'Epic Adventure',
    status: 'completed',
    created_at: '2024-01-01T12:00:00Z',
    game_system: 'Vampire',
    cover_image_url: 'http://example.com/image.jpg'
  };

  const mockOnDelete = vi.fn();

  const renderCard = (session = mockSession) => {
    return render(
      <BrowserRouter>
        <SessionCard session={session} onDelete={mockOnDelete} />
      </BrowserRouter>
    );
  };

  it('renders session details correctly', () => {
    renderCard();
    
    expect(screen.getByText('Epic Adventure')).toBeInTheDocument();
    expect(screen.getByText('Vampire')).toBeInTheDocument();
    expect(screen.getByText('Concluída')).toBeInTheDocument(); // translated status
  });

  it('calls onDelete when delete button is clicked and confirmed', () => {
    // Mock window.confirm
    vi.stubGlobal('confirm', vi.fn(() => true));
    
    renderCard();
    
    const deleteBtn = screen.getByTitle('Excluir sessão');
    fireEvent.click(deleteBtn);
    
    expect(mockOnDelete).toHaveBeenCalledWith('test-123');
  });

  it('copies session ID to clipboard', async () => {
    // Mock clipboard API
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', {
      clipboard: { writeText }
    });
    
    renderCard();
    
    const copyBtn = screen.getByTitle('Copiar ID da sessão');
    fireEvent.click(copyBtn);
    
    expect(writeText).toHaveBeenCalledWith('test-123');
  });
});
