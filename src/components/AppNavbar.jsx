import { Container, Nav, Navbar, NavDropdown, Spinner } from 'react-bootstrap';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AppNavbar() {
  const { user, isAuthenticated, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Navbar bg="danger" variant="dark" expand="lg" sticky="top" className="shadow-sm">
      <Container>
        <Navbar.Brand as={Link} to="/" className="fw-bold d-flex align-items-center gap-2">
          <span style={{ fontSize: '1.4rem' }}>🩸</span> Blood Bond
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav">
          {isAuthenticated ? (
            <>
              <Nav className="me-auto">
                <Nav.Link as={NavLink} to="/dashboard">Dashboard</Nav.Link>
                <Nav.Link as={NavLink} to="/blood-banks">Blood Banks</Nav.Link>
                <Nav.Link as={NavLink} to="/requests">Requests</Nav.Link>
                <Nav.Link as={NavLink} to="/donations">Donations</Nav.Link>
                <Nav.Link as={NavLink} to="/badges">Badges</Nav.Link>
                {(role || '').toLowerCase() === 'admin' && (
                  <Nav.Link as={NavLink} to="/admin/users">Users</Nav.Link>
                )}
              </Nav>
              <Nav>
                <NavDropdown
                  align="end"
                  title={
                    <span>
                      {user?.fullName || user?.FullName || user?.email || 'Account'}
                    </span>
                  }
                  id="user-menu"
                >
                  <NavDropdown.Item as={Link} to="/profile">My Profile</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/eligibility">Eligibility</NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
                </NavDropdown>
              </Nav>
            </>
          ) : (
            <Nav className="ms-auto">
              <Nav.Link as={Link} to="/login">Login</Nav.Link>
              <Nav.Link as={Link} to="/register">Register</Nav.Link>
            </Nav>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
