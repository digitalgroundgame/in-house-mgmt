import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, userEvent, waitFor } from "../../../test-utils/render";
import AddUserModal from "./AddUserModal";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { Group } from "./UsersSection";

const mockGroups: Group[] = [
  { id: 1, name: "ORGANIZER" },
  { id: 2, name: "HELPER" },
  { id: 3, name: "TRAINEE" },
];

const server = setupServer();

beforeEach(() => {
  server.listen({ onUnhandledRequest: "warn" });
  server.use(
    http.post("/api/management/users/", async ({ request }) => {
      const body = (await request.json()) as {
        username: string;
        email?: string;
        discord_id?: string;
      };

      if (!body.email && !body.discord_id) {
        return HttpResponse.json(
          { detail: ["Either email or Discord ID is required for authentication."] },
          { status: 400 }
        );
      }

      return HttpResponse.json({
        id: 999,
        username: body.username,
        email: body.email || "",
        first_name: "",
        last_name: "",
        groups: [],
        primary_email: body.email || "",
      });
    })
  );
});

afterEach(() => {
  server.close();
});

describe("AddUserModal", () => {
  const defaultProps = {
    opened: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    groups: mockGroups,
  };

  describe("form validation", () => {
    it("requires username", async () => {
      const user = userEvent.setup();
      render(<AddUserModal {...defaultProps} />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.click(screen.getByRole("button", { name: /create user/i }));

      await waitFor(() => {
        expect(screen.getByText(/username is required/i)).toBeInTheDocument();
      });
    });

    it("validates email format", async () => {
      const user = userEvent.setup();
      render(<AddUserModal {...defaultProps} />);

      await user.type(screen.getByLabelText(/username/i), "testuser");
      await user.type(screen.getByLabelText(/discord id/i), "123456789");
      await user.type(screen.getByLabelText(/email/i), "invalid-email");
      await user.click(screen.getByRole("button", { name: /create user/i }));

      await waitFor(() => {
        expect(screen.getByText(/valid email/i)).toBeInTheDocument();
      });
    });
  });

  describe("form submission", () => {
    it("calls onSuccess on successful creation", async () => {
      const user = userEvent.setup();
      render(<AddUserModal {...defaultProps} />);

      await user.type(screen.getByLabelText(/username/i), "newuser");
      await user.type(screen.getByLabelText(/email/i), "newuser@example.com");
      await user.click(screen.getByRole("button", { name: /create user/i }));

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    it("resets form on open after close", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<AddUserModal {...defaultProps} />);

      await user.type(screen.getByLabelText(/username/i), "testuser");

      rerender(<AddUserModal {...defaultProps} opened={false} />);
      rerender(<AddUserModal {...defaultProps} opened={true} />);

      expect(screen.getByLabelText(/username/i)).toHaveValue("");
    });
  });

  describe("groups selection", () => {
    it("displays groups in multiselect", async () => {
      render(<AddUserModal {...defaultProps} />);
      expect(screen.getByText("Groups")).toBeInTheDocument();
    });
  });

  describe("Cancel button", () => {
    it("calls onClose when clicked", async () => {
      const user = userEvent.setup();
      render(<AddUserModal {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });
});
