// Helper to extract a friendly error message from an axios error.
export function apiErrorMessage(err, fallback = 'Something went wrong') {
  if (!err) return fallback;
  const data = err.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data) {
    if (data.message) return data.message;
    if (data.title) return data.title;
    if (data.error) return data.error;
    if (data.errors && typeof data.errors === 'object') {
      const first = Object.values(data.errors).flat()[0];
      if (first) return first;
    }
  }
  return err.message || fallback;
}
