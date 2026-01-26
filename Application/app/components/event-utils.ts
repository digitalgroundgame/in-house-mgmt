
export interface Event {
  id: number;
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
  console.log(status)
  switch (status) {
    case 'Draft': return 'gray';
    case 'Scheduled': return 'blue';
    case 'Completed': return 'green';
    case 'Canceled': return 'red';
    default: return 'gray';
  }
}
