import { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Alert, ProgressBar } from 'react-bootstrap';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { badgesApi } from '../api';
import { apiErrorMessage } from '../utils/error';

function BadgeCard({ badge, earned }) {
  const name = badge.name || badge.title || badge.code || 'Badge';
  const description = badge.description || badge.Description || '';
  const required = badge.requiredDonations ?? badge.RequiredDonations ?? badge.threshold;
  const points = badge.points ?? badge.Points;

  return (
    <Card className={`shadow-sm border-0 h-100 ${earned ? 'border-success' : ''}`}
          style={{ opacity: earned ? 1 : 0.65 }}>
      <Card.Body>
        <div className="d-flex align-items-center gap-2 mb-2">
          <span style={{ fontSize: '2rem' }}>{earned ? '🏅' : '🔒'}</span>
          <div>
            <strong className="d-block">{name}</strong>
            {points != null && <small className="text-muted">{points} pts</small>}
          </div>
          {earned && <Badge bg="success" className="ms-auto">Earned</Badge>}
        </div>
        {description && <div className="text-muted small">{description}</div>}
        {required != null && !earned && (
          <div className="mt-2">
            <small className="text-muted">Need {required} donation(s)</small>
            <ProgressBar now={0} variant="warning" style={{ height: 6 }} />
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

export default function BadgesPage() {
  const [all, setAll] = useState([]);
  const [mine, setMine] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [rank, setRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [a, m, l, r] = await Promise.allSettled([
        badgesApi.list(),
        badgesApi.mine(),
        badgesApi.leaderboard(10),
        badgesApi.myRank(),
      ]);
      if (cancelled) return;
      setAll(a.status === 'fulfilled' && Array.isArray(a.value.data) ? a.value.data : []);
      setMine(m.status === 'fulfilled' && Array.isArray(m.value.data) ? m.value.data : []);
      setLeaderboard(l.status === 'fulfilled' && Array.isArray(l.value.data) ? l.value.data : []);
      if (r.status === 'fulfilled') setRank(r.value.data);
      const firstError = [a, m, l, r].find((x) => x.status === 'rejected');
      if (firstError) setError(apiErrorMessage(firstError.reason, 'Some data failed to load.'));
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const earnedKeys = new Set(
    mine.map((b) => b.code || b.Code || b.name || b.Name || b.id || b.Id)
  );

  return (
    <Container>
      <PageHeader
        title="Badges & Leaderboard"
        subtitle="Earn badges for every donation and climb the leaderboard."
      />
      {error && <Alert variant="warning">{error}</Alert>}
      {loading ? <Loading /> : (
        <>
          {rank && (
            <Card className="shadow-sm border-0 mb-3">
              <Card.Body className="d-flex flex-wrap align-items-center gap-4">
                <div>
                  <div className="text-muted small">Your rank</div>
                  <div className="display-6 fw-bold text-danger">
                    #{rank.rank ?? rank.Rank ?? '—'}
                  </div>
                </div>
                <div>
                  <div className="text-muted small">Donations</div>
                  <div className="h3 mb-0">{rank.donationsCount ?? rank.DonationsCount ?? '—'}</div>
                </div>
                <div>
                  <div className="text-muted small">Points</div>
                  <div className="h3 mb-0">{rank.points ?? rank.Points ?? '—'}</div>
                </div>
              </Card.Body>
            </Card>
          )}

          <Row className="g-3">
            <Col lg={5}>
              <Card className="shadow-sm border-0 mb-3">
                <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                  <strong>My badges</strong>
                  <Badge bg="warning" text="dark">{mine.length}</Badge>
                </Card.Header>
                <Card.Body>
                  {mine.length === 0 ? (
                    <EmptyState
                      title="No badges yet"
                      message="Schedule a donation to start collecting."
                    />
                  ) : (
                    <div className="d-flex flex-wrap gap-2">
                      {mine.map((b) => (
                        <Badge key={b.id || b.code || b.name} bg="warning" text="dark" className="p-2 fs-6">
                          🏅 {b.name || b.title || b.code}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>

              <Card className="shadow-sm border-0">
                <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                  <strong>All available badges</strong>
                  <span className="text-muted small">{all.length}</span>
                </Card.Header>
                <Card.Body>
                  {all.length === 0 ? (
                    <div className="text-muted">No badges defined yet.</div>
                  ) : (
                    <Row className="g-2">
                      {all.map((b) => {
                        const key = b.code || b.Code || b.name || b.Name || b.id || b.Id;
                        return (
                          <Col key={key} md={6}>
                            <BadgeCard badge={b} earned={earnedKeys.has(key)} />
                          </Col>
                        );
                      })}
                    </Row>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col lg={7}>
              <Card className="shadow-sm border-0">
                <Card.Header className="bg-white"><strong>Leaderboard — Top 10</strong></Card.Header>
                <div className="table-responsive">
                  <Table hover className="mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: 60 }}>#</th>
                        <th>Name</th>
                        <th>Donations</th>
                        <th>Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.length === 0 ? (
                        <tr><td colSpan={4} className="text-center text-muted py-4">No leaderboard data yet.</td></tr>
                      ) : leaderboard.map((u, i) => (
                        <tr key={u.userId || u.id || i}>
                          <td>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                          </td>
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
        </>
      )}
    </Container>
  );
}
