import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent, waitFor } from "../../../test-utils/render";
import TicketView from "./TicketView";
import { Ticket } from "./ticket-utils";
import { apiClient } from "@/app/lib/apiClient";

vi.mock("@/app/lib/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockTicket: Ticket = {
  id: 1,
  title: "Test Ticket",
  description: "Test Description",
  ticket_status: "OPEN",
  status_display: "Open",
  priority: 1,
  priority_display: "Low",
  ticket_type: "ISSUE",
  type_display: "Issue",
  assigned_to: null,
  assigned_to_username: null,
  reported_by: 1,
  reported_by_username: "reporter",
  contact: null,
  contact_display: null,
  event: null,
  event_display: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  editable_fields: ["ticket_status", "assigned_to", "priority", "ticket_type"],
};

describe("TicketView", () => {
  it("calls onUpdate when ticket status is updated", async () => {
    const onUpdate = vi.fn();
    vi.mocked(apiClient.patch).mockResolvedValue({});
    vi.mocked(apiClient.get).mockImplementation((path: string) => {
      if (path === "/auth/user") return Promise.resolve({ id: 1, username: "admin" });
      if (path.includes("ticket-statuses")) {
        return Promise.resolve([
          { value: "OPEN", label: "Open" },
          { value: "CLOSED", label: "Closed" },
        ]);
      }
      return Promise.resolve([]);
    });

    render(
      <TicketView
        ticket={mockTicket}
        timeline={[]}
        timelineLoading={false}
        showType="all"
        onShowTypeChange={() => {}}
        onUpdate={onUpdate}
      />
    );

    const currentStatus = screen.getByText("Open");
    await userEvent.click(currentStatus);

    const closedOption = await screen.findByText("Closed");
    await userEvent.click(closedOption);

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith("/tickets/1/status/", {
        ticket_status: "CLOSED",
      });
      expect(onUpdate).toHaveBeenCalled();
    });
  });

  it("calls onUpdate when ticket is claimed", async () => {
    const onUpdate = vi.fn();
    vi.mocked(apiClient.post).mockResolvedValue({});
    vi.mocked(apiClient.get).mockImplementation((path: string) => {
      if (path === "/auth/user") return Promise.resolve({ id: 1, username: "admin" });
      return Promise.resolve([]);
    });

    render(
      <TicketView
        ticket={mockTicket}
        timeline={[]}
        timelineLoading={false}
        showType="all"
        onShowTypeChange={() => {}}
        onUpdate={onUpdate}
      />
    );

    const claimButton = screen.getByRole("button", { name: /claim ticket/i });
    await userEvent.click(claimButton);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/tickets/1/claim/", {});
      expect(onUpdate).toHaveBeenCalled();
    });
  });
});
