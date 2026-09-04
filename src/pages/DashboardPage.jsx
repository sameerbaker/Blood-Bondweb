import { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Badge, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';
import { useAuth } from '../context/AuthContext';
import { bloodBanksApi, bloodRequestsApi, donationsApi, badgesApi, adminApi } from '../api';
import { apiErrorMessage } from '../utils/error';
import { bloodTypeLabel, urgencyMeta } from '../context/constants';

function StatCard({ title, value, icon, color = 'danger' }) {
  return (
    <Card className="shadow-sm border-0 h-100">
      <Card.Body className="d-flex align-items-center gap-3">
        <div
          className={`d-flex align-items-center justify-content-center bg-${color} text-white rounded`}
          style={{ width: 56, height: 56, fontSize: '1.6rem' }}
        >
          {icon}
        </div>
        <div>
          <div className="text-muted small">{title}</div>
          <div className="h4 mb-0 fw-bold">{value ?? '—'}</div>
        </div>
      </Card.Body>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, role } = useAuth();
  const [stats, setStats] = useState({ banks: null, requests: null, donations: null, rank: null });
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const userRole = (role || '').toLowerCase();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      const results = await Promise.allSettled([
        bloodBanksApi.listVerified().catch(() => null),
        bloodRequestsApi.mine().catch(() => null),
        donationsApi.mine().catch(() => null),
        badgesApi.myRank().catch(() => null),
      ]);
      if (cancelled) return;
      const [banks, requests, donations, rank] = results;
      setStats({
        banks: banks.status === 'fulfilled' ? (banks.value?.data?.length ?? 0) : 0,
        requests: requests.status === 'fulfilled' ? (requests.value?.data?.length ?? 0) : 0,
        donations: donations.status === 'fulfilled' ? (donations.value?.data?.length ?? 0) : 0,
        rank: rank.status === 'fulfilled' ? (rank.value?.data?.rank ?? '—') : '—',
      });
      if (requests.status === 'fulfilled' && Array.isArray(requests.value?.data)) {
        setRecentRequests(requests.value.data.slice(0, 5));
      }
      const firstError = results.find((r) => r.status === 'rejected');
      if (firstError) setError(apiErrorMessage(firstError.reason, 'Some data failed to load.'));
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Container>
      <PageHeader
        title={`Hello, ${user?.fullName || user?.FullName || user?.email || 'there'} 👋`}
        subtitle={`You're signed in as ${role || 'User'}. Here's your snapshot.`}
        actions={
          <>
            <Button as={Link} to="/requests" variant="danger">+ New request</Button>
            <Button as={Link} to="/donations" variant="outline-danger">Schedule donation</Button>
          </>
        }
      />

      {error && <div className="alert alert-warning">{error}</div>}

      {loading ? (
        <Loading label="Loading dashboard…" />
      ) : (
        <>
          <Row className="g-3 mb-4">
            <Col md={6} lg={3}><StatCard title="Verified Banks" value={stats.banks} icon="🏥" /></Col>
            <Col md={6} lg={3}><StatCard title="My Requests" value={stats.requests} icon="🩸" /></Col>
            <Col md={6} lg={3}><StatCard title="My Donations" value={stats.donations} icon="💉" color="success" /></Col>
            <Col md={6} lg={3}><StatCard title="My Rank" value={stats.rank} icon="🏅" color="warning" /></Col>
          </Row>

          <Row className="g-3">
            <Col lg={7}>
              <Card className="shadow-sm border-0">
                <Card.Header className="bg-white"><strong>Recent requests</strong></Card.Header>
                <Card.Body>
                  {recentRequests.length === 0 ? (
                    <div className="text-muted">No requests yet. Create one to get started.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Blood</th>
                            <th>City</th>
                            <th>Urgency</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentRequests.map((r) => {
                            const u = urgencyMeta(r.urgencyLevel ?? r.UrgencyLevel);
                            return (
                              <tr key={r.id || r.Id}>
                                <td><Badge bg="danger">{bloodTypeLabel(r.bloodType ?? r.BloodType)}</Badge></td>
                                <td>{r.city || r.City || '—'}</td>
                                <td><Badge bg={u.variant}>{u.label}</Badge></td>
                                <td>{r.status || r.Status || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col lg={5}>
              <Card className="shadow-sm border-0">
                <Card.Header className="bg-white"><strong>Quick actions</strong></Card.Header>
                <Card.Body className="d-flex flex-column gap-2">
                  <Button as={Link} to="/eligibility" variant="outline-danger">Run eligibility check</Button>
                  <Button as={Link} to="/badges" variant="outline-warning">View badges & leaderboard</Button>
                  <Button as={Link} to="/profile" variant="outline-secondary">Edit my profile</Button>
                  {userRole === 'admin' && (
                    <Button as={Link} to="/admin/users" variant="outline-dark">Manage users</Button>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
}
