import TicketTemplateView from "@/app/components/tickets/TicketTemplateView";

const ticketTypes = [
  { value: "UNKNOWN", label: "Unknown" },
  { value: "INTRODUCTION", label: "Introduction" },
  { value: "RECRUIT", label: "Recruit for event" },
  { value: "CONFIRM", label: "Confirm participation" },
];

export default function TicketPage() {
  return <TicketTemplateView title="Ticket Queue Management" ticketTypes={ticketTypes} />;
}
