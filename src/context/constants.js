// Shared enums / display helpers based on the Postman collection.
// bloodType: 0..7 (A+, A-, B+, B-, AB+, AB-, O+, O-)
// urgencyLevel: 0..3
export const BLOOD_TYPES = [
  { value: 0, label: 'A+' },
  { value: 1, label: 'A-' },
  { value: 2, label: 'B+' },
  { value: 3, label: 'B-' },
  { value: 4, label: 'AB+' },
  { value: 5, label: 'AB-' },
  { value: 6, label: 'O+' },
  { value: 7, label: 'O-' },
];

export const URGENCY_LEVELS = [
  { value: 0, label: 'Low', variant: 'secondary' },
  { value: 1, label: 'Normal', variant: 'info' },
  { value: 2, label: 'High', variant: 'warning' },
  { value: 3, label: 'Critical', variant: 'danger' },
];

export const ROLES = [
  { value: 'User', label: 'Donor / User' },
  { value: 'BloodBankManager', label: 'Blood Bank Manager' },
  { value: 'Admin', label: 'Administrator' },
];

export function bloodTypeLabel(value) {
  const found = BLOOD_TYPES.find((b) => b.value === Number(value));
  return found ? found.label : `Type ${value}`;
}

export function urgencyMeta(value) {
  const found = URGENCY_LEVELS.find((u) => u.value === Number(value));
  return found || { value, label: 'Unknown', variant: 'secondary' };
}
