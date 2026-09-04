import { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../utils/error';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');

  const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      toast.success('Account created — please sign in.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Registration failed.'));
    }
  };

  return (
    <Container style={{ maxWidth: 480 }}>
      <Card className="shadow-sm border-0">
        <Card.Body className="p-4">
          <div className="text-center mb-3">
            <div style={{ fontSize: '2.5rem' }}>🩸</div>
            <h3 className="text-danger fw-bold">Create your account</h3>
            <div className="text-muted small">Join the Blood Bond community.</div>
          </div>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={onSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Full name</Form.Label>
              <Form.Control value={form.fullName} onChange={onChange('fullName')} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" value={form.email} onChange={onChange('email')} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                value={form.password}
                onChange={onChange('password')}
                required
                minLength={6}
              />
              <Form.Text className="text-muted">At least 6 characters.</Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Confirm password</Form.Label>
              <Form.Control
                type="password"
                value={form.confirmPassword}
                onChange={onChange('confirmPassword')}
                required
              />
            </Form.Group>
            <Button type="submit" variant="danger" className="w-100" disabled={loading}>
              {loading ? <Spinner size="sm" animation="border" /> : 'Create account'}
            </Button>
          </Form>
          <div className="text-center mt-3 small">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}
