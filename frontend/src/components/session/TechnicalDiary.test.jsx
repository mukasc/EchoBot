import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TechnicalDiary from './TechnicalDiary';
import { describe, it, expect, vi } from 'vitest';
import { useTranslation } from 'react-i18next';

// Mock react-i18next to return direct keys or simple mock translation mapping
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      const translations = {
        'components.technicalDiary.title': 'Technical Diary',
        'components.technicalDiary.processedBy': 'Processed by',
        'components.technicalDiary.regenerateDiary': 'Regenerate',
        'components.technicalDiary.empty': 'No diary entries found.',
        'session.diaryCategory.npc': 'NPC',
        'session.diaryCategory.location': 'Location',
        'session.diaryCategory.item': 'Item',
        'session.diaryCategory.xp': 'XP',
        'session.diaryCategory.event': 'Event',
        'session.diaryCategory.quest': 'Quest',
        'session.diaryCategory.interaction': 'Interaction',
      };
      return translations[key] || options?.defaultValue || key;
    }
  })
}));

describe('TechnicalDiary component', () => {
  const mockEntries = [
    {
      id: 'entry-1',
      category: 'npc',
      name: 'Valerius',
      description: 'The ancient vampire king.'
    },
    {
      id: 'entry-2',
      category: 'quest',
      name: 'Slay the Dragon',
      description: 'Kill the red dragon in the cave.',
      status: 'Concluída'
    },
    {
      id: 'entry-3',
      category: 'interaction',
      name: 'Critical Success',
      description: 'Thorin rolled a natural 20 to persuade the guard.',
      player_name: 'Thorin (Alex)'
    }
  ];

  const mockMetadata = {
    provider: 'gemini',
    model: 'gemini-2.0-flash'
  };

  const mockOnRegenerate = vi.fn();
  const mockOnExportMD = vi.fn();
  const mockOnExportPDF = vi.fn();
  const mockOnExportNotion = vi.fn();

  const renderComponent = (entries = mockEntries, processing = false) => {
    return render(
      <TechnicalDiary
        entries={entries}
        metadata={mockMetadata}
        onRegenerate={mockOnRegenerate}
        processing={processing}
        onExportMD={mockOnExportMD}
        onExportPDF={mockOnExportPDF}
        onExportNotion={mockOnExportNotion}
      />
    );
  };

  it('renders Technical Diary elements and metadata successfully', () => {
    renderComponent();

    expect(screen.getByText('Technical Diary')).toBeInTheDocument();
    expect(screen.getByText(/gemini/i)).toBeInTheDocument();
    expect(screen.getByText(/gemini-2.0-flash/i)).toBeInTheDocument();
  });

  it('renders list of entries with correct categories, quest status badges, and player name badges', () => {
    renderComponent();

    // Valerius NPC
    expect(screen.getByText('Valerius')).toBeInTheDocument();
    expect(screen.getByText('The ancient vampire king.')).toBeInTheDocument();
    expect(screen.getByText('NPC')).toBeInTheDocument();

    // Slay the Dragon Quest with 'Concluída' status badge
    expect(screen.getByText('Slay the Dragon')).toBeInTheDocument();
    expect(screen.getByText('Kill the red dragon in the cave.')).toBeInTheDocument();
    expect(screen.getByText('Quest')).toBeInTheDocument();
    expect(screen.getByText('Concluída')).toBeInTheDocument();

    // Critical Success Interaction with player name badge 'Thorin (Alex)'
    expect(screen.getByText('Critical Success')).toBeInTheDocument();
    expect(screen.getByText('Thorin rolled a natural 20 to persuade the guard.')).toBeInTheDocument();
    expect(screen.getByText('Interaction')).toBeInTheDocument();
    expect(screen.getByText('Thorin (Alex)')).toBeInTheDocument();
  });

  it('calls respective action handlers when buttons are clicked', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Click Regenerate
    const regenerateBtn = screen.getByText('Regenerate');
    await user.click(regenerateBtn);
    expect(mockOnRegenerate).toHaveBeenCalledOnce();

    // Click MD Export
    const mdBtn = screen.getByTitle('components.technicalDiary.exportMD');
    await user.click(mdBtn);
    expect(mockOnExportMD).toHaveBeenCalledOnce();

    // Click PDF Export
    const pdfBtn = screen.getByTitle('components.technicalDiary.exportPDF');
    await user.click(pdfBtn);
    expect(mockOnExportPDF).toHaveBeenCalledOnce();

    // Click Notion Export
    const notionBtn = screen.getByTitle('components.technicalDiary.syncNotion');
    await user.click(notionBtn);
    expect(mockOnExportNotion).toHaveBeenCalledOnce();
  });

  it('renders empty state when no entries are provided', () => {
    renderComponent([]);

    expect(screen.getByText('No diary entries found.')).toBeInTheDocument();
  });
});
