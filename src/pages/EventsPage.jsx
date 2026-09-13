import { useEffect, useState } from 'react';
import {
  Container, Row, Col, Card, Form, Button, Table, Badge, Modal, Alert, Spinner,
  ButtonGroup, InputGroup, Nav,
} from 'react-bootstrap';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { eventsApi, bloodBanksApi } from '../api';
import { apiErrorMessage } from '../utils/error';
import { formatDate } from '../context/constants';
import { useAuth } from '../context/AuthContext';

const emptyEvent = {
  bloodBankId: '',
  title: '',
  location: '',
  eventDate: '',
  description: '',
  capacity: 50,
};

// Pretty status labels for the attendance record
const ATTENDANCE_STATUS = {
  0: { label: 'Registered', variant: 'info' },
  1: { label: 'Checked-in', variant: 'success' },
  2: { label: 'Cancelled',  variant: 'secondary' },
  3: { label: 'No-show',    variant: 'danger' },
};

export default function EventsPage() {
  const { role, isAuthenticated } = useAuth();
  const userRole = (role || '').toLowerCase();
  const canManage = userRole === 'admin' || userRole === 'bloodbankmanager';

  // 'upcoming' (public) | 'mine' (user's events) | 'manage' (managers only)
  const [tab, setTab] = useState('upcoming');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grid');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyEvent);
  const [saving, setSaving] = useState(false);

  const [banks, setBanks] = useState([]);

  // Load banks once (managers need them in the form)
  useEffect(() => {
    bloodBanksApi.listVerified()
      .then((res) => setBanks(Array.isArray(res.data) ? res.data : []))
      .catch(() => setBanks([]));
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      let res;
      if (tab === 'mine' && isAuthenticated) {
        res = await eventsApi.mine();
      } else if (tab === 'manage' && canManage) {
        // Managers see events of their own bank; admin sees all by default
        if (userRole === 'admin') {
          // Admin has no single bank — try fetching via each bank then merging.
          // Fall back to upcoming if no banks.
          if (banks.length === 0) {
            res = await eventsApi.upcoming();
          } else {
            const all = await Promise.allSettled(
              banks.map((b) => eventsApi.byBank(b.id || b.Id))
            );
            const merged = all
              .filter((x) => x.status === 'fulfilled')
              .flatMap((x) => Array.isArray(x.value.data) ? x.value.data : []);
            res = { data: merged };
          }
        } else {
          // Manager — fetch their own bank first
          try {
            const mine = await bloodBanksApi.mine();
            const bankId = mine.data?.id || mine.data?.Id;
            if (bankId) {
              res = await eventsApi.byBank(bankId);
            } else {
              res = { data: [] };
            }
          } catch {
            res = { data: [] };
          }
        }
      } else {
        res = await eventsApi.upcoming();
      }
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load events.'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab, banks.length]);

  const filtered = items.filter((e) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [e.title, e.description, e.location, e.bloodBankName]
      .filter(Boolean).join(' ').toLowerCase().includes(q);
  });

  const openCreate = () => { setEditing(null); setForm(emptyEvent); setShowModal(true); };
  const openEdit = (e) => {
    setEditing(e);
    setForm({
      bloodBankId: e.bloodBankId ?? '',
      title: e.title || '',
      location: e.location || '',
      eventDate: toLocalInput(e.eventDate || e.EventDate),
      description: e.description || '',
      capacity: e.capacity ?? 50,
    });
    setShowModal(true);
  };

  const onSave = async (ev) => {
    ev.preventDefault();
    if (!form.bloodBankId) {
      toast.error('Please choose a blood bank.');
      return;
    }
    setSaving(true);
    const payload = {
      bloodBankId: Number(form.bloodBankId),
      title: form.title.trim(),
      location: form.location.trim(),
      description: form.description.trim() || null,
      eventDate: form.eventDate ? new Date(form.eventDate).toISOString() : null,
      capacity: Number(form.capacity) || 50,
    };
    try {
      if (editing) {
        await eventsApi.update(editing.id || editing.Id, payload);
        toast.success('Event updated.');
      } else {
        await eventsApi.create(payload);
        toast.success('Event created.');
      }
      setShowModal(false);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Save failed.'));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (e) => {
    if (!confirm(`Delete "${e.title || e.Title}"?`)) return;
    const id = e.id || e.Id;
    try {
      await eventsApi.remove(id);
      toast.success('Event deleted.');
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Delete failed.'));
    }
  };

  const onRegister = async (e) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to register.');
      return;
    }
    const id = e.id || e.Id;
    try {
      await eventsApi.register(id);
      toast.success(`Registered for "${e.title || e.Title}"`);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Registration failed.'));
    }
  };

  const onCancelRegistration = async (e) => {
    const id = e.id || e.Id;
    try {
      await eventsApi.cancel(id);
      toast.success('Registration cancelled.');
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Cancel failed.'));
    }
  };

  const onCheckIn = async (e) => {
    const id = e.id || e.Id;
    try {
      await eventsApi.checkIn(id);
      toast.success('Checked in!');
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Check-in failed.'));
    }
  };

  return (
    <Container>
      <PageHeader
        title="Events"
        subtitle="Blood drives, awareness campaigns, and community meetups."
        actions={
          <ButtonGroup>
            <Button
              size="sm"
              variant={view === 'grid' ? 'danger' : 'outline-danger'}
              onClick={() => setView('grid')}
            >🟦 Grid</Button>
            <Button
              size="sm"
              variant={view === 'list' ? 'danger' : 'outline-danger'}
              onClick={() => setView('list')}
            >📋 List</Button>
          </ButtonGroup>
        }
      />

      {error && <Alert variant="warning">{error}</Alert>}

      <Card className="shadow-sm border-0 mb-3">
        <Card.Body className="p-2">
          <Nav variant="pills" activeKey={tab} onSelect={(k) => k && setTab(k)}>
            <Nav.Item>
              <Nav.Link eventKey="upcoming">📅 Upcoming</Nav.Link>
            </Nav.Item>
            {isAuthenticated && (
              <Nav.Item>
                <Nav.Link eventKey="mine">🎟 My events</Nav.Link>
              </Nav.Item>
            )}
            {canManage && (
              <Nav.Item>
                <Nav.Link eventKey="manage">⚙️ Manage</Nav.Link>
              </Nav.Item>
            )}
          </Nav>
        </Card.Body>
      </Card>

      <Row className="g-3 mb-3">
        <Col md={canManage ? 8 : 10}>
          <InputGroup>
            <InputGroup.Text>🔍</InputGroup.Text>
            <Form.Control
              placeholder="Search events…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
        </Col>
        {canManage && (
          <Col md={4} className="text-md-end">
            <Button variant="danger" onClick={openCreate}>+ New event</Button>
          </Col>
        )}
      </Row>

      {loading ? (
        <Loading label="Loading events…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={tab === 'mine' ? 'No registrations yet' : 'No events found'}
          message={
            tab === 'mine'
              ? 'Register for an event to see it here.'
              : canManage
                ? 'Click + New event to create the first one.'
                : 'Check back soon — new blood drives are added regularly.'
          }
          icon={tab === 'mine' ? '🎟' : '📅'}
        />
      ) : view === 'grid' ? (
        <Row className="g-3">
          {filtered.map((e) => (
            <Col key={e.id || e.Id} md={6} lg={4}>
              <EventCard
                event={e}
                onRegister={() => onRegister(e)}
                onCancel={() => onCancelRegistration(e)}
                onCheckIn={() => onCheckIn(e)}
                onEdit={() => openEdit(e)}
                onDelete={() => onDelete(e)}
                canManage={canManage}
                tab={tab}
              />
            </Col>
          ))}
        </Row>
      ) : (
        <Card className="shadow-sm border-0">
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Event</th>
                  <th>When</th>
                  <th>Where</th>
                  <th>Bank</th>
                  <th>Capacity</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const id = e.id || e.Id;
                  return (
                    <tr key={id}>
                      <td>
                        <strong>{e.title || e.Title}</strong>
                        {e.description && (
                          <div className="text-muted small">
                            {(e.description || '').slice(0, 80)}{(e.description || '').length > 80 ? '…' : ''}
                          </div>
                        )}
                      </td>
                      <td className="small">{formatDate(e.eventDate || e.EventDate)}</td>
                      <td className="small">{e.location || e.Location}</td>
                      <td className="small">{e.bloodBankName || e.BloodBankName || `Bank #${e.bloodBankId ?? e.BloodBankId}`}</td>
                      <td><CapacityBar event={e} /></td>
                      <td className="text-end">
                        <EventRowActions
                          event={e}
                          tab={tab}
                          canManage={canManage}
                          onRegister={onRegister}
                          onCancel={onCancelRegistration}
                          onCheckIn={onCheckIn}
                          onEdit={openEdit}
                          onDelete={onDelete}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </Card>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Form onSubmit={onSave}>
          <Modal.Header closeButton>
            <Modal.Title>{editing ? 'Edit event' : 'New event'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Blood bank</Form.Label>
              <Form.Select
                value={form.bloodBankId}
                onChange={(e) => setForm({ ...form, bloodBankId: e.target.value })}
                required
              >
                <option value="">Select a bank…</option>
                {banks.map((b) => {
                  const id = b.id || b.Id;
                  return <option key={id} value={id}>{b.name || b.Name}</option>;
                })}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={150}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Location</Form.Label>
              <Form.Control
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                maxLength={200}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Event date & time</Form.Label>
              <Form.Control
                type="datetime-local"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={1000}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Capacity</Form.Label>
              <Form.Control
                type="number"
                min={1}
                max={10000}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="danger" disabled={saving}>
              {saving ? <Spinner size="sm" animation="border" /> : 'Save'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}

function CapacityBar({ event }) {
  const cap = Number(event.capacity ?? event.Capacity ?? 0);
  const count = Number(event.registeredCount ?? event.RegisteredCount ?? 0);
  const pct = cap > 0 ? Math.min(100, Math.round((count / cap) * 100)) : 0;
  return (
    <div style={{ minWidth: 140 }}>
      <div className="small text-muted">{count} / {cap}</div>
      <div className="progress" style={{ height: 6 }}>
        <div
          className={`progress-bar ${pct >= 90 ? 'bg-danger' : pct >= 60 ? 'bg-warning' : 'bg-success'}`}
          role="progressbar"
          style={{ width: `${pct}%` }}
          aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
        />
      </div>
    </div>
  );
}

function EventCard({ event, onRegister, onCancel, onCheckIn, onEdit, onDelete, canManage, tab }) {
  const cap = Number(event.capacity ?? event.Capacity ?? 0);
  const count = Number(event.registeredCount ?? event.RegisteredCount ?? 0);
  const pct = cap > 0 ? Math.min(100, Math.round((count / cap) * 100)) : 0;
  const isFull = cap > 0 && count >= cap;

  return (
    <Card className="shadow-sm border-0 h-100">
      <Card.Body className="d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-1">
          <Badge bg="danger">
            {formatDate(event.eventDate || event.EventDate, { dateStyle: 'medium' })}
          </Badge>
          {event.bloodBankName && <Badge bg="secondary">{event.bloodBankName}</Badge>}
        </div>
        <h5 className="mb-1">{event.title || event.Title}</h5>
        <div className="text-muted small mb-2">📍 {event.location || event.Location}</div>
        {event.description && (
          <p className="small text-muted flex-grow-1">
            {(event.description || '').slice(0, 120)}
            {(event.description || '').length > 120 ? '…' : ''}
          </p>
        )}
        <div className="mb-2">
          <div className="small text-muted d-flex justify-content-between">
            <span>{count} / {cap} registered</span>
            <span>{pct}%</span>
          </div>
          <div className="progress" style={{ height: 6 }}>
            <div
              className={`progress-bar ${pct >= 90 ? 'bg-danger' : pct >= 60 ? 'bg-warning' : 'bg-success'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="d-flex gap-2">
          {tab === 'mine' ? (
            <>
              <Button size="sm" variant="success" className="flex-grow-1" onClick={onCheckIn}>
                ✓ Check in
              </Button>
              <Button size="sm" variant="outline-danger" onClick={onCancel}>
                Cancel
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="danger"
              className="flex-grow-1"
              disabled={isFull}
              onClick={onRegister}
            >
              {isFull ? 'Full' : 'Register'}
            </Button>
          )}
          {canManage && tab === 'manage' && (
            <>
              <Button size="sm" variant="outline-secondary" onClick={onEdit}>✎</Button>
              <Button size="sm" variant="outline-dark" onClick={onDelete}>🗑</Button>
            </>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}

function EventRowActions({ event, tab, canManage, onRegister, onCancel, onCheckIn, onEdit, onDelete }) {
  if (tab === 'mine') {
    return (
      <>
        <Button size="sm" variant="outline-success" className="me-1" onClick={() => onCheckIn(event)}>Check-in</Button>
        <Button size="sm" variant="outline-danger" onClick={() => onCancel(event)}>Cancel</Button>
      </>
    );
  }
  if (canManage && tab === 'manage') {
    return (
      <>
        <Button size="sm" variant="outline-secondary" className="me-1" onClick={() => onEdit(event)}>Edit</Button>
        <Button size="sm" variant="outline-dark" onClick={() => onDelete(event)}>Delete</Button>
      </>
    );
  }
  return (
    <Button size="sm" variant="danger" onClick={() => onRegister(event)}>Register</Button>
  );
}

// Convert ISO string → "yyyy-MM-ddTHH:mm" for <input type="datetime-local">
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
