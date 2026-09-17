import { useEffect, useMemo, useState } from 'react';
import {
  Container, Row, Col, Card, Form, Button, Table, Badge, Alert, Spinner,
  ProgressBar, InputGroup, ButtonGroup, Modal,
} from 'react-bootstrap';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { monetaryApi, bloodBanksApi } from '../api';
import { getFreshIdempotencyKey } from '../api/client';
import { apiErrorMessage } from '../utils/error';
import { useAuth } from '../context/AuthContext';
import {
  CURRENCIES, DONATION_PRESETS, currencyMeta, formatMoney, formatDate,
} from '../context/constants';

// Status mapping (matches the backend: "Pending" | "Succeeded" | "Failed")
const STATUS_META = {
  Pending:   { variant: 'warning',   label: 'Pending — awaiting Stripe' },
  Succeeded: { variant: 'success',   label: 'Succeeded ✓' },
  Failed:    { variant: 'danger',    label: 'Failed ✗' },
  Refunded:  { variant: 'secondary', label: 'Refunded' },
  Canceled:  { variant: 'secondary', label: 'Cancelled' },
};

export default function MonetaryDonationsPage() {
  const { role } = useAuth();
  const isAdmin = (role || '').toLowerCase() === 'admin';
  const isManager = isAdmin || (role || '').toLowerCase() === 'bloodbankmanager';
  const [history, setHistory] = useState([]);
  const [total, setTotal] = useState(null);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create form
  const [form, setForm] = useState({
    bloodBankId: '',
    amount: 25,
    currency: 'usd',
  });
  const [creating, setCreating] = useState(false);

  // Mock-mode payment modal (when backend returns isMock=true)
  const [mockDonation, setMockDonation] = useState(null);
  const [mockSubmitting, setMockSubmitting] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const calls = [
        monetaryApi.mine(),
        monetaryApi.myTotal(),
        bloodBanksApi.listVerified(),
      ];
      // Managers see donations for their own bank too (so the bank
      // knows who is funding it). Admins use the dedicated /admin/monetary
      // page; regular donors only see their own.
      if (isManager) {
        try {
          const mineBank = await bloodBanksApi.mine();
          const bankId = mineBank.data?.id ?? mineBank.data?.Id;
          if (bankId) calls.push(monetaryApi.byBankDetail(bankId));
        } catch { /* not a manager / no bank yet */ }
      }

      const results = await Promise.allSettled(calls);
      const [h, t, b, bank] = results;
      let historyList = h.status === 'fulfilled' && Array.isArray(h.value.data) ? h.value.data : [];
      if (bank && bank.status === 'fulfilled' && Array.isArray(bank.value.data)) {
        // Merge and dedupe by payment intent id so the manager sees
        // both their own donations and donations others made to their bank.
        const seen = new Set();
        historyList = [...bank.value.data, ...historyList].filter((d) => {
          const k = d.stripePaymentIntentId || d.StripePaymentIntentId || (d.id || d.Id);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      }
      setHistory(historyList);
      if (t.status === 'fulfilled') setTotal(t.value.data);
      if (b.status === 'fulfilled') setBanks(Array.isArray(b.value.data) ? b.value.data : []);
      const firstErr = results.find((r) => r.status === 'rejected');
      if (firstErr && !silent) setError(apiErrorMessage(firstErr.reason, 'Some data failed to load.'));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Auto-refresh every 5s if there are pending donations (Stripe webhook might
  // take a moment to update the status).
  useEffect(() => {
    if (!autoRefresh) return;
    const hasPending = history.some((d) => (d.status || d.Status) === 'Pending');
    if (!hasPending) return;
    const id = setInterval(() => { load(true); }, 5000);
    return () => clearInterval(id);
  }, [autoRefresh, history]);

  // Manual fallback when the Stripe webhook is not reaching the backend
  // (common in dev / when the webhook URL is misconfigured in Stripe Dashboard).
  const markAsPaid = async (d) => {
    const intentId = d.stripePaymentIntentId || d.StripePaymentIntentId;
    if (!intentId) {
      toast.error('This donation has no Stripe payment intent ID.');
      return;
    }
    setRefreshing(true);
    try {
      await monetaryApi.confirm(intentId, 'Succeeded');
      toast.success('Marked as Succeeded.');
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Mark-as-paid failed.'));
    } finally {
      setRefreshing(false);
    }
  };

  const markAsFailed = async (d) => {
    const intentId = d.stripePaymentIntentId || d.StripePaymentIntentId;
    if (!intentId) return;
    setRefreshing(true);
    try {
      await monetaryApi.confirm(intentId, 'Failed');
      toast.success('Marked as Failed.');
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Mark-as-failed failed.'));
    } finally {
      setRefreshing(false);
    }
  };

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
      // Backend expects: { amount: decimal, currency: string, bloodBankId: int?, idempotencyKey: string }
      // The idempotency key collapses accidental retries (double-click,
      // slow-network retry) into a single Stripe session — see
      // MonetaryDonationService.CreatePaymentIntentAsync.
      const payload = {
        amount: Number(form.amount),
        currency: form.currency,
        idempotencyKey: getFreshIdempotencyKey('mon'),
      };
      if (form.bloodBankId) payload.bloodBankId = Number(form.bloodBankId);
      const res = await monetaryApi.createIntent(payload);
      const data = res.data || {};

      // Diagnostic — log the full response so we can see what the backend
      // is actually returning. Visible in DevTools → Console.
      console.log('[Donation] createIntent response:', data);

      const url = typeof data === 'string'
        ? data
        : (data.checkoutUrl || data.url || data.sessionUrl);
      const clientSecret = data.clientSecret;
      const intentId = data.paymentIntentId;
      const isMock = data.isMock === true;

      console.log('[Donation] Parsed:', { url, clientSecret, intentId, isMock });

      // Priority 1: real Stripe Checkout URL → open in new tab
      if (url && !isMock) {
        window.open(url, '_blank', 'noopener,noreferrer');
        toast.success('Opening Stripe secure checkout in a new tab — complete payment there.');
      }
      // Priority 2: backend is in mock mode (no real Stripe key) → show the
      // local test card modal so the user can still complete a test payment.
      else if (isMock || clientSecret || intentId) {
        setMockDonation({
          paymentIntentId: intentId,
          clientSecret,
          amount: payload.amount,
          currency: payload.currency,
        });
        toast('Complete the test payment to confirm your donation.', { icon: 'ℹ️' });
      } else {
        toast.success('Donation intent created.');
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Donation failed.'));
    } finally {
      setCreating(false);
    }
  };

  // Mock-mode card payment. Backend is in "mock" mode because no real
  // Stripe key is configured. We present a test card form and then call
  // the confirm endpoint to simulate a successful payment.
  const submitMockPayment = async (outcome) => {
    if (!mockDonation) return;
    setMockSubmitting(true);
    try {
      await monetaryApi.confirm(mockDonation.paymentIntentId, outcome);
      toast.success(
        outcome === 'Succeeded'
          ? '✅ Test payment succeeded!'
          : '❌ Test payment marked as failed.'
      );
      setMockDonation(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Mock payment failed.'));
    } finally {
      setMockSubmitting(false);
    }
  };

  // Computed totals (defensive — backend shape may vary)
  const computedTotal = useMemo(() => {
    if (total && typeof total === 'object' && 'total' in total) return Number(total.total);
    if (typeof total === 'number') return total;
    return history
      .filter((d) => (d.status || d.Status) === 'Succeeded')
      .reduce((acc, d) => acc + Number(d.amount ?? d.Amount ?? 0), 0);
  }, [history, total]);

  const succeededCount = history.filter((d) => (d.status || d.Status) === 'Succeeded').length;
  const pendingCount   = history.filter((d) => (d.status || d.Status) === 'Pending').length;
  const successRate    = history.length === 0 ? 0 : Math.round((succeededCount / history.length) * 100);

  const displayCurrency = history[0]?.currency || history[0]?.Currency || 'usd';

  return (
    <Container>
      <PageHeader
        title="Monetary Donations"
        subtitle="Support a blood bank with a financial contribution — payments are processed securely by Stripe."
      />

      {error && <Alert variant="warning">{error}</Alert>}

      {isManager && !isAdmin && (
        <Alert variant="info" className="small">
          <Badge bg="info" className="me-1">Manager view</Badge>
          Showing <strong>donations sent to your bank</strong> by users, plus any you personally made.
        </Alert>
      )}

                                                {/*  <Alert variant="info" className="small">
        💡 <strong>How it works:</strong> when you click "Donate", the backend creates a Stripe payment intent.
        After you complete the payment, Stripe notifies the backend (webhook) and the donation status changes
        from <Badge bg="warning">Pending</Badge> to <Badge bg="success">Succeeded</Badge> automatically.
      </Alert>*/}

      {pendingCount > 0 && (
        <Alert variant="warning" className="d-flex justify-content-between align-items-center">
          <span>
            <strong>⏳ {pendingCount} donation{pendingCount > 1 ? 's' : ''} still Pending.</strong>
            {' '}Stripe is confirming your payment. This page auto-refreshes every 5 seconds.
          </span>
          <ButtonGroup size="sm">
            <Button
              variant="outline-warning"
              onClick={() => load()}
              disabled={refreshing}
            >
              {refreshing ? <Spinner size="sm" animation="border" /> : '🔄 Refresh now'}
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => setAutoRefresh((v) => !v)}
            >
              {autoRefresh ? 'Pause auto-refresh' : 'Resume auto-refresh'}
            </Button>
          </ButtonGroup>
        </Alert>
      )}

      <Row className="g-3 mb-3">
        <Col md={4}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Body>
              <div className="text-muted small">Your total contribution</div>
              <div className="display-6 fw-bold text-danger">
                {formatMoney(computedTotal, displayCurrency)}
              </div>
              <div className="text-muted small mt-1">All-time, succeeded only</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Body>
              <div className="text-muted small">Donations</div>
              <div className="display-6 fw-bold">{history.length}</div>
              <div className="text-muted small mt-1">
                {succeededCount} succeeded · {pendingCount} pending
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Body>
              <div className="text-muted small">Success rate</div>
              <div className="display-6 fw-bold text-success">{successRate}%</div>
              <ProgressBar
                variant="success"
                now={successRate}
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
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((d) => {
                      const id = d.id || d.Id || d.stripePaymentIntentId;
                      const bank = d.bloodBankName || d.BloodBankName || 'General fund';
                      const amount = Number(d.amount ?? d.Amount ?? 0);
                      const currency = (d.currency || d.Currency || 'usd').toLowerCase();
                      const status = d.status || d.Status || 'Pending';
                      const meta = STATUS_META[status] || { variant: 'secondary', label: status };
                      return (
                        <tr key={id}>
                          <td className="small">{formatDate(d.donationDate || d.DonationDate || d.createdAt)}</td>
                          <td className="small">{bank}</td>
                          <td className="fw-bold text-danger">
                            {formatMoney(amount, currency)}
                          </td>
                          <td>
                            <Badge bg={meta.variant}>{meta.label}</Badge>
                          </td>
                          <td className="text-end">
                            {status === 'Pending' && (
                              <ButtonGroup size="sm">
                                {isAdmin ? (
                                  <>
                                    <Button
                                      variant="success"
                                      onClick={() => markAsPaid(d)}
                                      disabled={refreshing}
                                    >
                                      ✓ Mark paid
                                    </Button>
                                    <Button
                                      variant="outline-danger"
                                      onClick={() => markAsFailed(d)}
                                      disabled={refreshing}
                                    >
                                      ✗ Mark failed
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    variant="outline-primary"
                                    onClick={() => load()}
                                    disabled={refreshing}
                                    title="Click to refresh the status — Stripe may take a few seconds to confirm."
                                  >
                                    🔄 Check status
                                  </Button>
                                )}
                              </ButtonGroup>
                            )}
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

      {/* Mock payment modal — only shown when backend is in mock mode
          (i.e. no real Stripe key is configured). Lets the user complete
          a test payment and see the Succeeded status flow end-to-end. */}
      <MockPaymentModal
        donation={mockDonation}
        onClose={() => setMockDonation(null)}
        onSubmit={submitMockPayment}
        submitting={mockSubmitting}
      />
    </Container>
  );
}

function MockPaymentModal({ donation, onClose, onSubmit, submitting }) {
  const [card, setCard] = useState('4242 4242 4242 4242');
  const [exp,  setExp]  = useState('12/30');
  const [cvc,  setCvc]  = useState('123');

  if (!donation) return null;

  return (
    <Modal show onHide={onClose} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>🧪 Test payment (mock mode)</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant="warning" className="small">
          The backend returned a <strong>mock</strong> payment intent because
          the real Stripe API key isn't configured. No real card data is
          sent — use any 16-digit test number.
        </Alert>

        <div className="text-center mb-3">
          <div className="text-muted small">Donation</div>
          <div className="display-6 fw-bold text-danger">
            {formatMoney(donation.amount, donation.currency)}
          </div>
          <div className="text-muted small">
            Payment Intent: <code>{donation.paymentIntentId}</code>
          </div>
        </div>

        <Form.Group className="mb-3">
          <Form.Label>Card number</Form.Label>
          <Form.Control value={card} onChange={(e) => setCard(e.target.value)} />
        </Form.Group>
        <Row>
          <Col xs={6}>
            <Form.Group className="mb-3">
              <Form.Label>Expiry</Form.Label>
              <Form.Control value={exp} onChange={(e) => setExp(e.target.value)} />
            </Form.Group>
          </Col>
          <Col xs={6}>
            <Form.Group className="mb-3">
              <Form.Label>CVC</Form.Label>
              <Form.Control value={cvc} onChange={(e) => setCvc(e.target.value)} />
            </Form.Group>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="outline-danger"
          onClick={() => onSubmit('Failed')}
          disabled={submitting}
        >
          {submitting ? <Spinner size="sm" animation="border" /> : '✗ Simulate failure'}
        </Button>
        <Button
          variant="success"
          onClick={() => onSubmit('Succeeded')}
          disabled={submitting}
        >
          {submitting ? <Spinner size="sm" animation="border" /> : `✓ Pay ${formatMoney(donation.amount, donation.currency)}`}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
