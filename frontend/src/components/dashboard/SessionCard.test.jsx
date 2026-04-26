import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('calls onDelete when delete button is clicked and confirmed', async () => {
    const user = userEvent.setup();
    renderCard();
    
    // Open the alert dialog
    const deleteBtn = screen.getByLabelText('Excluir sessão');
    await user.click(deleteBtn);
    
    // Find and click the confirm action button in the dialog
    // Radix UI portals the content, so it should be in the document
    const confirmBtn = await screen.findByText('Excluir', { selector: 'button' });
    await user.click(confirmBtn);
    
    expect(mockOnDelete).toHaveBeenCalledWith('test-123');
  });

  it('copies session ID to clipboard', async () => {
    const user = userEvent.setup();
    // Mock clipboard API
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', {
      clipboard: { writeText }
    });
    
    renderCard();
    
    // There are multiple "Copiar ID da sessão" buttons (one in hover, one at bottom)
    // We'll use getAllByLabelText and click the first one
    const copyBtns = screen.getAllByLabelText('Copiar ID da sessão');
    await user.click(copyBtns[0]);
    
    expect(writeText).toHaveBeenCalledWith('test-123');
  });
});
