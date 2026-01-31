import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "../../test-utils/render";
import RolesTable, { ContactWithRole } from "./RolesTable";

describe("RolesTable", () => {
  const mockContacts: ContactWithRole[] = [
    { id: 1, discord_id: "123", full_name: "Alice", access_level: null },
    { id: 2, discord_id: "456", full_name: "Bob", access_level: 0 },
    { id: 3, discord_id: "789", full_name: "Charlie", access_level: 1 },
    { id: 4, discord_id: "012", full_name: "Diana", access_level: 2 },
  ];

  describe("access level labels", () => {
    it('displays "No Access" for null access_level', () => {
      render(<RolesTable contacts={[mockContacts[0]]} />);
      expect(screen.getByText("No Access")).toBeInTheDocument();
    });

    it('displays "Needs Approval" for access_level 0', () => {
      render(<RolesTable contacts={[mockContacts[1]]} />);
      expect(screen.getByText("Needs Approval")).toBeInTheDocument();
    });

    it('displays "Organizer" for access_level 1', () => {
      render(<RolesTable contacts={[mockContacts[2]]} />);
      expect(screen.getByText("Organizer")).toBeInTheDocument();
    });

    it('displays "Admin" for access_level 2', () => {
      render(<RolesTable contacts={[mockContacts[3]]} />);
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows empty message when no contacts", () => {
      render(<RolesTable contacts={[]} />);
      expect(screen.getByText(/no contacts found/i)).toBeInTheDocument();
    });
  });

  describe("action buttons", () => {
    it("shows Assign button for contact with no access", () => {
      const onAssign = vi.fn();
      render(<RolesTable contacts={[mockContacts[0]]} onAssignRole={onAssign} />);
      expect(screen.getByRole("button", { name: /assign/i })).toBeInTheDocument();
    });

    it("shows Edit and Remove buttons for contact with access", () => {
      const onEdit = vi.fn();
      const onRemove = vi.fn();
      render(
        <RolesTable contacts={[mockContacts[2]]} onEditRole={onEdit} onRemoveRole={onRemove} />
      );
      expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
    });

    it("calls onAssignRole when Assign is clicked", async () => {
      const user = userEvent.setup();
      const onAssign = vi.fn();
      render(<RolesTable contacts={[mockContacts[0]]} onAssignRole={onAssign} />);
      await user.click(screen.getByRole("button", { name: /assign/i }));
      expect(onAssign).toHaveBeenCalledWith(mockContacts[0]);
    });
  });
});
