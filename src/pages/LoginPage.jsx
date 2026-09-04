import { useState } from 'react';
import { Container, Card, Form, Button, Alert, InputGroup, Spinner } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../utils/error';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email.trim(), password);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Login failed. Check your credentials.'));
    }
  };

  return (
    <Container style={{ maxWidth: 460 }}>
      <Card className="shadow-sm border-0">
        <Card.Body className="p-4">
          <div className="text-center mb-3">
            <div style={{ fontSize: '2.5rem' }}>🩸</div>
            <h3 className="text-danger fw-bold">Sign in to Blood Bond</h3>
            <div className="text-muted small">Connect donors, banks and patients.</div>
          </div>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={onSubmit}>
            <Form.Group className="mb-3" controlId="email">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="password">
              <Form.Label>Password</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  variant="outline-secondary"
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                >
                  {showPwd ? 'Hide' : 'Show'}
                </Button>
              </InputGroup>
            </Form.Group>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <Link to="/forgot" className="small">Forgot password?</Link>
            </div>
            <Button type="submit" variant="danger" className="w-100" disabled={loading}>
              {loading ? <Spinner size="sm" animation="border" /> : 'Sign in'}
            </Button>
          </Form>
          <div className="text-center mt-3 small">
            New here? <Link to="/register">Create an account</Link>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}
