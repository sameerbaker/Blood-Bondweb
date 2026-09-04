import { Container, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  return (
    <Container className="py-5">
      <div className="row align-items-center g-4">
        <div className="col-lg-6">
          <h1 className="display-5 fw-bold text-danger">Donate blood. Save lives.</h1>
          <p className="lead text-muted">
            Blood Bond connects donors, blood banks, and patients in one place — find the nearest
            bank, request a unit, schedule a donation, and earn badges for every drop you give.
          </p>
          <div className="d-flex gap-2 mt-3">
            {isAuthenticated ? (
              <Button as={Link} to="/dashboard" variant="danger" size="lg">Go to dashboard</Button>
            ) : (
              <>
                <Button as={Link} to="/register" variant="danger" size="lg">Get started</Button>
                <Button as={Link} to="/login" variant="outline-danger" size="lg">Sign in</Button>
              </>
            )}
          </div>
        </div>
        <div className="col-lg-6 text-center">
          <div style={{ fontSize: '8rem' }}>🩸</div>
        </div>
      </div>
    </Container>
  );
}
