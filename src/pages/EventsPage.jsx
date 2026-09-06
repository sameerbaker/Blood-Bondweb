import { useEffect, useState } from 'react';
import {
  Container, Row, Col, Card, Form, Button, Table, Badge, Modal, Alert, Spinner,
  ButtonGroup, InputGroup,
} from 'react-bootstrap';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { eventsApi } from '../api';
import { apiErrorMessage } from '../utils/error';
import { formatDate } from '../context/constants';

const emptyEvent = {
  title: '',
  description: '',
  location: '',
  city: '',
  startAt: '',
  endAt: '',
  capacity: 50,
  isPublic: true,
};

// Quick set of sample cards shown when the API is not yet wired —
// makes the page useful out-of-the-box and gives you something to copy
// when you implement the real endpoint.
const SAMPLE_EVENTS = [
  {
    id: 'sample-1',
    title: 'Ramallah Community Blood Drive',
    description: 'Open day at Al-Watani Hospital — every donor gets a free t-shirt and refreshments.',
    location: 'Al-Watani Hospital, Ramallah',
    city: 'Ramallah',
    startAt: new Date(Date.now() + 7 * 86400_000).toISOString(),
    endAt: new Date(Date.now() + 7 * 86400_000 + 4 * 3600_000).toISOString(),
    capacity: 80,
    attendeesCount: 23,
    isPublic: true,
    isSample: true,
  },
  {
    id: 'sample-2',
    title: 'University Awareness Week',
    description: 'Birzeit University student council — talks, booths, and on-site donation.',
    location: 'Birzeit University Main Hall',
    city: 'Birzeit',
    startAt: new Date(Date.now() + 14 * 86400_000).toISOString(),
    endAt: new Date(Date.now() + 14 * 86400_000 + 6 * 3600_000).toISOString(),
    capacity: 120,
    attendeesCount: 47,
    isPublic: true,
    isSample: true,
  },
];

