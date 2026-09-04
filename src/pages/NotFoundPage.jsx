import { Container, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <Container className="text-center py-5">
      <div style={{ fontSize: '5rem' }}>🩸</div>
      <h1 className="display-5 text-danger fw-bold">404</h1>
      <p className="lead">We couldn't find that page.</p>
      <Button as={Link} to="/" variant="danger">Go home</Button>
    </Container>
  );
}
