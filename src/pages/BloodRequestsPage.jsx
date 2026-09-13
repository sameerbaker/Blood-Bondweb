import { useEffect, useState } from 'react';
import {
  Container, Row, Col, Card, Form, Button, Table, Badge, Modal, Alert, Spinner, Nav, InputGroup,
} from 'react-bootstrap';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { bloodRequestsApi, bloodBanksApi } from '../api';
import { apiErrorMessage } from '../utils/error';
import {
  BLOOD_TYPES, URGENCY_LEVELS, bloodTypeLabel, urgencyMeta, requestStatusMeta, formatDate,
} from '../context/constants';
import { useAuth } from '../context/AuthContext';

const empty = { bloodType: 0, unitsNeeded: 1, urgencyLevel: 1, city: '', notes: '' };

export default function BloodRequestsPage() {
  const { role } = useAuth();
  const userRole = (role || '').toLowerCase();
  const canManage = userRole === 'admin' || userRole === 'bloodbankmanager';

  // 'mine' = my requests, 'active' = open by city filter
  // Managers default to the Active-in-city tab so they see incoming
  // requests the moment they open the page; donors default to their own.
  const [tab, setTab] = useState(canManage ? 'active' : 'mine');
  const [city, setCity] = useState('');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      let res;
      if (tab === 'active') {
        // Manager view: requests in their bank's city.
        if (canManage) {
          try {
            const mineBank = await bloodBanksApi.mine();
            const bankId = mineBank.data?.id ?? mineBank.data?.Id;
            if (bankId) {
              res = await bloodRequestsApi.byBank(bankId);
            } else {
              res = { data: [] };
            }
          } catch {
            // No bank / fallback to public city feed
            res = city ? await bloodRequestsApi.activeByCity(city) : { data: [] };
          }
        } else {
          res = city ? await bloodRequestsApi.activeByCity(city) : { data: [] };
        }
      } else {
        res = await bloodRequestsApi.mine();
      }
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load requests.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab, canManage]);

  const onCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await bloodRequestsApi.create({
        bloodType: Number(form.bloodType),
        unitsNeeded: Number(form.unitsNeeded),
        urgencyLevel: Number(form.urgencyLevel),
        city: form.city.trim(),
        notes: form.notes.trim() || null,
      });
      toast.success('Request created.');
      setShowModal(false);
      setForm(empty);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to create request.'));
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (id) => {
    if (!confirm('Cancel this request?')) return;
    try {
      await bloodRequestsApi.cancel(id);
      toast.success('Request cancelled.');
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Cancel failed.'));
    }
  };

  const fulfill = async (id) => {
    if (!confirm('Mark this request as fulfilled? This action should only be taken when the blood has been provided.')) return;
    try {
      const res = await bloodRequestsApi.fulfill(id);
      // The backend returns the updated entity. Show what came back so
      // the user can see the new status immediately, even before reload.
      const newStatus = res?.data?.status ?? res?.data?.Status;
      const newName = typeof newStatus === 'number'
        ? (newStatus === 2 ? 'Fulfilled' : newStatus === 3 ? 'Cancelled' : 'Updated')
        : newStatus;
      toast.success(`Request fulfilled (status: ${newName}).`);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Fulfill failed.'));
    }
  };

  const notify = async (id) => {
    try {
      const res = await bloodRequestsApi.notify(id);
      const n = res.data?.notified ?? res.data?.Notified;
      toast.success(n != null ? `Notified ${n} compatible donor(s).` : 'Matching donors notified.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Notify failed.'));
    }
  };

  // Group + sort: pending first, then by urgency
  // Normalize the backend's RequestStatus (enum int 0..4) to the enum name.
  const rawName = (r) => {
    const raw = r?.status ?? r?.Status ?? 0;
    if (raw === 0 || raw === '0' || raw === 'Pending')     return 'Pending';
    if (raw === 1 || raw === '1' || raw === 'InProgress')  return 'InProgress';
    if (raw === 2 || raw === '2' || raw === 'Fulfilled')   return 'Fulfilled';
    if (raw === 3 || raw === '3' || raw === 'Cancelled')   return 'Cancelled';
    if (raw === 4 || raw === '4' || raw === 'Expired')     return 'Expired';
    if (raw === 'Active') return 'Pending'; // legacy alias
    return 'Unknown';
  };

  const sorted = [...items].sort((a, b) => {
    const aP = rawName(a) === 'Pending' ? 0 : 1;
    const bP = rawName(b) === 'Pending' ? 0 : 1;
    if (aP !== bP) return aP - bP;
    return (b.urgencyLevel ?? b.UrgencyLevel ?? 0) - (a.urgencyLevel ?? a.UrgencyLevel ?? 0);
  });

  return (
    <Container>
      <PageHeader
        title="Blood Requests"
        subtitle="Create and manage blood requests. Bank managers can fulfill them once blood is provided."
        actions={<Button variant="danger" onClick={() => setShowModal(true)}>+ New request</Button>}
      />

      <Card className="shadow-sm border-0 mb-3">
        <Card.Body className="p-2">
          {canManage && tab === 'active' && (
            <div className="text-muted small mb-2">
              <Badge bg="info" className="me-1">Manager view</Badge>
              Showing active blood requests for <strong>your bank</strong>'s city.
            </div>
          )}
          <Nav variant="pills" activeKey={tab} onSelect={(k) => k && setTab(k)}>
            <Nav.Item>
              <Nav.Link eventKey="mine">📋 My requests</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="active">🌍 Active in city</Nav.Link>
            </Nav.Item>
          </Nav>
        </Card.Body>
      </Card>

      {tab === 'active' && canManage && sorted.length > 0 && (
        <Alert variant="info" className="small mb-3">
          <strong>How to approve a request:</strong> click <Badge bg="success">✓ Fulfill</Badge> when
          you can provide the blood, or <Badge bg="outline-danger">Cancel</Badge> if you cannot.
          Approved requests move patients off the wait list.
        </Alert>
      )}

      {tab === 'active' && (
        <Row className="g-2 mb-3">
          <Col md={6}>
            <InputGroup>
              <InputGroup.Text>🏙️</InputGroup.Text>
              <Form.Control
                placeholder="Filter by city (e.g. Ramallah)…"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
              />
              <Button variant="danger" onClick={load}>Search</Button>
            </InputGroup>
          </Col>
        </Row>
      )}

      {error && <Alert variant="warning">{error}</Alert>}

      {loading ? (
        <Loading />
      ) : sorted.length === 0 ? (
        <EmptyState
          title={
            tab === 'active'
              ? (canManage ? 'No active requests for your bank' : 'No active requests')
              : 'No requests yet'
          }
          message={
            tab === 'active'
              ? (canManage
                  ? 'There are no pending blood requests in your bank\'s city right now.'
                  : (city
                      ? `No pending requests in ${city}.`
                      : 'Enter a city to find active requests.'))
              : 'Click + New request to create one.'
          }
          icon="🩸"
        />
      ) : (
        <Card className="shadow-sm border-0">
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Blood</th>
                  <th>Units</th>
                  <th>City</th>
                  <th>Urgency</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const id = r.id || r.Id;
                  const u = urgencyMeta(r.urgencyLevel ?? r.UrgencyLevel);
                  const s = requestStatusMeta(r.status ?? r.Status);
                  return (
                    <tr key={id}>
                      <td><Badge bg="danger">{bloodTypeLabel(r.bloodType ?? r.BloodType)}</Badge></td>
                      <td>{r.unitsNeeded ?? r.UnitsNeeded}</td>
                      <td>{r.city || r.City || '—'}</td>
                      <td><Badge bg={u.variant}>{u.label}</Badge></td>
                      <td><Badge bg={s.variant}>{s.label}</Badge></td>
                      <td className="small text-muted">{formatDate(r.createdAt || r.CreatedAt)}</td>
                      <td className="text-end">
                        {canManage && (
                          <Button size="sm" variant="outline-primary" className="me-1" onClick={() => notify(id)}>
                            Notify
                          </Button>
                        )}
                        {canManage && s.label !== 'Fulfilled ✓' && s.label !== 'Cancelled' && (
                          <Button size="sm" variant="success" className="me-1" onClick={() => fulfill(id)}>
                            ✓ Fulfill
                          </Button>
                        )}
                        {s.label !== 'Cancelled' && s.label !== 'Fulfilled ✓' && (
                          <Button size="sm" variant="outline-danger" onClick={() => cancel(id)}>
                            Cancel
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </Card>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Form onSubmit={onCreate}>
          <Modal.Header closeButton>
            <Modal.Title>New blood request</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Blood type</Form.Label>
                  <Form.Select value={form.bloodType} onChange={(e) => setForm({ ...form, bloodType: e.target.value })}>
                    {BLOOD_TYPES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Units needed</Form.Label>
                  <Form.Control
                    type="number"
                    min={1}
                    value={form.unitsNeeded}
                    onChange={(e) => setForm({ ...form, unitsNeeded: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Urgency</Form.Label>
              <Form.Select value={form.urgencyLevel} onChange={(e) => setForm({ ...form, urgencyLevel: e.target.value })}>
                {URGENCY_LEVELS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>City</Form.Label>
              <Form.Control
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="e.g. Ramallah"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Notes (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="danger" disabled={saving}>
              {saving ? <Spinner size="sm" animation="border" /> : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}
