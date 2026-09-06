// Shared enums / display helpers based on the Postman collection.
// bloodType: 0..7 (A+, A-, B+, B-, AB+, AB-, O+, O-)
// urgencyLevel: 0..3

// Blood types — also exported as a quick lookup for any colour hint.
export const BLOOD_TYPES = [
  { value: 0, label: 'A+',  color: '#dc3545' },
  { value: 1, label: 'A-',  color: '#c82333' },
  { value: 2, label: 'B+',  color: '#fd7e14' },
  { value: 3, label: 'B-',  color: '#e36c0d' },
  { value: 4, label: 'AB+', color: '#20c997' },
  { value: 5, label: 'AB-', color: '#1aa179' },
  { value: 6, label: 'O+',  color: '#0d6efd' },
  { value: 7, label: 'O-',  color: '#0a58ca' },
];

export const URGENCY_LEVELS = [
  { value: 0, label: 'Low',      variant: 'secondary' },
  { value: 1, label: 'Normal',   variant: 'info' },
  { value: 2, label: 'High',     variant: 'warning' },
  { value: 3, label: 'Critical', variant: 'danger' },
];

export const ROLES = [
  { value: 'User',             label: 'Donor / User' },
  { value: 'BloodBankManager', label: 'Blood Bank Manager' },
  { value: 'Admin',            label: 'Administrator' },
];

// Currencies the backend accepts through Stripe.
export const CURRENCIES = [
  { value: 'usd', label: 'USD — US Dollar',         symbol: '$' },
  { value: 'eur', label: 'EUR — Euro',              symbol: '€' },
  { value: 'gbp', label: 'GBP — British Pound',     symbol: '£' },
  { value: 'jod', label: 'JOD — Jordanian Dinar',   symbol: 'JOD' },
  { value: 'ils', label: 'ILS — Israeli Shekel',    symbol: '₪' },
];

// Suggested preset donation amounts per currency (numbers in major units).
export const DONATION_PRESETS = {
  usd: [5, 10, 25, 50, 100],
  eur: [5, 10, 25, 50, 100],
  gbp: [5, 10, 25, 50, 100],
  jod: [5, 10, 25, 50, 100],
  ils: [20, 50, 100, 200, 500],
};

// Donation status badges (matches .NET backend strings).
export const DONATION_STATUSES = {
  Pending:   { variant: 'warning', label: 'Pending' },
  Approved:  { variant: 'info',    label: 'Approved' },
  Completed: { variant: 'success', label: 'Completed' },
  Cancelled: { variant: 'secondary', label: 'Cancelled' },
  Rejected:  { variant: 'danger',  label: 'Rejected' },
};

// Request statuses.
export const REQUEST_STATUSES = {
  Active:   { variant: 'success', label: 'Active' },
  Pending:  { variant: 'warning', label: 'Pending' },
  Fulfilled:{ variant: 'info',    label: 'Fulfilled' },
  Cancelled:{ variant: 'secondary', label: 'Cancelled' },
  Expired:  { variant: 'danger',  label: 'Expired' },
};

// --- Lookup helpers --------------------------------------------------------

export function bloodTypeLabel(value) {
  const found = BLOOD_TYPES.find((b) => b.value === Number(value));
  return found ? found.label : `Type ${value}`;
}

export function bloodTypeColor(value) {
  const found = BLOOD_TYPES.find((b) => b.value === Number(value));
  return found ? found.color : '#6c757d';
}

export function urgencyMeta(value) {
  const found = URGENCY_LEVELS.find((u) => u.value === Number(value));
  return found || { value, label: 'Unknown', variant: 'secondary' };
}

export function currencyMeta(code) {
  return CURRENCIES.find((c) => c.value === (code || '').toLowerCase()) || CURRENCIES[0];
}

export function donationStatusMeta(status) {
  return DONATION_STATUSES[status] || { variant: 'secondary', label: status || 'Unknown' };
}

export function requestStatusMeta(status) {
  return REQUEST_STATUSES[status] || { variant: 'secondary', label: status || 'Unknown' };
}

// Format a Date or ISO string in the user's locale.
export function formatDate(value, opts) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, opts || { dateStyle: 'medium', timeStyle: 'short' });
}

// Format a money amount using Intl.
export function formatMoney(amount, currency) {
  const n = Number(amount);
  if (Number.isNaN(n)) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: (currency || 'usd').toUpperCase(),
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    const c = currencyMeta(currency);
    return `${c.symbol}${n.toFixed(2)}`;
  }
}
