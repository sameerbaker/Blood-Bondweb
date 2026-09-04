import { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Badge, Modal, Alert, Spinner } from 'react-bootstrap';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { bloodRequestsApi } from '../api';
import { apiErrorMessage } from '../utils/error';
import { BLOOD_TYPES, URGENCY_LEVELS, bloodTypeLabel, urgencyMeta } from '../context/constants';

const empty = { bloodType: 0, unitsNeeded: 1, urgencyLevel: 1, city: '', notes: '' };

export default function BloodRequestsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await bloodRequestsApi.mine();
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load requests.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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
    if (!confirm('Mark this request as fulfilled?')) return;
    try {
      await bloodRequestsApi.fulfill(id);
      toast.success('Request fulfilled.');
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Fulfill failed.'));
    }
  };

  const notify = async (id) => {
    try {
      await bloodRequestsApi.notify(id);
      toast.success('Matching donors notified.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Notify failed.'));
    }
  };

  const filtered = items.filter((r) => {
    const c = r.city || r.City || '';
    return !filterCity || c.toLowerCase().includes(filterCity.toLowerCase());
  });

  return (
    <Container>
      <PageHeader
        title="Blood Requests"
        subtitle="Create and manage blood requests."
        actions={<Button variant="danger" onClick={() => setShowModal(true)}>+ New request</Button>}
      />

      <Row className="g-3 mb-3">
        <Col md={6}>
          <Form.Control
            placeholder="Filter by city…"
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
          />
        </Col>
        <Col md={6} className="text-md-end text-muted small">
          {loading ? 'Loading…' : `${filtered.length} request(s)`}
        </Col>
      </Row>

      {error && <Alert variant="warning">{error}</Alert>}

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState title="No requests yet" message="Click + New request to create one." />
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
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const id = r.id || r.Id;
                  const u = urgencyMeta(r.urgencyLevel ?? r.UrgencyLevel);
                  return (
                    <tr key={id}>
                      <td><Badge bg="danger">{bloodTypeLabel(r.bloodType ?? r.BloodType)}</Badge></td>
                      <td>{r.unitsNeeded ?? r.UnitsNeeded}</td>
                      <td>{r.city || r.City || '—'}</td>
                      <td><Badge bg={u.variant}>{u.label}</Badge></td>
                      <td>{r.status || r.Status || '—'}</td>
                      <td className="text-end">
                        <Button size="sm" variant="outline-primary" className="me-1" onClick={() => notify(id)}>
                          Notify
                        </Button>
                        <Button size="sm" variant="outline-success" className="me-1" onClick={() => fulfill(id)}>
                          Fulfill
                        </Button>
                        <Button size="sm" variant="outline-danger" onClick={() => cancel(id)}>
                          Cancel
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
