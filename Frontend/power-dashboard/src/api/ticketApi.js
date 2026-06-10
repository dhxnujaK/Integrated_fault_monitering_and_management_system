export const ticketEndpoints = {
  list: null,
  create: null,
  updateStatus: null,
}

export async function getTickets() {
  return []
}

export async function createTicket() {
  throw new Error('Ticket create endpoint is not available in the backend.')
}

export async function updateTicketStatus() {
  throw new Error('Ticket status update endpoint is not available in the backend.')
}
