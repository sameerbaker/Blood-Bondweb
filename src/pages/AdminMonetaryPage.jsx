import { useEffect, useMemo, useState } from 'react';
import {
  Container, Row, Col, Card, Form, Button, Table, Badge, Alert, Spinner,
  Nav, InputGroup,
} from 'react-bootstrap';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { monetaryApi } from '../api';
import { apiErrorMessage } from '../utils/error';
import { formatMoney, formatDate } from '../context/constants';

const STATUS_META = {
  Pending:   { variant: 'warning',   label: 'Pending' },
  Succeeded: { variant: 'success',   label: 'Succeeded ✓' },
  Failed:    { variant: 'danger',    label: 'Failed ✗' },
  Refunded:  { variant: 'secondary', label: 'Refunded' },
  Canceled:  { variant: 'secondary', label: 'Cancelled' },
};

export default function AdminMonetaryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await monetaryApi.all();
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (err.response?.status === 404) {
        setError(
          'Backend route not found: GET /api/monetarydonations/all. ' +
          'Add this endpoint to MonetaryDonationsController.cs (Admin only).'
        );
      } else if (err.response?.status === 403) {
        setError('Forbidden — make sure you are signed in as Admin.');
      } else {
        setError(apiErrorMessage(err, 'Failed to load donations.'));
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const decide = async (d, outcome) => {
    const intentId = d.stripePaymentIntentId || d.StripePaymentIntentId;
    if (!intentId) {
      toast.error('Donation has no Stripe payment intent ID.');
      return;
    }
    setWorking(d.id || d.Id);
    try {
      await monetaryApi.confirm(intentId, outcome);
      toast.success(
        outcome === 'Succeeded'
          ? `✓ Approved donation of ${formatMoney(d.amount ?? d.Amount ?? 0, d.currency || d.Currency || 'usd')}`
          : `✗ Rejected donation`
      );
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Action failed.'));
    } finally {
      setWorking(null);
    }
  };

  const counts = useMemo(() => ({
    all:       items.length,
    pending:   items.filter((d) => (d.status || d.Status) === 'Pending').length,
    succeeded: items.filter((d) => (d.status || d.Status) === 'Succeeded').length,
    failed:    items.filter((d) => (d.status || d.Status) === 'Failed').length,
  }), [items]);

  const filtered = useMemo(() => {
    return items.filter((d) => {
      const status = d.status || d.Status;
      if (tab === 'pending'   && status !== 'Pending')   return false;
      if (tab === 'succeeded' && status !== 'Succeeded') return false;
      if (tab === 'failed'    && status !== 'Failed')    return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${d.donorName || ''} ${d.bloodBankName || ''} ${d.stripePaymentIntentId || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, tab, search]);

  const totalPending = useMemo(
    () => items
      .filter((d) => (d.status || d.Status) === 'Pending')
      .reduce((acc, d) => acc + Number(d.amount ?? d.Amount ?? 0), 0),
    [items]
  );

  return (
    <Container>
      <PageHeader
        title="💰 Monetary Donations — Admin"
        subtitle="Approve or reject monetary donations submitted by users."
        actions={
          <Button variant="outline-secondary" onClick={load} disabled={loading}>
            {loading ? <Spinner size="sm" animation="border" /> : '🔄 Refresh'}
          </Button>
        }
      />

      {error && (
        <Alert variant="warning">
          <strong>Heads up:</strong> {error}
          <hr />
          <div className="small">
            The route <code>GET /api/monetarydonations/all</code> needs to be added on the backend
            (controller: <code>MonetaryDonationsController</code>, role: <code>Admin</code> only).
            The frontend will work as soon as that route is deployed.
          </div>
        </Alert>
      )}

      <Row className="g-3 mb-3">
        <Col md={4}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Body>
              <div className="text-muted small">Pending total</div>
              <div className="display-6 fw-bold text-warning">
                {formatMoney(totalPending, 'usd')}
              </div>
              <div className="text-muted small">awaiting your decision</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={8}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Body className="d-flex align-items-center justify-content-around">
              <Stat label="All"       value={counts.all}       color="secondary" />
              <Stat label="Pending"   value={counts.pending}   color="warning" />
              <Stat label="Succeeded" value={counts.succeeded} color="success" />
              <Stat label="Failed"    value={counts.failed}    color="danger" />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm border-0 mb-3">
        <Card.Body className="p-2">
          <Nav variant="pills" activeKey={tab} onSelect={(k) => k && setTab(k)}>
            <Nav.Item><Nav.Link eventKey="pending">⏳ Pending ({counts.pending})</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="succeeded">✓ Succeeded ({counts.succeeded})</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="failed">✗ Failed ({counts.failed})</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="all">All ({counts.all})</Nav.Link></Nav.Item>
          </Nav>
        </Card.Body>
      </Card>

      <Card className="shadow-sm border-0 mb-3">
        <Card.Body>
          <InputGroup>
            <InputGroup.Text>🔍</InputGroup.Text>
            <Form.Control
              placeholder="Search by donor name, blood bank, or payment intent…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
        </Card.Body>
      </Card>

      {loading ? (
        <Loading label="Loading all donations…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={tab === 'pending' ? 'No pending donations' : 'Nothing here'}
          message={
            tab === 'pending'
              ? '🎉 All donations have been decided!'
              : 'Try changing the tab or clearing the search.'
          }
          icon="💰"
        />
      ) : (
        <Card className="shadow-sm border-0">
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Donor</th>
                  <th>Blood bank</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Payment intent</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const id = d.id || d.Id;
                  const status = d.status || d.Status || 'Pending';
                  const meta = STATUS_META[status] || { variant: 'secondary', label: status };
                  const busy = working === id;
                  const isPending = status === 'Pending';
                  return (
                    <tr key={id} className={isPending ? 'table-warning' : ''}>
                      <td className="small">{formatDate(d.donationDate || d.DonationDate || d.createdAt)}</td>
                      <td className="small">{d.donorName || d.DonorName || '—'}</td>
                      <td className="small">{d.bloodBankName || d.BloodBankName || 'General fund'}</td>
                      <td className="fw-bold text-danger">
                        {formatMoney(d.amount ?? d.Amount ?? 0, (d.currency || d.Currency || 'usd').toLowerCase())}
                      </td>
                      <td><Badge bg={meta.variant}>{meta.label}</Badge></td>
                      <td className="small"><code>{d.stripePaymentIntentId || d.StripePaymentIntentId}</code></td>
                      <td className="text-end">
                        {isPending ? (
                          <div className="d-flex gap-1 justify-content-end">
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => decide(d, 'Succeeded')}
                              disabled={busy}
                            >
                              {busy ? <Spinner size="sm" animation="border" /> : '✓ Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => decide(d, 'Failed')}
                              disabled={busy}
                            >
                              {busy ? <Spinner size="sm" animation="border" /> : '✗ Reject'}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted small">—</span>
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
    </Container>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="text-center">
      <div className={`h3 mb-0 fw-bold text-${color}`}>{value ?? '—'}</div>
      <div className="text-muted small">{label}</div>
    </div>
  );
}
