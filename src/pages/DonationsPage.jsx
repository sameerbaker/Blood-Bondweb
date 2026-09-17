import { useEffect, useState } from 'react';
import {
  Container, Row, Col, Card, Form, Button, Table, Badge, Modal, Alert, Spinner, Nav, InputGroup,
} from 'react-bootstrap';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { donationsApi, bloodBanksApi } from '../api';
import { getFreshIdempotencyKey } from '../api/client';
import { apiErrorMessage } from '../utils/error';

// Normalize the backend's DonationStatus (serialized as integer 0..4
// by default) to the enum name. Also tolerates the string form.
function rawStatusName(raw) {
  if (raw === 0 || raw === '0' || raw === 'Scheduled') return 'Scheduled';
  if (raw === 1 || raw === '1' || raw === 'Approved')  return 'Approved';
  if (raw === 2 || raw === '2' || raw === 'Rejected')  return 'Rejected';
  if (raw === 3 || raw === '3' || raw === 'Completed') return 'Completed';
  if (raw === 4 || raw === '4' || raw === 'Cancelled') return 'Cancelled';
  // Legacy aliases
  if (raw === 'Pending') return 'Scheduled';
  if (raw === 'Failed')  return 'Rejected';
  return 'Unknown';
}
import { donationStatusMeta, formatDate, bloodTypeLabel } from '../context/constants';
import { useAuth } from '../context/AuthContext';

const emptySchedule = { bloodBankId: '', scheduledDate: '', notes: '' };
const emptyComplete = { unitsDonated: 1, notes: '' };

