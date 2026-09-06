import { Outlet, Link } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';
import AppNavbar from './AppNavbar';

export default function AppLayout() {
  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <AppNavbar />
      <main className="flex-grow-1 py-4">
        <Outlet />
      </main>
      <footer className="border-top bg-white mt-auto">
        <Container className="py-4">
          <Row className="g-3">
            <Col md={4}>
              <h6 className="text-danger fw-bold">🩸 Blood Bond</h6>
              <p className="text-muted small mb-0">
                Connecting donors, blood banks and patients — one drop at a time.
              </p>
            </Col>
            <Col md={2} xs={6}>
              <h6 className="text-uppercase small fw-bold">Product</h6>
              <ul className="list-unstyled small">
                <li><Link to="/blood-banks">Blood Banks</Link></li>
                <li><Link to="/requests">Requests</Link></li>
                <li><Link to="/events">Events</Link></li>
                <li><Link to="/eligibility">Eligibility</Link></li>
              </ul>
            </Col>
            <Col md={2} xs={6}>
              <h6 className="text-uppercase small fw-bold">Account</h6>
              <ul className="list-unstyled small">
                <li><Link to="/login">Sign in</Link></li>
                <li><Link to="/register">Register</Link></li>
                <li><Link to="/profile">My profile</Link></li>
                <li><Link to="/monetary">Donate</Link></li>
              </ul>
            </Col>
            <Col md={4}>
              <h6 className="text-uppercase small fw-bold">Get in touch</h6>
              <ul className="list-unstyled small text-muted">
                <li>📧 support@bloodbond.com</li>
                <li>📞 +970 599 000 000</li>
                <li>📍 Ramallah, Palestine</li>
                <li className="mt-2"><Link to="/contact">Contact form →</Link></li>
              </ul>
            </Col>
          </Row>
          <hr className="my-3" />
          <div className="text-center text-muted small">
            © {new Date().getFullYear()} Blood Bond &middot; Built with React + Bootstrap
          </div>
        </Container>
      </footer>
    </div>
  );
}
