import { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Badge, Modal, Alert, Spinner, ButtonGroup } from 'react-bootstrap';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { bloodBanksApi } from '../api';
import { apiErrorMessage, isManagerOwnershipError } from '../utils/error';
import { bloodTypeLabel } from '../context/constants';
import { useAuth } from '../context/AuthContext';

const emptyForm = {
  name: '',
  cityAddress: '',
  latitude: '',
  longitude: '',
  contactPhone: '',
};

export default function BloodBanksPage() {
  const { role } = useAuth();
  const userRole = (role || '').toLowerCase();
  const isAdmin = userRole === 'admin';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showInventory, setShowInventory] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await bloodBanksApi.list();
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load blood banks.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((b) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const name = b.name || b.Name || '';
    const city = b.cityAddress || b.CityAddress || '';
    return name.toLowerCase().includes(q) || city.toLowerCase().includes(q);
  });

  // Count of pending banks (any of: status 0, "Pending", or unverified)
  const pendingCount = items.filter((b) => {
    const s = b.status ?? b.Status;
    return s === 0 || s === '0' || s === 'Pending' || (!b.isVerified && s == null);
  }).length;

  const scrollToPending = () => {
    const el = document.querySelector('tr.table-warning');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };

  // Approve / Reject (admin only)
  const approve = async (b) => {
    const id = b.id || b.Id;
    if (!confirm(`Approve "${b.name || b.Name}"?`)) return;
    try {
      await bloodBanksApi.approve(id);
      toast.success('Bank approved.');
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Approve failed.'));
    }
  };

  const reject = async (b) => {
    const id = b.id || b.Id;
    if (!confirm(`Reject "${b.name || b.Name}"?`)) return;
    try {
      await bloodBanksApi.reject(id);
      toast.success('Bank rejected.');
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Reject failed.'));
    }
  };
  const openEdit = (b) => {
    setEditing(b);
    setForm({
      name: b.name || b.Name || '',
      cityAddress: b.cityAddress || b.CityAddress || '',
      latitude: b.latitude ?? b.Latitude ?? '',
      longitude: b.longitude ?? b.Longitude ?? '',
      contactPhone: b.contactPhone || b.ContactPhone || '',
    });
    setShowModal(true);
  };

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      cityAddress: form.cityAddress.trim(),
      latitude: form.latitude === '' ? null : Number(form.latitude),
      longitude: form.longitude === '' ? null : Number(form.longitude),
      contactPhone: form.contactPhone.trim(),
    };
    try {
      if (editing) {
        const id = editing.id || editing.Id;
        await bloodBanksApi.update(id, payload);
        toast.success('Blood bank updated.');
      } else {
        await bloodBanksApi.create(payload);
        toast.success('Blood bank created — awaiting admin approval.');
      }
      setShowModal(false);
      await load();
    } catch (err) {
      if (isManagerOwnershipError(err)) {
        toast.error(
          '⛔ You are not the manager of this blood bank. The backend restricts updates to the bank\'s own manager. ' +
          'To fix this, redeploy the backend with the IsAdminOrManager override in BloodBankService.cs.',
          { duration: 8000 }
        );
      } else if (err.response?.status === 500) {
        toast.error(
          'Server error (500). The backend doesn\'t have the admin override yet — redeploy BloodBankService.cs ' +
          'with the IsAdminOrManager check, OR log in as this bank\'s manager.',
          { duration: 8000 }
        );
      } else {
        toast.error(apiErrorMessage(err, 'Save failed.'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container>
      <PageHeader
        title="Blood Banks"
        subtitle="All registered blood banks in the system."
        actions={
          <Button variant="danger" onClick={openCreate}>+ New blood bank</Button>
        }
      />

      <Row className="g-3 mb-3">
        <Col md={6}>
          <Form.Control
            placeholder="Search by name or city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Col>
        <Col md={6} className="text-md-end text-muted small">
          {loading ? 'Loading…' : `${filtered.length} result(s) · ${pendingCount} pending approval`}
        </Col>
      </Row>

      {error && <Alert variant="warning">{error}</Alert>}

      {isAdmin && pendingCount > 0 && (
        <Alert variant="warning" className="d-flex justify-content-between align-items-center">
          <span>
            <strong>⏳ {pendingCount} blood bank{pendingCount > 1 ? 's' : ''} need{pendingCount === 1 ? 's' : ''} your approval.</strong>
            {' '}Click the ✓ Approve button to activate them.
          </span>
          <Button size="sm" variant="warning" onClick={scrollToPending}>
            Show pending
          </Button>
        </Alert>
      )}

       {isAdmin && (
        <Alert variant="info" className="small">
          <strong>👑 Admin tip:</strong> You can <strong>Approve / Reject</strong> any bank.
          For <strong>editing details or updating inventory</strong>, the backend currently
          requires you to be the bank's manager. If you see <code>500 — You are not the manager</code>,
          log in as the bank's manager or update the backend's
          <code>BloodBankService.IsAdminOrManager</code> check.
        </Alert>
      )} 

      {loading ? (
        <Loading label="Loading blood banks…" />
      ) : filtered.length === 0 ? (
        <EmptyState title="No blood banks found" message="Create the first one to get started." />
      ) : (
        <Card className="shadow-sm border-0">
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Name</th>
                  <th>City</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => {
                  const id = b.id || b.Id;
                  // Normalize status — backend may return enum int OR string
                  const rawStatus = b.status ?? b.Status;
                  let statusKey = 'Unknown';
                  if (rawStatus === 0 || rawStatus === '0' || rawStatus === 'Pending') statusKey = 'Pending';
                  else if (rawStatus === 1 || rawStatus === '1' || rawStatus === 'Verified' || b.isVerified) statusKey = 'Verified';
                  else if (rawStatus === 2 || rawStatus === '2' || rawStatus === 'Rejected') statusKey = 'Rejected';
                  else if (rawStatus === 3 || rawStatus === '3' || rawStatus === 'Suspended') statusKey = 'Suspended';
                  const statusMeta = {
                    Pending:   { variant: 'warning', label: 'Pending',  isPending: true  },
                    Verified:  { variant: 'success', label: 'Verified', isPending: false },
                    Rejected:  { variant: 'danger',  label: 'Rejected', isPending: false },
                    Suspended: { variant: 'secondary', label: 'Suspended', isPending: false },
                    Unknown:   { variant: 'secondary', label: String(rawStatus ?? '—'), isPending: false },
                  }[statusKey];
                  return (
                    <tr key={id} className={statusMeta.isPending ? 'table-warning' : ''}>
                      <td><strong>{b.name || b.Name}</strong></td>
                      <td>{b.cityAddress || b.CityAddress || '—'}</td>
                      <td>{b.contactPhone || b.ContactPhone || '—'}</td>
                      <td>
                        <Badge bg={statusMeta.variant}>{statusMeta.label}</Badge>
                      </td>
                      <td className="text-end">
                        <ButtonGroup size="sm">
                          {isAdmin && statusMeta.isPending && (
                            <>
                              <Button variant="success" onClick={() => approve(b)}>
                                ✓ Approve
                              </Button>
                              <Button variant="outline-danger" onClick={() => reject(b)}>
                                ✗ Reject
                              </Button>
                            </>
                          )}
                          <Button variant="outline-secondary" onClick={() => setShowInventory(b)}>
                            Inventory
                          </Button>
                          <Button variant="outline-danger" onClick={() => openEdit(b)}>
                            Edit
                          </Button>
                        </ButtonGroup>
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
        <Form onSubmit={onSave}>
          <Modal.Header closeButton>
            <Modal.Title>{editing ? 'Edit blood bank' : 'New blood bank'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>City / Address</Form.Label>
              <Form.Control value={form.cityAddress} onChange={(e) => setForm({ ...form, cityAddress: e.target.value })} required />
            </Form.Group>
            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Latitude</Form.Label>
                  <Form.Control type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Longitude</Form.Label>
                  <Form.Control type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Contact phone</Form.Label>
              <Form.Control value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
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

      <InventoryModal bank={showInventory} onClose={() => setShowInventory(null)} />
    </Container>
  );
}

function InventoryModal({ bank, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!bank) return;
    setLoading(true);
    bloodBanksApi.get(bank.id || bank.Id)
      .then((res) => {
        const inv = res.data?.inventory || res.data?.Inventory || [];
        setItems(inv);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [bank]);

  if (!bank) return null;

  const onSave = async () => {
    setSaving(true);
    try {
      await bloodBanksApi.setInventory(bank.id || bank.Id, items);
      toast.success('Inventory updated.');
      onClose();
    } catch (err) {
      if (isManagerOwnershipError(err)) {
        toast.error(
          'You are not the manager of this blood bank. The backend restricts inventory updates to the bank\'s own manager. Log in as the bank\'s manager to update inventory.'
        );
      } else {
        toast.error(apiErrorMessage(err, 'Failed to update inventory.'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Inventory — {bank.name || bank.Name}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? <Loading label="Loading inventory…" /> : (
          <Table size="sm" className="align-middle">
            <thead>
              <tr><th>Blood type</th><th className="text-end">Units</th></tr>
            </thead>
            <tbody>
              {[0,1,2,3,4,5,6,7].map((bt) => {
                const existing = items.find((i) => Number(i.bloodType ?? i.BloodType) === bt);
                return (
                  <tr key={bt}>
                    <td><Badge bg="danger">{bloodTypeLabel(bt)}</Badge></td>
                    <td className="text-end" style={{ width: 120 }}>
                      <Form.Control
                        type="number"
                        min={0}
                        value={existing?.unitsAvailable ?? existing?.UnitsAvailable ?? 0}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setItems((prev) => {
                            const without = prev.filter((i) => Number(i.bloodType ?? i.BloodType) !== bt);
                            return [...without, { bloodType: bt, unitsAvailable: v }];
                          });
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button variant="danger" onClick={onSave} disabled={saving}>
          {saving ? <Spinner size="sm" animation="border" /> : 'Save inventory'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
