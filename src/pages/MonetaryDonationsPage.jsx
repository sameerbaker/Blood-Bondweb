import { useEffect, useMemo, useState } from 'react';
import {
  Container, Row, Col, Card, Form, Button, Table, Badge, Alert, Spinner,
  ProgressBar, InputGroup,
} from 'react-bootstrap';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { monetaryApi, bloodBanksApi } from '../api';
import { apiErrorMessage } from '../utils/error';
import {
  CURRENCIES, DONATION_PRESETS, currencyMeta, formatMoney, formatDate,
} from '../context/constants';

export default function MonetaryDonationsPage() {
  const [history, setHistory] = useState([]);
  const [total, setTotal] = useState(null);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create form state
  const [form, setForm] = useState({
    bloodBankId: '',
    amount: 25,
    currency: 'usd',
  });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [h, t, b] = await Promise.allSettled([
        monetaryApi.mine(),
        monetaryApi.myTotal(),
        bloodBanksApi.listVerified(),
      ]);
      if (h.status === 'fulfilled') setHistory(Array.isArray(h.value.data) ? h.value.data : []);
      if (t.status === 'fulfilled') setTotal(t.value.data);
      if (b.status === 'fulfilled') setBanks(Array.isArray(b.value.data) ? b.value.data : []);
      const firstErr = [h, t, b].find((r) => r.status === 'rejected');
      if (firstErr) setError(apiErrorMessage(firstErr.reason, 'Some data failed to load.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const presets = useMemo(
    () => DONATION_PRESETS[form.currency] || DONATION_PRESETS.usd,
    [form.currency]
  );

  const c = currencyMeta(form.currency);

  const onCreate = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }
    setCreating(true);
    try {
      const payload = { amount: Number(form.amount), currency: form.currency };
      if (form.bloodBankId) payload.bloodBankId = Number(form.bloodBankId);
      const res = await monetaryApi.createIntent(payload);
      // Backend can return either a Stripe URL (string) or { url, sessionId }
      const data = res.data || {};
      const url = typeof data === 'string' ? data : (data.url || data.checkoutUrl || data.sessionUrl);
      if (url) {
        toast.success('Redirecting to secure checkout…');
        // Open in a new tab so the user keeps their session in the SPA
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        toast.success('Donation intent created.');
      }
      // Refresh history + total (webhook may take a few seconds)
      setTimeout(load, 1500);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Donation failed.'));
    } finally {
      setCreating(false);
    }
  };

  // Compute total this user has given (fallback if /total endpoint returns
  // a different shape than expected).
  const computedTotal = useMemo(() => {
    if (total && typeof total === 'object' && 'total' in total) return Number(total.total);
    if (typeof total === 'number') return total;
    return history.reduce((acc, d) => {
      const amount = Number(d.amount ?? d.Amount ?? 0);
      const status = (d.status || d.Status || '').toLowerCase();
      if (status === 'succeeded' || status === 'paid' || status === 'completed') {
        return acc + amount;
      }
      return acc;
    }, 0);
  }, [history, total]);

  // Currency for display — first item's currency or USD
  const displayCurrency = useMemo(() => {
    if (history[0]?.currency || history[0]?.Currency) return history[0].currency || history[0].Currency;
    return 'usd';
  }, [history]);

  return (
    <Container>
      <PageHeader
        title="Monetary Donations"
        subtitle="Support a blood bank with a financial contribution — payments are processed securely by Stripe."
      />

      {error && <Alert variant="warning">{error}</Alert>}

      <Row className="g-3 mb-3">
        <Col md={4}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Body>
              <div className="text-muted small">Your total contribution</div>
              <div className="display-6 fw-bold text-danger">
                {formatMoney(computedTotal, displayCurrency)}
              </div>
              <div className="text-muted small mt-1">All-time across all banks</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Body>
              <div className="text-muted small">Donations made</div>
              <div className="display-6 fw-bold">{history.length}</div>
              <div className="text-muted small mt-1">Including pending and succeeded</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Body>
              <div className="text-muted small">Succeeded</div>
              <div className="display-6 fw-bold text-success">
                {history.filter((d) => {
                  const s = (d.status || d.Status || '').toLowerCase();
                  return s === 'succeeded' || s === 'paid' || s === 'completed';
                }).length}
              </div>
              <ProgressBar
                variant="success"
                now={
                  history.length === 0
                    ? 0
                    : Math.round(
                        (history.filter((d) => {
                          const s = (d.status || d.Status || '').toLowerCase();
                          return s === 'succeeded' || s === 'paid' || s === 'completed';
                        }).length / history.length) * 100
                      )
                }
                className="mt-2"
                style={{ height: 6 }}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-3">
        <Col lg={5}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white"><strong>Make a donation</strong></Card.Header>
            <Card.Body>
              <Form onSubmit={onCreate}>
                <Form.Group className="mb-3">
                  <Form.Label>Blood bank (optional)</Form.Label>
                  <Form.Select
                    value={form.bloodBankId}
                    onChange={(e) => setForm({ ...form, bloodBankId: e.target.value })}
                  >
                    <option value="">General fund (no specific bank)</option>
                    {banks.map((b) => {
                      const id = b.id || b.Id;
                      return <option key={id} value={id}>{b.name || b.Name}</option>;
                    })}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Currency</Form.Label>
                  <Form.Select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  >
                    {CURRENCIES.map((cur) => (
                      <option key={cur.value} value={cur.value}>{cur.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Amount</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>{c.symbol}</InputGroup.Text>
                    <Form.Control
                      type="number"
                      min="1"
                      step="any"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    />
                  </InputGroup>
                </Form.Group>

                <div className="d-flex flex-wrap gap-2 mb-3">
                  {presets.map((p) => (
                    <Button
                      key={p}
                      size="sm"
                      variant={Number(form.amount) === p ? 'danger' : 'outline-danger'}
                      onClick={() => setForm({ ...form, amount: p })}
                      type="button"
                    >
                      {c.symbol}{p}
                    </Button>
                  ))}
                </div>

                <div className="d-grid">
                  <Button type="submit" variant="danger" size="lg" disabled={creating}>
                    {creating
                      ? <><Spinner size="sm" animation="border" /> Redirecting…</>
                      : <>Donate {formatMoney(form.amount, form.currency)}</>}
                  </Button>
                </div>
                <div className="text-muted small text-center mt-2">
                  You'll be redirected to Stripe's secure checkout.
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={7}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <strong>Your donation history</strong>
              <Button size="sm" variant="outline-secondary" onClick={load} disabled={loading}>
                Refresh
              </Button>
            </Card.Header>
            {loading ? (
              <Loading label="Loading donations…" />
            ) : history.length === 0 ? (
              <EmptyState
                title="No donations yet"
                message="Your monetary contributions will appear here."
                icon="💰"
              />
            ) : (
              <div className="table-responsive">
                <Table hover className="mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Bank</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((d) => {
                      const id = d.id || d.Id || d.sessionId || d.SessionId;
                      const bank = d.bloodBankName || d.BloodBankName || '—';
                      const amount = Number(d.amount ?? d.Amount ?? 0);
                      const currency = d.currency || d.Currency || 'usd';
                      const status = d.status || d.Status || 'Pending';
                      return (
                        <tr key={id}>
                          <td className="small">{formatDate(d.createdAt || d.CreatedAt || d.date || d.Date)}</td>
                          <td>{bank}</td>
                          <td className="fw-bold text-danger">
                            {formatMoney(amount, currency)}
                          </td>
                          <td>
                            <Badge
                              bg={
                                ['succeeded', 'paid', 'completed'].includes(status.toLowerCase())
                                  ? 'success'
                                  : status.toLowerCase() === 'pending'
                                  ? 'warning'
                                  : status.toLowerCase() === 'failed'
                                  ? 'danger'
                                  : 'secondary'
                              }
                            >
                              {status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
