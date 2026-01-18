
export interface Ticket {
  id: number;
  title: string;
  description: string;
  ticket_type: string;
  ticket_status: string;
  status_display?: string;
  contact: number;
  contact_display?: string;
  event: number;
  event_display?: string;
  type_display?: string;
  assigned_to: number;
  assigned_to_username?: string;
  reported_by: number;
  reported_by_username?: string;
  priority: number;
  priority_display?: string;
  created_at: string;
  modified_at: string;
}