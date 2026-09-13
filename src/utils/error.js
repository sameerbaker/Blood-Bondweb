// Helper to extract a friendly error message from an axios error.
// Surfaces server-provided details (status + raw body) so the user can
// understand exactly why a request failed (e.g. 500 from the backend).
export function apiErrorMessage(err, fallback = 'Something went wrong') {
  if (!err) return fallback;
  const status = err.response?.status;
  const data = err.response?.data;

  // Plain-text body
  if (typeof data === 'string' && data.trim()) return data;

  // JSON body
  if (data && typeof data === 'object') {
    // ASP.NET Core ProblemDetails / standard error envelope
    if (data.title && !data.title.includes('One or more validation errors')) {
      return data.title;
    }
    if (data.message) return data.message;
    if (data.error) return data.error;
    if (data.detail) return data.detail;
    if (data.errors && typeof data.errors === 'object') {
      const first = Object.values(data.errors).flat()[0];
      if (first) return first;
    }
  }

  // Status code fallbacks
  if (status === 500) {
    return 'Server error (500). The backend rejected the request — see the API logs for the exception.';
  }
  if (status === 403) return 'Forbidden (403) — your role does not allow this action.';
  if (status === 401) return 'Unauthorized (401) — please sign in again.';
  if (status === 404) return 'Not found (404).';
  if (status === 400) return 'Bad request (400) — please check your input.';
  if (status === 405) return 'Method not allowed (405) — the endpoint does not support this action.';

  return err.message || fallback;
}

// Detect specific "manager ownership" errors so we can show a friendlier message
// and tell the user what to do.
export function isManagerOwnershipError(err) {
  const msg = (err?.response?.data?.message || err?.response?.data || '').toString();
  return /not the manager|not your blood bank|you are not the manager/i.test(msg);
}
