import { Spinner } from 'react-bootstrap';

export default function Loading({ label = 'Loading…' }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5">
      <Spinner animation="border" variant="danger" role="status" />
      <div className="text-muted mt-2 small">{label}</div>
    </div>
  );
}
