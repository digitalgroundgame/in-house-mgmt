import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "../../../test-utils/render";
import EventCategoriesSection from "./EventCategoriesSection";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

const mockCategories = [
  {
    id: 1,
    name: "Canvassing",
    description: "Door-to-door outreach",
    created_at: "2026-01-01",
    modified_at: "2026-01-01",
  },
  {
    id: 2,
    name: "Software Development",
    description: "",
    created_at: "2026-01-01",
    modified_at: "2026-01-01",
  },
];

const server = setupServer();

beforeEach(() => {
  server.listen({ onUnhandledRequest: "warn" });
  server.use(
    http.get("/api/event-categories/", () =>
      HttpResponse.json({
        count: mockCategories.length,
        results: mockCategories,
      })
    )
  );
});

afterEach(() => {
  server.resetHandlers();
  server.close();
});

describe("EventCategoriesSection", () => {
  it("renders the add button", async () => {
    render(<EventCategoriesSection />);
    expect(screen.getByText("Add Event Category")).toBeInTheDocument();
  });

  it("displays categories after loading", async () => {
    render(<EventCategoriesSection />);
    await waitFor(() => {
      expect(screen.getByText("Canvassing")).toBeInTheDocument();
      expect(screen.getByText("Software Development")).toBeInTheDocument();
    });
  });

  it("shows empty state when no categories exist", async () => {
    server.use(
      http.get("/api/event-categories/", () => HttpResponse.json({ count: 0, results: [] }))
    );
    render(<EventCategoriesSection />);
    await waitFor(() => {
      expect(
        screen.getByText("No event categories configured. Create one to get started.")
      ).toBeInTheDocument();
    });
  });

  it("shows description or dash for empty description", async () => {
    render(<EventCategoriesSection />);
    await waitFor(() => {
      expect(screen.getByText("Door-to-door outreach")).toBeInTheDocument();
      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });
});
