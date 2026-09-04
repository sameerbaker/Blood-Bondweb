import { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Badge, Modal, Alert, Spinner } from 'react-bootstrap';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { donationsApi, bloodBanksApi } from '../api';
import { apiErrorMessage } from '../utils/error';
import { bloodTypeLabel } from '../context/constants';

const emptySchedule = { bloodBankId: '', scheduledDate: '', notes: '' };

export default function DonationsPage() {
  const [items, setItems] = useState([]);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptySchedule);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [dRes, bRes] = await Promise.all([
        donationsApi.mine(),
        bloodBanksApi.listVerified().catch(() => ({ data: [] })),
      ]);
      setItems(Array.isArray(dRes.data) ? dRes.data : []);
      setBanks(Array.isArray(bRes.data) ? bRes.data : []);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load donations.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onSchedule = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await donationsApi.schedule({
        bloodBankId: Number(form.bloodBankId),
        scheduledDate: form.scheduledDate,
        notes: form.notes.trim() || null,
      });
      toast.success('Donation scheduled.');
      setShowModal(false);
      setForm(emptySchedule);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Schedule failed.'));
    } finally {
      setSaving(false);
    }
  };

  const approve = async (id) => {
    try {
      await donationsApi.approve(id);
      toast.success('Donation approved.');
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Approve failed.'));
    }
  };

  return (
    <Container>
      <PageHeader
        title="Donations"
        subtitle="Your scheduled and past donations."
        actions={<Button variant="danger" onClick={() => setShowModal(true)}>+ Schedule donation</Button>}
      />

      {error && <Alert variant="warning">{error}</Alert>}

      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState title="No donations yet" message="Schedule your first donation to start earning badges." />
      ) : (
        <Card className="shadow-sm border-0">
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Bank</th>
                  <th>Scheduled</th>
                  <th>Units</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => {
                  const id = d.id || d.Id;
                  return (
                    <tr key={id}>
                      <td>{d.bloodBankName || d.BloodBankName || `Bank #${d.bloodBankId ?? d.BloodBankId}`}</td>
                      <td>{(d.scheduledDate || d.ScheduledDate || '').replace('T', ' ').slice(0, 16)}</td>
                      <td>{d.unitsDonated ?? d.UnitsDonated ?? '—'}</td>
                      <td><Badge bg="info">{d.status || d.Status || 'Pending'}</Badge></td>
                      <td className="text-end">
                        <Button size="sm" variant="outline-success" onClick={() => approve(id)}>
                          Approve
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
        <Form onSubmit={onSchedule}>
          <Modal.Header closeButton><Modal.Title>Schedule a donation</Modal.Title></Modal.Header>
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
              <Form.Label>Scheduled date & time</Form.Label>
              <Form.Control
                type="datetime-local"
                value={form.scheduledDate}
                onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Notes (optional)</Form.Label>
              <Form.Control
                as="textarea" rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="danger" disabled={saving}>
              {saving ? <Spinner size="sm" animation="border" /> : 'Schedule'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}
