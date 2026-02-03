export function formatContactInfo(email: string | null, phone: string | null) {
  const parts = [];
  if (email) parts.push(email);
  if (phone) parts.push(phone);
  return parts.length > 0 ? parts.join(" • ") : "No contact info";
}
