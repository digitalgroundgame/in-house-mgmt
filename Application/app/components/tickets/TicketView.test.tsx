import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../../../test-utils/render";
import TicketView from "./TicketView";
import { apiClient } from "@/app/lib/apiClient";
import { Ticket } from "./ticket-utils";

// Mock the apiClient so we don't make real network requests during tests
vi.mock("@/app/lib/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock useUser hook and UserProvider
vi.mock("@/app/components/provider/UserContext", () => ({
  useUser: () => ({
    user: { id: 1, username: "testuser" },
    loading: false,
    refresh: vi.fn(),
  }),
  UserProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock EnumSelect and SearchSelect to be simple clickable elements for testing
vi.mock("@/app/components/EnumSelect", () => ({
  EnumSelect: ({
    value,
    onChange,
    label,
    endpoint,
    "data-testid": dataTestId,
  }: {
    value: { label: string } | null | undefined;
    onChange: (val: { id: string; label: string } | null) => void;
    label?: string;
    endpoint: string;
    "data-testid"?: string;
  }) => (
    <div data-testid={dataTestId || `enum-select-${label || endpoint}`}>
      <span data-testid="select-value">{value?.label}</span>
      <button onClick={() => onChange({ id: "NEW_VAL", label: "New Val" })}>Change</button>
    </div>
  ),
}));

vi.mock("@/app/components/SearchSelect", () => ({
  SearchSelect: ({
    value,
    onChange,
    placeholder,
    "data-testid": dataTestId,
  }: {
    value: { label: string } | null | undefined;
    onChange: (val: { id: number; label: string; raw: unknown } | null) => void;
    placeholder?: string;
    "data-testid"?: string;
  }) => (
    <div data-testid={dataTestId || "search-select"}>
      <input
        placeholder={placeholder}
        value={value?.label || ""}
        onChange={() => {}} // Read-only for this mock
      />
      <button
        onClick={() => onChange({ id: 2, label: "newuser", raw: { id: 2, username: "newuser" } })}
      >
        Change User
      </button>
    </div>
  ),
}));
const mockTicket: Ticket = {
  id: 1,
  title: "Test Ticket",
  description: "Test Description",
  ticket_type: "BUG",
  ticket_status: "OPEN",
  status_display: "Open",
  contact: 1,
  event: 1,
  assigned_to: 0,
  reported_by: 1,
  priority: 1,
  priority_display: "Low",
  created_at: new Date().toISOString(),
  modified_at: new Date().toISOString(),
  editable_fields: ["assigned_to", "ticket_status", "priority", "ticket_type"],
};

describe("TicketView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls onUpdate when a ticket is claimed and updates the UI", async () => {
    const onUpdate = vi.fn();
    let currentTicket = { ...mockTicket };

    // Mock the POST for claim
    vi.mocked(apiClient.post).mockResolvedValue({});

    const { rerender } = render(
      <TicketView
        ticket={currentTicket}
        timeline={[]}
        timelineLoading={false}
        showType="all"
        onShowTypeChange={vi.fn()}
        onUpdate={onUpdate}
      />
    );

    // 1. Find and click the Claim button
    const claimButton = screen.getByRole("button", { name: /claim ticket/i });
    fireEvent.click(claimButton);

    // 2. Verify the API was called and onUpdate was triggered
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/tickets/1/claim/", {});
      expect(onUpdate).toHaveBeenCalled();
    });

    // 3. Simulate the parent re-rendering with the NEW ticket data
    currentTicket = { ...mockTicket, assigned_to: 1, assigned_to_username: "testuser" };
    rerender(
      <TicketView
        ticket={currentTicket}
        timeline={[]}
        timelineLoading={false}
        showType="all"
        onShowTypeChange={vi.fn()}
        onUpdate={onUpdate}
      />
    );

    // 4. Verify that the UI now reflects the new "Claimed By" user in the SearchSelect input
    await waitFor(() => {
      const assignedToSelect = screen.getByTestId("assigned-to-select");
      const input = assignedToSelect.querySelector("input")!;
      expect(input).toHaveValue("testuser");
    });
  });

  it("calls onUpdate when a ticket is unclaimed", async () => {
    const onUpdate = vi.fn();
    const claimedTicket = { ...mockTicket, assigned_to: 1, assigned_to_username: "testuser" };
    let currentTicket = { ...claimedTicket };

    // Mock the DELETE for unclaim
    vi.mocked(apiClient.delete).mockResolvedValue(undefined);

    const { rerender } = render(
      <TicketView
        ticket={currentTicket}
        timeline={[]}
        timelineLoading={false}
        showType="all"
        onShowTypeChange={vi.fn()}
        onUpdate={onUpdate}
      />
    );

    // Initial check: SearchSelect should have testuser
    const assignedToSelect = screen.getByTestId("assigned-to-select");
    const input = assignedToSelect.querySelector("input")!;
    expect(input).toHaveValue("testuser");

    // 1. Find and click the Unclaim button
    const unclaimButton = screen.getByRole("button", { name: /unclaim ticket/i });
    fireEvent.click(unclaimButton);

    // 2. Verify the API was called and onUpdate was triggered
    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith("/tickets/1/claim/");
      expect(onUpdate).toHaveBeenCalled();
    });

    // 3. Simulate the parent re-rendering with the NEW ticket data
    currentTicket = { ...mockTicket, assigned_to: 0, assigned_to_username: "" };
    rerender(
      <TicketView
        ticket={currentTicket}
        timeline={[]}
        timelineLoading={false}
        showType="all"
        onShowTypeChange={vi.fn()}
        onUpdate={onUpdate}
      />
    );

    // 4. Verify that the UI now reflects an empty input
    await waitFor(() => {
      expect(input).toHaveValue("");
    });
  });

  it("calls onUpdate after successfully adding a comment", async () => {
    const onUpdate = vi.fn();

    // Mock the POST for comment
    vi.mocked(apiClient.post).mockResolvedValue({});

    render(
      <TicketView
        ticket={mockTicket}
        timeline={[]}
        timelineLoading={false}
        showType="comment"
        onShowTypeChange={vi.fn()}
        onUpdate={onUpdate}
      />
    );

    // 1. Type a comment
    const input = screen.getByPlaceholderText(/add a comment/i);
    fireEvent.change(input, { target: { value: "New comment" } });

    // 2. Click Send
    const sendButton = screen.getByRole("button", { name: /send/i });
    fireEvent.click(sendButton);

    // 3. Verify onUpdate was called
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalled();
      expect(onUpdate).toHaveBeenCalled();
    });
  });

  it("calls onUpdate when status is changed", async () => {
    const onUpdate = vi.fn();
    vi.mocked(apiClient.patch).mockResolvedValue({});

    render(
      <TicketView
        ticket={mockTicket}
        timeline={[]}
        timelineLoading={false}
        showType="all"
        onShowTypeChange={vi.fn()}
        onUpdate={onUpdate}
      />
    );

    // Find the status EnumSelect mock and click its "Change" button
    const statusSelect = screen.getByTestId("status-select");
    const changeButton = statusSelect.querySelector("button")!;
    fireEvent.click(changeButton);

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith("/tickets/1/status/", {
        ticket_status: "NEW_VAL",
      });
      expect(onUpdate).toHaveBeenCalled();
    });
  });
});
