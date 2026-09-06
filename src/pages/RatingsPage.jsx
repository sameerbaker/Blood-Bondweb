import { useEffect, useState } from 'react';
import {
  Container, Row, Col, Card, Form, Button, Table, Badge, Alert, Spinner, ProgressBar,
} from 'react-bootstrap';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { ratingsApi, bloodBanksApi } from '../api';
import { apiErrorMessage } from '../utils/error';
import { formatDate } from '../context/constants';

function Stars({ value, size = 16 }) {
  const n = Math.round(Number(value) || 0);
  return (
    <span aria-label={`${n} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{
            color: i <= n ? '#f5a623' : '#dcdcdc',
            fontSize: size,
            lineHeight: 1,
          }}
        >★</span>
      ))}
    </span>
  );
}

export default function RatingsPage() {
  const [banks, setBanks] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);

  // Load banks on mount
  useEffect(() => {
    bloodBanksApi.listVerified()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setBanks(list);
        if (list[0]) setSelectedBankId(String(list[0].id || list[0].Id));
      })
      .catch((err) => setError(apiErrorMessage(err, 'Failed to load banks.')));
  }, []);

  // Load reviews + stats whenever selected bank changes
  useEffect(() => {
    if (!selectedBankId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      setStats(null);
      try {
        const [r, s] = await Promise.allSettled([
          ratingsApi.byBank(selectedBankId),
          ratingsApi.stats(selectedBankId),
        ]);
        if (cancelled) return;
        if (r.status === 'fulfilled') {
          setReviews(Array.isArray(r.value.data) ? r.value.data : []);
        } else {
          setReviews([]);
        }
        if (s.status === 'fulfilled') setStats(s.value.data);
        const firstErr = [r, s].find((x) => x.status === 'rejected');
        if (firstErr) setError(apiErrorMessage(firstErr.reason, 'Some data failed to load.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedBankId]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBankId) {
      toast.error('Select a blood bank first.');
      return;
    }
    setSubmitting(true);
    try {
      await ratingsApi.add({
        bloodBankId: Number(selectedBankId),
        rating: Number(form.rating),
        comment: form.comment.trim() || null,
      });
      toast.success('Thanks for your feedback!');
      setForm({ rating: 5, comment: '' });
      // Reload
      const [r, s] = await Promise.allSettled([
        ratingsApi.byBank(selectedBankId),
        ratingsApi.stats(selectedBankId),
      ]);
      if (r.status === 'fulfilled') setReviews(Array.isArray(r.value.data) ? r.value.data : []);
      if (s.status === 'fulfilled') setStats(s.value.data);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not submit rating.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Distribution: stats may return { average, total, distribution: {1:n, 2:n, ...} }
  const distribution = stats?.distribution || stats?.Distribution || null;
  const average = stats?.average ?? stats?.Average ?? (
    reviews.length
      ? (reviews.reduce((acc, r) => acc + Number(r.rating ?? r.Rating ?? 0), 0) / reviews.length).toFixed(1)
      : 0
  );
  const total = stats?.total ?? stats?.Total ?? reviews.length;

  return (
    <Container>
      <PageHeader
        title="Ratings & Reviews"
        subtitle="Rate your experience with a blood bank and help others choose well."
      />

      {error && <Alert variant="warning">{error}</Alert>}

      <Card className="shadow-sm border-0 mb-3">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={6}>
              <Form.Label>Blood bank</Form.Label>
              <Form.Select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
              >
                <option value="">Select a bank…</option>
                {banks.map((b) => {
                  const id = b.id || b.Id;
                  return <option key={id} value={id}>{b.name || b.Name}</option>;
                })}
              </Form.Select>
            </Col>
            <Col md={6}>
              <div className="d-flex align-items-center gap-3">
                <div>
                  <div className="display-5 fw-bold text-danger lh-1">{Number(average || 0).toFixed(1)}</div>
                  <Stars value={average} size={18} />
                </div>
                <div className="text-muted small">
                  Based on <strong>{total}</strong> review(s)
                </div>
              </div>
            </Col>
          </Row>

          {distribution && (
            <Row className="mt-3 g-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = Number(distribution[star] || distribution[String(star)] || 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <Col key={star} xs={12} className="d-flex align-items-center gap-2 small">
                    <span style={{ width: 32 }}>{star} ★</span>
                    <ProgressBar
                      now={pct}
                      variant={star >= 4 ? 'success' : star === 3 ? 'warning' : 'danger'}
                      style={{ flex: 1, height: 8 }}
                    />
                    <span style={{ width: 50, textAlign: 'right' }} className="text-muted">
                      {count} ({pct}%)
                    </span>
                  </Col>
                );
              })}
            </Row>
          )}
        </Card.Body>
      </Card>

      <Row className="g-3">
        <Col lg={5}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white"><strong>Leave a review</strong></Card.Header>
            <Card.Body>
              <Form onSubmit={onSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Rating</Form.Label>
                  <div className="d-flex align-items-center gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Button
                        key={n}
                        type="button"
                        variant="link"
                        className="p-0 border-0"
                        onClick={() => setForm({ ...form, rating: n })}
                        aria-label={`${n} stars`}
                      >
                        <span
                          style={{
                            fontSize: '2rem',
                            lineHeight: 1,
                            color: n <= form.rating ? '#f5a623' : '#dcdcdc',
                          }}
                        >★</span>
                      </Button>
                    ))}
                    <span className="ms-2 text-muted small">{form.rating} / 5</span>
                  </div>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Comment (optional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={form.comment}
                    onChange={(e) => setForm({ ...form, comment: e.target.value })}
                    placeholder="Tell others about your experience…"
                  />
                </Form.Group>
                <Button type="submit" variant="danger" disabled={submitting || !selectedBankId}>
                  {submitting ? <Spinner size="sm" animation="border" /> : 'Submit review'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={7}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white"><strong>Reviews</strong></Card.Header>
            {!selectedBankId ? (
              <EmptyState title="Pick a blood bank" message="Select a bank above to see its reviews." />
            ) : loading ? (
              <Loading label="Loading reviews…" />
            ) : reviews.length === 0 ? (
              <EmptyState
                title="No reviews yet"
                message="Be the first to share your experience."
                icon="⭐"
              />
            ) : (
              <Table hover className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Rating</th>
                    <th>Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((r, i) => {
                    const id = r.id || r.Id || i;
                    return (
                      <tr key={id}>
                        <td className="small text-muted" style={{ whiteSpace: 'nowrap' }}>
                          {formatDate(r.createdAt || r.CreatedAt || r.date || r.Date)}
                        </td>
                        <td><Stars value={r.rating ?? r.Rating} /></td>
                        <td>{r.comment || r.Comment || <span className="text-muted">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
