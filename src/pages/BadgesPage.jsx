import { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Alert } from 'react-bootstrap';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { badgesApi } from '../api';
import { apiErrorMessage } from '../utils/error';

export default function BadgesPage() {
  const [all, setAll] = useState([]);
  const [mine, setMine] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [a, m, l] = await Promise.allSettled([
        badgesApi.list(),
        badgesApi.mine(),
        badgesApi.leaderboard(10),
      ]);
      if (cancelled) return;
      setAll(a.status === 'fulfilled' && Array.isArray(a.value.data) ? a.value.data : []);
      setMine(m.status === 'fulfilled' && Array.isArray(m.value.data) ? m.value.data : []);
      setLeaderboard(l.status === 'fulfilled' && Array.isArray(l.value.data) ? l.value.data : []);
      const firstError = [a, m, l].find((r) => r.status === 'rejected');
      if (firstError) setError(apiErrorMessage(firstError.reason, 'Some data failed to load.'));
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Container>
      <PageHeader title="Badges & Leaderboard" subtitle="Earn badges for every donation." />
      {error && <Alert variant="warning">{error}</Alert>}
      {loading ? <Loading /> : (
        <Row className="g-3">
          <Col lg={5}>
            <Card className="shadow-sm border-0 mb-3">
              <Card.Header className="bg-white"><strong>My badges</strong></Card.Header>
              <Card.Body>
                {mine.length === 0 ? (
                  <EmptyState title="No badges yet" message="Schedule a donation to start collecting." />
                ) : (
                  <div className="d-flex flex-wrap gap-2">
                    {mine.map((b) => (
                      <Badge key={b.id || b.code || b.name} bg="warning" text="dark" className="p-2">
                        🏅 {b.name || b.title || b.code}
                      </Badge>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
            <Card className="shadow-sm border-0">
              <Card.Header className="bg-white"><strong>All available badges</strong></Card.Header>
              <Card.Body>
                {all.length === 0 ? <div className="text-muted">No badges defined yet.</div> : (
                  <ul className="mb-0">
                    {all.map((b) => (
                      <li key={b.id || b.code || b.name}>
                        <strong>{b.name || b.title || b.code}</strong>
                        {b.description ? <span className="text-muted"> — {b.description}</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </Card.Body>
            </Card>
          </Col>
          <Col lg={7}>
            <Card className="shadow-sm border-0">
              <Card.Header className="bg-white"><strong>Leaderboard (Top 10)</strong></Card.Header>
              <div className="table-responsive">
                <Table hover className="mb-0 align-middle">
                  <thead className="table-light">
                    <tr><th>#</th><th>Name</th><th>Donations</th><th>Points</th></tr>
                  </thead>
                  <tbody>
                    {leaderboard.length === 0 ? (
                      <tr><td colSpan={4} className="text-center text-muted py-4">No leaderboard data yet.</td></tr>
                    ) : leaderboard.map((u, i) => (
                      <tr key={u.userId || u.id || i}>
                        <td>{i + 1}</td>
                        <td>{u.fullName || u.name || u.userName || `User #${u.userId ?? u.id}`}</td>
                        <td>{u.donationsCount ?? u.donations ?? '—'}</td>
                        <td><Badge bg="danger">{u.points ?? u.score ?? '—'}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
}
