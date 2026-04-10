import { Contact } from "./ContactTable";

export type EventType = "generic" | "internal";

export interface Event {
  id: number;
  event_type: EventType;
  event_status: string;
  status_display: string;
  name: string;
  description: string | null;
  location_name: string | null;
  location_address: string | null;
  location_display: string;
  starts_at: string;
  ends_at: string;
}

export function getStatusColor(status: string) {
  console.log(status);
  switch (status) {
    case "Draft":
      return "gray";
    case "Scheduled":
      return "blue";
    case "Completed":
      return "green";
    case "Canceled":
      return "red";
    default:
      return "gray";
  }
}

export interface EventParticipation {
  contact: Contact;
  created_at: string;
  modified_at: string;
  id: number;
  status: string;
  status_display: string;
}

export const getEventParticipationStatusColor = (status: string) => {
  switch (status) {
    case "UNKNOWN":
      return "gray";
    case "MAYBE":
      return "gray";
    case "COMMITTED":
      return "blue";
    case "REJECTED":
      return "red";
    case "ATTENDED":
      return "green";
    case "NO_SHOW":
      return "red";
    default:
      return "DimGray";
  }
};

export interface UsersInEvent {
  id: number;
  user: number;
  user_username: string;
  event: number;
  joined_at: string;
}
