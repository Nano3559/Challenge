export const missingOrderStatusId = 999_999;
export const expectedOrderStatuses = [
  { id: 1, name: 'new', icon: 'fa-plus', possible_next_statuses: [5, 20] },
  { id: 5, name: 'sent', icon: 'fa-paper-plane', possible_next_statuses: [10] },
  { id: 10, name: 'pending', icon: 'fa-spinner', possible_next_statuses: [30, 40] },
  { id: 20, name: 'cancelled', icon: 'fa-times', possible_next_statuses: [] },
  { id: 30, name: 'returned', icon: 'fa-undo', possible_next_statuses: [] },
  { id: 40, name: 'delivered', icon: 'fa-check', possible_next_statuses: [99] },
  { id: 99, name: 'completed', icon: 'fa-check-double', possible_next_statuses: [] },
];
