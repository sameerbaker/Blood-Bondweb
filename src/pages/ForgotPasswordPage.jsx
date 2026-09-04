import { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import { apiErrorMessage } from '../utils/error';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email.trim());
      // In dev mode, the API returns the reset token. Show it so the user
      // can complete the flow.
      const token = res.data?.token || res.data?.Token;
      if (token) {
        setInfo(`Dev mode: reset token = ${token}`);
        toast.success('Reset token generated (dev).');
      } else {
        setInfo('If the email exists, a reset link has been sent.');
      }
    } catch (err) {
      setError(apiErrorMessage(err, 'Request failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container style={{ maxWidth: 460 }}>
      <Card className="shadow-sm border-0">
        <Card.Body className="p-4">
          <h3 className="text-danger fw-bold text-center mb-3">Forgot password</h3>
          {error && <Alert variant="danger">{error}</Alert>}
          {info && <Alert variant="info" className="text-break">{info}</Alert>}
          <Form onSubmit={onSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Form.Group>
            <Button type="submit" variant="danger" className="w-100" disabled={loading}>
              {loading ? <Spinner size="sm" animation="border" /> : 'Send reset link'}
            </Button>
          </Form>
          <div className="text-center mt-3 small">
            Remembered? <Link to="/login">Back to login</Link>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}