export default function EventsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [apiLive, setApiLive] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grid'); // 'grid' | 'list'

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyEvent);
  const [saving, setSaving] = useState(false);

  // When the API is not yet implemented we show the samples so the page
  // still looks complete in production demos.
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await eventsApi.list();
      const list = Array.isArray(res.data) ? res.data : [];
      setItems(list);
      setApiLive(true);
    } catch (err) {
      // Treat 404 / 501 as "not implemented yet" and show samples
      const status = err.response?.status;
      if (status === 404 || status === 501 || status === 405) {
        setItems(SAMPLE_EVENTS);
        setApiLive(false);
        setError('');
      } else {
        setError(apiErrorMessage(err, 'Failed to load events.'));
        setItems(SAMPLE_EVENTS);
        setApiLive(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((e) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [e.title, e.description, e.location, e.city]
      .filter(Boolean).join(' ').toLowerCase().includes(q);
  });

  const openCreate = () => { setEditing(null); setForm(emptyEvent); setShowModal(true); };
  const openEdit = (e) => {
    setEditing(e);
    setForm({
      title: e.title || '',
      description: e.description || '',
      location: e.location || '',
      city: e.city || '',
      startAt: toLocalInput(e.startAt || e.StartAt),
      endAt: toLocalInput(e.endAt || e.EndAt),
      capacity: e.capacity ?? 50,
      isPublic: e.isPublic ?? true,
    });
    setShowModal(true);
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!apiLive) {
      toast.error('API not connected — cannot save samples.');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      capacity: Number(form.capacity) || 0,
      startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
      endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
    };
    try {
      if (editing) {
        const id = editing.id || editing.Id;
        await eventsApi.update(id, payload);
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
    if (!apiLive) {
      toast.error('API not connected — samples cannot be deleted.');
      return;
    }
    if (!confirm('Delete this event?')) return;
    const id = e.id || e.Id;
    try {
      await eventsApi.remove(id);
      toast.success('Event deleted.');
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Delete failed.'));
    }
  };

  const onRsvp = async (e) => {
    if (!apiLive) {
      toast.success('RSVP recorded (demo).');
      return;
    }
    const id = e.id || e.Id;
    try {
      await eventsApi.rsvp(id);
      toast.success(`You're going to "${e.title || e.Title}"`);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'RSVP failed.'));
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
              variant={view === 'grid' ? 'danger' : 'outline-danger'}
              onClick={() => setView('grid')}
              size="sm"
            >🟦 Grid</Button>
            <Button
              variant={view === 'list' ? 'danger' : 'outline-danger'}
              onClick={() => setView('list')}
              size="sm"
            >📋 List</Button>
          </ButtonGroup>
        }
      />

      {!apiLive && !loading && (
        <Alert variant="info" className="d-flex justify-content-between align-items-center">
          <span>
            <strong>Demo mode:</strong> the events API isn't connected yet.
            Showing sample events so the page is usable.
          </span>
        </Alert>
      )}

      {error && <Alert variant="warning">{error}</Alert>}

      <Row className="g-3 mb-3">
        <Col md={8}>
          <InputGroup>
            <InputGroup.Text>🔍</InputGroup.Text>
            <Form.Control
              placeholder="Search events…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={4} className="text-md-end">
          <Button variant="danger" onClick={openCreate}>+ New event</Button>
        </Col>
      </Row>

      {loading ? (
        <Loading label="Loading events…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No events yet"
          message="Click + New event to create the first one."
          icon="📅"
        />
      ) : view === 'grid' ? (
        <Row className="g-3">
          {filtered.map((e) => (
            <Col key={e.id || e.Id} md={6} lg={4}>
              <EventCard
                event={e}
                onRsvp={() => onRsvp(e)}
                onEdit={() => openEdit(e)}
                onDelete={() => onDelete(e)}
                isSample={!!e.isSample}
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
                  <th>Capacity</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id || e.Id}>
                    <td>
                      <strong>{e.title || e.Title}</strong>
                      {e.isSample && <Badge bg="info" className="ms-2">demo</Badge>}
                      {e.isPublic === false && <Badge bg="secondary" className="ms-2">private</Badge>}
                    </td>
                    <td className="small">{formatDate(e.startAt || e.StartAt)}</td>
                    <td className="small">{e.city || e.City || e.location || e.Location || '—'}</td>
                    <td>
                      <CapacityBar event={e} />
                    </td>
                    <td className="text-end">
                      <Button size="sm" variant="outline-danger" className="me-1" onClick={() => onRsvp(e)}>
                        RSVP
                      </Button>
                      <Button size="sm" variant="outline-secondary" className="me-1" onClick={() => openEdit(e)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline-dark" onClick={() => onDelete(e)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
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
              <Form.Label>Title</Form.Label>
              <Form.Control value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Location</Form.Label>
                  <Form.Control value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>City</Form.Label>
                  <Form.Control value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start</Form.Label>
                  <Form.Control type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>End</Form.Label>
                  <Form.Control type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Capacity</Form.Label>
                  <Form.Control type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
                </Form.Group>
              </Col>
              <Col md={6} className="d-flex align-items-end">
                <Form.Check
                  type="switch"
                  id="isPublic"
                  label="Public event"
                  checked={form.isPublic}
                  onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                />
              </Col>
            </Row>
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
  const count = Number(event.attendeesCount ?? event.AttendeesCount ?? 0);
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

function EventCard({ event, onRsvp, onEdit, onDelete, isSample }) {
  const cap = Number(event.capacity ?? event.Capacity ?? 0);
  const count = Number(event.attendeesCount ?? event.AttendeesCount ?? 0);
  const pct = cap > 0 ? Math.min(100, Math.round((count / cap) * 100)) : 0;
  const isFull = cap > 0 && count >= cap;

  return (
    <Card className="shadow-sm border-0 h-100">
      <Card.Body className="d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-1">
          <Badge bg="danger">
            {formatDate(event.startAt || event.StartAt, { dateStyle: 'medium' })}
          </Badge>
          {isSample && <Badge bg="info">demo</Badge>}
        </div>
        <h5 className="mb-1">{event.title || event.Title}</h5>
        <div className="text-muted small mb-2">
          📍 {event.location || event.Location || '—'}{event.city ? `, ${event.city}` : ''}
        </div>
        {event.description && (
          <p className="small text-muted flex-grow-1">
            {(event.description || '').slice(0, 120)}{(event.description || '').length > 120 ? '…' : ''}
          </p>
        )}
        <div className="mb-2">
          <div className="small text-muted d-flex justify-content-between">
            <span>{count} / {cap} going</span>
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
          <Button
            size="sm"
            variant="danger"
            className="flex-grow-1"
            disabled={isFull}
            onClick={onRsvp}
          >
            {isFull ? 'Full' : 'RSVP'}
          </Button>
          <Button size="sm" variant="outline-secondary" onClick={onEdit} aria-label="Edit">✎</Button>
          <Button size="sm" variant="outline-dark" onClick={onDelete} aria-label="Delete">🗑</Button>
        </div>
      </Card.Body>
    </Card>
  );
}

// Convert ISO string to the format that <input type="datetime-local"> expects.
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
