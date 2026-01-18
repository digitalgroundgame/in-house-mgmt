import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent, within } from '../../test-utils/render';
import ContactTable, { Contact, Tag } from './ContactTable';

const mockTags: Tag[] = [
  { id: 1, name: 'Volunteer', color: 'blue' },
  { id: 2, name: 'Active', color: 'green' },
  { id: 3, name: 'Leader', color: 'red' },
  { id: 4, name: 'New', color: 'yellow' },
  { id: 5, name: 'VIP', color: 'purple' }
];

const mockContacts: Contact[] = [
  {
    id: 1,
    discord_id: '123456',
    full_name: 'Alice Smith',
    email: 'alice@example.com',
    phone: '555-1234',
    tags: [mockTags[0], mockTags[1]]
  },
  {
    id: 2,
    discord_id: '789012',
    full_name: 'Bob Jones',
    email: null,
    phone: null,
    tags: []
  },
  {
    id: 3,
    discord_id: '345678',
    full_name: 'Charlie Brown',
    email: 'charlie@example.com',
    phone: null,
    tags: mockTags
  }
];

describe('ContactTable', () => {
  describe('contact info formatting', () => {
    it('shows email and phone separated by bullet', () => {
      render(<ContactTable contacts={[mockContacts[0]]} />);
      expect(screen.getByText('alice@example.com • 555-1234')).toBeInTheDocument();
    });

    it('shows only email when phone is null', () => {
      render(<ContactTable contacts={[mockContacts[2]]} />);
      expect(screen.getByText('charlie@example.com')).toBeInTheDocument();
    });

    it('shows only phone when email is null', () => {
      const contactWithPhoneOnly: Contact = {
        id: 4,
        discord_id: '999999',
        full_name: 'Phone Only',
        email: null,
        phone: '555-9999',
        tags: []
      };
      render(<ContactTable contacts={[contactWithPhoneOnly]} />);
      expect(screen.getByText('555-9999')).toBeInTheDocument();
    });

    it('shows "No contact info" when both are null', () => {
      render(<ContactTable contacts={[mockContacts[1]]} />);
      expect(screen.getByText('No contact info')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty message when no contacts', () => {
      render(<ContactTable contacts={[]} />);
      expect(screen.getByText('No contacts found.')).toBeInTheDocument();
    });
  });

  describe('tag display', () => {
    it('shows "No tags" when contact has no tags', () => {
      render(<ContactTable contacts={[mockContacts[1]]} />);
      expect(screen.getByText('No tags')).toBeInTheDocument();
    });

    it('shows all tags when 3 or fewer', () => {
      render(<ContactTable contacts={[mockContacts[0]]} />);
      expect(screen.getByText('Volunteer')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('shows first 3 tags plus overflow count when more than 3', () => {
      render(<ContactTable contacts={[mockContacts[2]]} />);
      expect(screen.getByText('Volunteer')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Leader')).toBeInTheDocument();
      expect(screen.getByText('+2')).toBeInTheDocument();
      expect(screen.queryByText('New')).not.toBeInTheDocument();
      expect(screen.queryByText('VIP')).not.toBeInTheDocument();
    });
  });

  describe('row interaction', () => {
    it('calls onRowClick with contact when row clicked', async () => {
      const user = userEvent.setup();
      const onRowClick = vi.fn();
      render(<ContactTable contacts={[mockContacts[0]]} onRowClick={onRowClick} />);

      await user.click(screen.getByText('Alice Smith'));
      expect(onRowClick).toHaveBeenCalledWith(mockContacts[0]);
    });

    it('does not error when row clicked without onRowClick handler', async () => {
      const user = userEvent.setup();
      render(<ContactTable contacts={[mockContacts[0]]} />);

      await user.click(screen.getByText('Alice Smith'));
      // Should not throw
    });
  });

  describe('row interaction (selection-aware)', () => {
    it('calls onRowClick when no rows are selected and row is clicked', async () => {
      const user = userEvent.setup();
      const onRowClick = vi.fn();
      const toggleSelect = vi.fn();

      render(
        <ContactTable
          contacts={[mockContacts[0]]}
          onRowClick={onRowClick}
          selectedIds={new Set()}
          toggleSelect={toggleSelect}
        />
      );

      await user.click(screen.getByText('Alice Smith'));

      expect(onRowClick).toHaveBeenCalledWith(mockContacts[0]);
      expect(toggleSelect).not.toHaveBeenCalled();
    });

    it('calls toggleSelect when row checkbox is clicked', async () => {
      const user = userEvent.setup();
      const toggleSelect = vi.fn();
      const onRowClick = vi.fn();

      render(
        <ContactTable
          contacts={[mockContacts[0]]}
          onRowClick={onRowClick}
          selectedIds={new Set([mockContacts[0].id])}
          toggleSelect={toggleSelect}
        />
      );

      // Scope to row to avoid header checkbox
      const row = screen.getByText('Alice Smith').closest('tr')!;
      const checkbox = within(row).getByRole('checkbox');

      await user.click(checkbox);

      expect(toggleSelect).toHaveBeenCalledWith(mockContacts[0].id);
      expect(onRowClick).not.toHaveBeenCalled();
    });

    it('calls toggleSelect when a row is clicked and some rows are already selected', async () => {
      const user = userEvent.setup();
      const onRowClick = vi.fn();
      const toggleSelect = vi.fn();

      render(
        <ContactTable
          contacts={[mockContacts[0]]}
          onRowClick={onRowClick}
          selectedIds={new Set([999])} // simulate existing selection
          toggleSelect={toggleSelect}
        />
      );

      await user.click(screen.getByText('Alice Smith'));

      expect(toggleSelect).toHaveBeenCalledWith(mockContacts[0].id);
      expect(onRowClick).not.toHaveBeenCalled();
    });
  });

  describe('pagination', () => {
    it('shows pagination when multiple pages exist', () => {
      const onPageChange = vi.fn();
      render(
        <ContactTable
          contacts={mockContacts}
          totalPages={3}
          currentPage={1}
          onPageChange={onPageChange}
        />
      );
      // Mantine Pagination renders page number buttons
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
    });

    it('hides pagination when only one page', () => {
      render(<ContactTable contacts={mockContacts} totalPages={1} />);
      // No page buttons should exist when there's only one page
      expect(screen.queryByRole('button', { name: '1' })).not.toBeInTheDocument();
    });

    it('calls onPageChange when page is selected', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      render(
        <ContactTable
          contacts={mockContacts}
          totalPages={3}
          currentPage={1}
          onPageChange={onPageChange}
        />
      );

      await user.click(screen.getByRole('button', { name: '2' }));
      expect(onPageChange).toHaveBeenCalledWith(2);
    });
  });

  describe('select-all checkbox behavior', () => {
    it('selects all rows when none are selected', async () => {
      const user = userEvent.setup();
      const toggleSelect = vi.fn();

      render(
        <ContactTable
          contacts={mockContacts}
          selectedIds={new Set()}
          toggleSelect={toggleSelect}
        />
      );

      await user.click(screen.getAllByRole('checkbox')[0]);

      expect(toggleSelect).toHaveBeenCalledTimes(mockContacts.length);
      mockContacts.forEach(c =>
        expect(toggleSelect).toHaveBeenCalledWith(c.id)
      );
    });

    it('clears all rows when all are selected', async () => {
      const user = userEvent.setup();
      const toggleSelect = vi.fn();

      render(
        <ContactTable
          contacts={mockContacts}
          selectedIds={new Set(mockContacts.map(c => c.id))}
          toggleSelect={toggleSelect}
        />
      );

      await user.click(screen.getAllByRole('checkbox')[0]);

      expect(toggleSelect).toHaveBeenCalledTimes(mockContacts.length);
    });
  });

  it('shows indeterminate state when some rows are selected', () => {
    render(
      <ContactTable
        contacts={mockContacts}
        selectedIds={new Set([mockContacts[0].id])}
        toggleSelect={vi.fn()}
      />
    );

    const selectAll = screen.getAllByRole('checkbox')[0];
    expect(selectAll).toHaveAttribute('data-indeterminate', 'true');
  });

  describe('title', () => {
    it('shows title with count by default', () => {
      render(<ContactTable contacts={mockContacts} />);
      expect(screen.getByText('Contacts (3)')).toBeInTheDocument();
    });

    it('hides title when showTitle is false', () => {
      render(<ContactTable contacts={mockContacts} showTitle={false} />);
      expect(screen.queryByText(/Contacts \(\d+\)/)).not.toBeInTheDocument();
    });
  });
});
