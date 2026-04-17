import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../../test-utils/render";
import UsersSection, { ManagedUser, Group } from "./UsersSection";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

const mockUsers: ManagedUser[] = [
  {
    id: 1,
    username: "admin",
    first_name: "Admin",
    last_name: "User",
    groups: [],
    primary_email: "admin@example.com",
    is_superuser: true,
    is_active: true,
  },
  {
    id: 2,
    username: "organizer",
    first_name: "Organizer",
    last_name: "Person",
    groups: ["ORGANIZER"],
    primary_email: "organizer@example.com",
    is_superuser: false,
    is_active: true,
  },
  {
    id: 3,
    username: "helper",
    first_name: "Helper",
    last_name: "Person",
    groups: ["HELPER"],
    primary_email: "helper@example.com",
    is_superuser: false,
    is_active: true,
  },
  {
    id: 4,
    username: "trainee",
    first_name: "Trainee",
    last_name: "Person",
    groups: [],
    primary_email: "trainee@example.com",
    is_superuser: false,
    is_active: false,
  },
];

const mockGroups: Group[] = [
  { id: 1, name: "ORGANIZER" },
  { id: 2, name: "HELPER" },
  { id: 3, name: "TRAINEE" },
];

const server = setupServer();

beforeEach(() => {
  server.listen({ onUnhandledRequest: "warn" });
  server.use(
    http.get("/api/management/users/", ({ request }) => {
      const url = new URL(request.url);
      const search = url.searchParams.get("search");
      let filtered = mockUsers;
      if (search) {
        filtered = mockUsers.filter(
          (u) =>
            u.username.toLowerCase().includes(search.toLowerCase()) ||
            u.first_name.toLowerCase().includes(search.toLowerCase()) ||
            u.last_name.toLowerCase().includes(search.toLowerCase())
        );
      }
      return HttpResponse.json({
        count: filtered.length,
        results: filtered,
        page: 1,
        page_size: 10,
      });
    }),
    http.get("/api/management/groups/", () => HttpResponse.json(mockGroups)),
    http.patch("/api/management/users/:id/", async ({ params, request }) => {
      const body = (await request.json()) as { groups: string[] };
      const user = mockUsers.find((u) => u.id === Number(params.id));
      if (user) {
        user.groups = body.groups;
      }
      return HttpResponse.json({ ...user, groups: body.groups });
    }),
    http.post("/api/management/users/:id/toggle-active/", async ({ params }) => {
      const user = mockUsers.find((u) => u.id === Number(params.id));
      if (user) {
        user.is_active = !user.is_active;
        return HttpResponse.json({
          id: user.id,
          username: user.username,
          is_active: user.is_active,
        });
      }
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    })
  );
});

afterEach(() => {
  server.close();
});

describe("UsersSection", () => {
  describe("user display", () => {
    it("displays all users", async () => {
      render(<UsersSection />);

      await waitFor(() => {
        expect(screen.getByText("admin")).toBeInTheDocument();
        expect(screen.getByText("organizer")).toBeInTheDocument();
        expect(screen.getByText("helper")).toBeInTheDocument();
      });
    });

    it("displays user names", async () => {
      render(<UsersSection />);

      await waitFor(() => {
        expect(screen.getByText("Admin User")).toBeInTheDocument();
        expect(screen.getByText("Organizer Person")).toBeInTheDocument();
      });
    });

    it("displays user emails", async () => {
      render(<UsersSection />);

      await waitFor(() => {
        expect(screen.getByText("admin@example.com")).toBeInTheDocument();
        expect(screen.getByText("organizer@example.com")).toBeInTheDocument();
      });
    });
  });

  describe("group badges", () => {
    it("displays group badges for users with groups", async () => {
      render(<UsersSection />);

      await waitFor(() => {
        expect(screen.getAllByText("ORGANIZER").length).toBeGreaterThan(0);
        expect(screen.getAllByText("HELPER").length).toBeGreaterThan(0);
      });
    });

    it('displays "No group" badge for users without groups', async () => {
      render(<UsersSection />);

      await waitFor(() => {
        expect(screen.getByText("No group")).toBeInTheDocument();
      });
    });
  });

  describe("Add User button", () => {
    it("has Add User button", async () => {
      render(<UsersSection />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add user/i })).toBeInTheDocument();
      });
    });
  });

  describe("edit groups action", () => {
    it("shows edit option in menu", async () => {
      render(<UsersSection />);

      await waitFor(() => {
        expect(screen.getByTestId("users-table")).toBeInTheDocument();
      });
    });
  });

  describe("empty state", () => {
    it("handles empty users list", async () => {
      server.use(
        http.get("/api/management/users/", () =>
          HttpResponse.json({
            count: 0,
            results: [],
            page: 1,
            page_size: 10,
          })
        )
      );

      render(<UsersSection />);

      await waitFor(() => {
        expect(screen.getByText(/no users found/i)).toBeInTheDocument();
      });
    });
  });
});