export default function DonationsPage() {
  const { role } = useAuth();
  const userRole = (role || '').toLowerCase();
  const canManage = userRole === 'admin' || userRole === 'bloodbankmanager';

  // 'mine' = my donations, 'pending' = donations waiting for approval
  const [tab, setTab] = useState(canManage ? 'pending' : 'mine');

  const [items, setItems] = useState([]);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptySchedule);
  const [saving, setSaving] = useState(false);

  // Complete modal (manager side)
  const [showComplete, setShowComplete] = useState(null);
  const [completeForm, setCompleteForm] = useState(emptyComplete);
  const [completing, setCompleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      let res;
      if (canManage) {
        // Manager / Admin: load donations for the bank they manage.
        // Try /mine first (own donations); also try /by-bank for the
        // manager's bank so they see incoming requests from donors.
        const myRes = await donationsApi.mine().catch(() => ({ data: [] }));
        const myList = Array.isArray(myRes.data) ? myRes.data : [];

        let bankList = [];
        try {
          // Get the bank the manager owns
          const mineBank = await bloodBanksApi.mine();
          const bankId = mineBank.data?.id ?? mineBank.data?.Id;
          if (bankId) {
            const bankRes = await donationsApi.byBank(bankId);
            bankList = Array.isArray(bankRes.data) ? bankRes.data : [];
          }
        } catch { /* not a manager / no bank yet */ }

        // Merge + dedupe by id
        const all = [...bankList, ...myList];
        const seen = new Set();
        res = { data: all.filter((d) => {
          const id = d.id ?? d.Id;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        }) };
      } else {
        // Regular user: only their own donations
        res = await donationsApi.mine();
      }
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load donations.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    bloodBanksApi.listVerified()
      .then((res) => setBanks(Array.isArray(res.data) ? res.data : []))
      .catch(() => setBanks([]));
  }, []);

  useEffect(() => { load(); }, []);

  const onSchedule = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await donationsApi.schedule({
        bloodBankId: Number(form.bloodBankId),
        scheduledDate: form.scheduledDate,
        notes: form.notes.trim() || null,
        // Idempotency key — collapses double-click / retry into one
        // appointment (see DonationService.ScheduleAsync).
        idempotencyKey: getFreshIdempotencyKey('don'),
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

  const approve = async (d) => {
    const id = d.id || d.Id;
    try {
      await donationsApi.approve(id);
      toast.success('Donation approved.');
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Approve failed.'));
    }
  };

  const openComplete = (d) => {
    setShowComplete(d);
    setCompleteForm({ unitsDonated: 1, notes: '' });
  };

  const onComplete = async (e) => {
    e.preventDefault();
    if (!showComplete) return;
    setCompleting(true);
    try {
      await donationsApi.complete(showComplete.id || showComplete.Id, {
        unitsDonated: Number(completeForm.unitsDonated) || 1,
        notes: completeForm.notes.trim() || null,
      });
      toast.success('Donation completed — inventory updated.');
      setShowComplete(null);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Complete failed.'));
    } finally {
      setCompleting(false);
    }
  };

  // Tab filtering + sorting
  const filtered = items.filter((d) => {
    // Backend serializes the DonationStatus enum as an integer (0..4) by
    // default. Normalize to the enum name so the tabs work.
    const raw = d.status ?? d.Status ?? 0;
    const name = rawStatusName(raw);
    if (tab === 'pending')   return name === 'Scheduled';
    if (tab === 'completed') return name === 'Completed' || name === 'Approved';
    return true; // 'mine' = show all
  });

  // Counts for the tabs
  const counts = {
    all:       items.length,
    pending:   items.filter((d) => rawStatusName(d.status ?? d.Status) === 'Scheduled').length,
    completed: items.filter((d) => ['Completed', 'Approved'].includes(rawStatusName(d.status ?? d.Status))).length,
  };

  return (
    <Container>
      <PageHeader
        title="Donations"
        subtitle="Your scheduled, approved, and completed donations."
        actions={
          <Button variant="danger" onClick={() => setShowModal(true)}>
            + Schedule donation
          </Button>
        }
      />

      <Card className="shadow-sm border-0 mb-3">
        <Card.Body className="p-2">
          {canManage && (
            <div className="text-muted small mb-2">
              <Badge bg="info" className="me-1">Manager view</Badge>
              Showing donations scheduled for <strong>your bank</strong>, plus any you personally scheduled.
            </div>
          )}
          <Nav variant="pills" activeKey={tab} onSelect={(k) => k && setTab(k)}>
            <Nav.Item><Nav.Link eventKey="mine">🩸 All ({counts.all})</Nav.Link></Nav.Item>
            {canManage && (
              <Nav.Item>
                <Nav.Link eventKey="pending">
                  ⏳ Pending ({counts.pending})
                  {counts.pending > 0 && <Badge bg="warning" text="dark" className="ms-2">action needed</Badge>}
                </Nav.Link>
              </Nav.Item>
            )}
            <Nav.Item><Nav.Link eventKey="completed">✓ Completed ({counts.completed})</Nav.Link></Nav.Item>
          </Nav>
        </Card.Body>
      </Card>

      {error && <Alert variant="warning">{error}</Alert>}

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No donations here"
          message={
            tab === 'pending'
              ? 'No donations waiting for approval.'
              : tab === 'completed'
                ? 'No completed donations yet.'
                : 'Schedule your first donation to start earning badges.'
          }
          icon="💉"
        />
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
                  <th>Notes</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const id = d.id || d.Id;
                  const s = donationStatusMeta(d.status ?? d.Status);
                  const bank = d.bloodBankName || d.BloodBankName || `Bank #${d.bloodBankId ?? d.BloodBankId}`;
                  return (
                    <tr key={id}>
                      <td><strong>{bank}</strong></td>
                      <td className="small">{formatDate(d.scheduledDate || d.ScheduledDate)}</td>
                      <td>{d.unitsDonated ?? d.UnitsDonated ?? '—'}</td>
                      <td><Badge bg={s.variant}>{s.label}</Badge></td>
                      <td className="small text-muted" style={{ maxWidth: 200 }}>
                        {(d.notes || d.Notes || '').slice(0, 60)}{(d.notes || d.Notes || '').length > 60 ? '…' : ''}
                      </td>
                      <td className="text-end">
                        {canManage && s.label === 'Scheduled (awaiting approval)' && (
                          <>
                            <Button size="sm" variant="success" className="me-1" onClick={() => approve(d)}>
                              ✓ Approve
                            </Button>
                            <Button size="sm" variant="primary" onClick={() => openComplete(d)}>
                              💉 Complete
                            </Button>
                          </>
                        )}
                        {canManage && s.label === 'Approved' && (
                          <Button size="sm" variant="primary" onClick={() => openComplete(d)}>
                            💉 Complete
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

      {/* Schedule modal */}
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

      {/* Complete modal (manager side) */}
      <Modal show={!!showComplete} onHide={() => setShowComplete(null)} centered>
        <Form onSubmit={onComplete}>
          <Modal.Header closeButton>
            <Modal.Title>Complete donation</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Alert variant="info" className="small">
              Completing this donation will update the bank's inventory and award points to the donor.
            </Alert>
            <Form.Group className="mb-3">
              <Form.Label>Units donated</Form.Label>
              <Form.Control
                type="number"
                min={1}
                value={completeForm.unitsDonated}
                onChange={(e) => setCompleteForm({ ...completeForm, unitsDonated: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Notes (optional)</Form.Label>
              <Form.Control
                as="textarea" rows={2}
                value={completeForm.notes}
                onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowComplete(null)}>Cancel</Button>
            <Button type="submit" variant="success" disabled={completing}>
              {completing ? <Spinner size="sm" animation="border" /> : 'Mark complete'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}
