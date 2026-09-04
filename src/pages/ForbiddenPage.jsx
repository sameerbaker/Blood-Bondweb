import { Container, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

export default function ForbiddenPage() {
  return (
    <Container className="text-center py-5">
      <div style={{ fontSize: '5rem' }}>🔒</div>
      <h1 className="display-5 text-danger fw-bold">403</h1>
      <p className="lead">You don't have permission to view this page.</p>
      <Button as={Link} to="/dashboard" variant="danger">Back to dashboard</Button>
    </Container>
  );
}
