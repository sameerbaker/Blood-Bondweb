import { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { adminApi } from '../api/admin';
import { apiErrorMessage } from '../utils/error';
import PageHeader from '../components/PageHeader';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, setUser, role } = useAuth();
  const userRole = (role || '').toLowerCase();

  const [form, setForm] = useState({
    fullName: user?.fullName || user?.FullName || '',
    email: user?.email || user?.Email || '',
  });
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const onProfile = async (e) => {
    e.preventDefault();
    setError(''); setInfo('');
    setSavingProfile(true);
    try {
      // The /me endpoint may be read-only; we POST to change-password for password,
      // and a generic PATCH for profile is not exposed in the collection. So we just
      // surface a friendly message — admins can change roles through /admin/users.
      toast.info('Profile updates are read-only in the current API. Contact an admin for changes.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Update failed.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const onPassword = async (e) => {
    e.preventDefault();
    setError(''); setInfo('');
    if (pwd.newPassword !== pwd.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setSavingPwd(true);
    try {
      const fn = userRole === 'admin' ? adminApi.changePassword : adminApi.changePassword;
      await fn({
        currentPassword: pwd.currentPassword,
        newPassword: pwd.newPassword,
        confirmPassword: pwd.confirmPassword,
      });
      setInfo('Password changed successfully.');
      setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Password change failed.'));
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <Container style={{ maxWidth: 760 }}>
      <PageHeader title="My Profile" subtitle="View and manage your account." />
      {error && <Alert variant="danger">{error}</Alert>}
      {info && <Alert variant="success">{info}</Alert>}

      <Row className="g-3">
        <Col lg={6}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white"><strong>Account info</strong></Card.Header>
            <Card.Body>
              <Form onSubmit={onProfile}>
                <Form.Group className="mb-3">
                  <Form.Label>Full name</Form.Label>
                  <Form.Control
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    readOnly
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control value={form.email} readOnly />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Role</Form.Label>
                  <Form.Control value={role || 'User'} readOnly />
                </Form.Group>
                <Button type="submit" variant="outline-danger" disabled={savingProfile}>
                  {savingProfile ? <Spinner size="sm" animation="border" /> : 'Save'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white"><strong>Change password</strong></Card.Header>
            <Card.Body>
              <Form onSubmit={onPassword}>
                <Form.Group className="mb-3">
                  <Form.Label>Current password</Form.Label>
                  <Form.Control
                    type="password"
                    value={pwd.currentPassword}
                    onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>New password</Form.Label>
                  <Form.Control
                    type="password"
                    value={pwd.newPassword}
                    onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Confirm new password</Form.Label>
                  <Form.Control
                    type="password"
                    value={pwd.confirmPassword}
                    onChange={(e) => setPwd({ ...pwd, confirmPassword: e.target.value })}
                    required
                  />
                </Form.Group>
                <Button type="submit" variant="danger" disabled={savingPwd}>
                  {savingPwd ? <Spinner size="sm" animation="border" /> : 'Update password'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
