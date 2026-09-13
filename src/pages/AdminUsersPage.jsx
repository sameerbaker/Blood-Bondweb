import { useEffect, useState } from 'react';
import { Container, Card, Table, Button, Badge, Alert, Spinner, Form, Modal, Row, Col, InputGroup } from 'react-bootstrap';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { adminApi } from '../api/admin';
import { ROLES, formatDate } from '../context/constants';
import { apiErrorMessage } from '../utils/error';

// The backend returns `Roles` as a string[] (e.g. ["User", "Admin"]).
// Pick the highest-privilege role for display purposes.
const ROLE_RANK = { User: 0, BloodBankManager: 1, Admin: 2 };
function pickPrimaryRole(roles) {
  if (!Array.isArray(roles) || roles.length === 0) return 'User';
  return [...roles].sort((a, b) => (ROLE_RANK[b] ?? 0) - (ROLE_RANK[a] ?? 0))[0];
}

export default function AdminUsersPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ fullName: '', email: '', password: '', role: 'User' });
  const [saving, setSaving] = useState(false);

  const [analytics, setAnalytics] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [u, a] = await Promise.allSettled([adminApi.users(), adminApi.analytics()]);
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
    const blocked = !!u.isBlocked;
    try {
      if (blocked) await adminApi.unblock(id);
      else await adminApi.block(id);
      toast.success(blocked ? 'User unblocked.' : 'User blocked.');
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Action failed.'));
    }
  };

  // Send PATCH /api/admin/users/{id}/role with { role: "..." }
  const setRole = async (u, newRole) => {
    const id = u.id || u.Id;
    if (!newRole) return;
    const current = pickPrimaryRole(u.roles);
    if (current === newRole) return;
    if (!confirm(`Change ${u.fullName || u.email}'s role from "${current}" → "${newRole}"?`)) return;
    try {
      await adminApi.setRole(id, newRole);
      toast.success(`Role updated to ${newRole}.`);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Role change failed.'));
    }
  };

  const filtered = items.filter((u) => {
    const q = search.trim().toLowerCase();
    const primary = pickPrimaryRole(u.roles);
    if (q) {
      const hay = `${u.fullName || ''} ${u.email || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (roleFilter && primary !== roleFilter) return false;
    if (statusFilter === 'blocked' && !u.isBlocked) return false;
    if (statusFilter === 'active' && u.isBlocked) return false;
    return true;
  });

  return (
    <Container>
      <PageHeader
        title="User Management"
        subtitle="Create accounts, change roles, block / unblock, and view analytics."
        actions={<Button variant="danger" onClick={() => setShowCreate(true)}>+ New user</Button>}
      />

      {/* Analytics summary */}
      {analytics && (
        <Card className="shadow-sm border-0 mb-3">
          <Card.Body>
            <Row className="g-3">
              <Col md={3}><Stat label="Users"           value={analytics.Users?.Total ?? analytics.totalUsers} /></Col>
              <Col md={3}><Stat label="Blood Banks"     value={`${analytics.BloodBanks?.Verified ?? 0} / ${analytics.BloodBanks?.Total ?? 0}`} sub={`${analytics.BloodBanks?.Pending ?? 0} pending`} /></Col>
              <Col md={3}><Stat label="Requests"        value={`${analytics.Requests?.Fulfilled ?? 0} / ${analytics.Requests?.Total ?? 0}`} sub={`${analytics.Requests?.Pending ?? 0} pending`} /></Col>
              <Col md={3}><Stat label="Donations"       value={`${analytics.Donations?.Completed ?? 0} / ${analytics.Donations?.Total ?? 0}`} sub={`$${analytics.Monetary?.TotalDonatedUSD ?? 0} raised`} /></Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Filters */}
      <Card className="shadow-sm border-0 mb-3">
        <Card.Body>
          <Row className="g-2">
            <Col md={5}>
              <InputGroup>
                <InputGroup.Text>🔍</InputGroup.Text>
                <Form.Control
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="">All roles</option>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All status</option>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
              </Form.Select>
            </Col>
            <Col md={2} className="text-end">
              <Button variant="outline-secondary" size="sm" onClick={load} disabled={loading}>
                Refresh
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {error && <Alert variant="warning">{error}</Alert>}

      {loading ? <Loading /> : filtered.length === 0 ? (
        <EmptyState title="No users found" message="Try adjusting the filters or create a new user." icon="👤" />
      ) : (
        <Card className="shadow-sm border-0">
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const id = u.id || u.Id;
                  const primary = pickPrimaryRole(u.roles);
                  const blocked = !!u.isBlocked;
                  return (
                    <tr key={id}>
                      <td>
                        <strong>{u.fullName || '—'}</strong>
                        {u.roles && u.roles.length > 1 && (
                          <div className="text-muted small">
                            All roles: {u.roles.join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="small">{u.email}</td>
                      <td>
                        <Form.Select
                          size="sm"
                          value={primary}
                          onChange={(e) => setRole(u, e.target.value)}
                          style={{ maxWidth: 200 }}
                          aria-label="Change role"
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </Form.Select>
                      </td>
                      <td>
                        {blocked
                          ? <Badge bg="secondary">Blocked</Badge>
                          : <Badge bg="success">Active</Badge>}
                      </td>
                      <td className="small text-muted">{formatDate(u.createdAt)}</td>
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
              <Form.Control
                value={createForm.fullName}
                onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
              >
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

function Stat({ label, value, sub }) {
  return (
    <div>
      <div className="text-muted small text-uppercase">{label}</div>
      <div className="h4 fw-bold mb-0">{value ?? '—'}</div>
      {sub && <div className="text-muted small">{sub}</div>}
    </div>
  );
}
