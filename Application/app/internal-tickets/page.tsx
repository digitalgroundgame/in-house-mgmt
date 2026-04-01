import TicketTemplateView from "@/app/components/tickets/TicketTemplateView";

export default function InternalTicketsPage() {
  return (
    <TicketTemplateView
      title="Internal Tickets"
      ticketTypes={[{ value: "INTERNAL", label: "Internal Call Banking" }]}
    />
  );
}
