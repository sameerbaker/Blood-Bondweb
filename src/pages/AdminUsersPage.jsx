import { useEffect, useState } from 'react';
import { Container, Card, Table, Button, Badge, Alert, Spinner, Form, Modal } from 'react-bootstrap';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';
import { adminApi } from '../api/admin';
import { ROLES } from '../context/constants';
import { apiErrorMessage } from '../utils/error';

export default function AdminUsersPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ fullName: '', email: '', password: '', role: 'User' });
  const [saving, setSaving] = useState(false);
  const [analytics, setAnalytics] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [u, a] = await Promise.allSettled([
        adminApi.users(),
        adminApi.analytics(),
      ]);
      if (u.status === 'fulfilled') {
        setItems(Array.isArray(u.value.data) ? u.value.data : []);
      } else {
        setError(apiErrorMessage(u.reason, 'Failed to load users.'));
      }
      if (a.status === 'fulfilled') setAnalytics(a.value.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.create(createForm);
      toast.success('User created.');
      setShowCreate(false);
      setCreateForm({ fullName: '', email: '', password: '', role: 'User' });
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Create failed.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleBlock = async (u) => {
    const id = u.id || u.Id;
    const blocked = !!(u.isBlocked || u.IsBlocked);
    try {
      if (blocked) await adminApi.unblock(id);
      else await adminApi.block(id);
      toast.success(blocked ? 'User unblocked.' : 'User blocked.');
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Action failed.'));
    }
  };

  const setRole = async (u, role) => {
    const id = u.id || u.Id;
    try {
      await adminApi.setRole(id, role);
      toast.success(`Role set to ${role}.`);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Role change failed.'));
    }
  };

  return (
    <Container>
      <PageHeader
        title="User Management"
        subtitle="Create accounts, block/unblock, and change roles."
        actions={<Button variant="danger" onClick={() => setShowCreate(true)}>+ New user</Button>}
      />

      {analytics && (
        <Card className="shadow-sm border-0 mb-3">
          <Card.Body>
            <div className="d-flex flex-wrap gap-3">
              <div><strong>Total users:</strong> {analytics.totalUsers ?? analytics.TotalUsers ?? '—'}</div>
              <div><strong>Banks:</strong> {analytics.totalBloodBanks ?? analytics.TotalBloodBanks ?? '—'}</div>
              <div><strong>Donations:</strong> {analytics.totalDonations ?? analytics.TotalDonations ?? '—'}</div>
              <div><strong>Active requests:</strong> {analytics.activeRequests ?? analytics.ActiveRequests ?? '—'}</div>
            </div>
          </Card.Body>
        </Card>
      )}

      {error && <Alert variant="warning">{error}</Alert>}

      {loading ? <Loading /> : (
        <Card className="shadow-sm border-0">
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => {
                  const id = u.id || u.Id;
                  const blocked = !!(u.isBlocked || u.IsBlocked);
                  return (
                    <tr key={id}>
                      <td>{u.fullName || u.FullName || '—'}</td>
                      <td>{u.email || u.Email}</td>
                      <td>
                        <Form.Select
                          size="sm"
                          value={u.role || u.Role || 'User'}
                          onChange={(e) => setRole(u, e.target.value)}
                          style={{ maxWidth: 180 }}
                        >
                          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </Form.Select>
                      </td>
                      <td>
                        {blocked
                          ? <Badge bg="secondary">Blocked</Badge>
                          : <Badge bg="success">Active</Badge>}
                      </td>
                      <td className="text-end">
                        <Button
                          size="sm"
                          variant={blocked ? 'outline-success' : 'outline-secondary'}
                          onClick={() => toggleBlock(u)}
                        >
                          {blocked ? 'Unblock' : 'Block'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </Card>
      )}

      <Modal show={showCreate} onHide={() => setShowCreate(false)} centered>
        <Form onSubmit={onCreate}>
          <Modal.Header closeButton><Modal.Title>Create user</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Full name</Form.Label>
              <Form.Control value={createForm.fullName} onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" variant="danger" disabled={saving}>
              {saving ? <Spinner size="sm" animation="border" /> : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}
