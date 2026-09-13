import { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Badge, Button, Alert, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';
import { useAuth } from '../context/AuthContext';
import {
  bloodBanksApi, bloodRequestsApi, donationsApi, badgesApi, adminApi, eventsApi,
} from '../api';
import { apiErrorMessage } from '../utils/error';
import {
  bloodTypeLabel, urgencyMeta, donationStatusMeta, formatDate, formatMoney,
} from '../context/constants';

function StatCard({ title, value, icon, color = 'danger', sub }) {
  return (
    <Card className="shadow-sm border-0 h-100">
      <Card.Body className="d-flex align-items-center gap-3">
        <div
          className={`d-flex align-items-center justify-content-center bg-${color} text-white rounded`}
          style={{ width: 56, height: 56, fontSize: '1.6rem', flexShrink: 0 }}
        >
          {icon}
        </div>
        <div className="flex-grow-1">
          <div className="text-muted small">{title}</div>
          <div className="h4 mb-0 fw-bold">{value ?? '—'}</div>
          {sub && <div className="text-muted small">{sub}</div>}
        </div>
      </Card.Body>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, role } = useAuth();
  const userRole = (role || '').toLowerCase();

  // Common
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Recent
  const [recentRequests, setRecentRequests] = useState([]);
  const [pendingDonations, setPendingDonations] = useState([]);
  const [pendingBanks, setPendingBanks] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');

      // Pick endpoints based on role
      const calls = [];

      if (userRole === 'admin') {
        // Admin sees the WHOLE system
        calls.push(
          ['analytics', adminApi.analytics()],
          ['users',     adminApi.users()],
          ['banks',     bloodBanksApi.list()],
          ['requests',  bloodRequestsApi.activeByCity('')], // may 400 — handle gracefully
          ['donations', donationsApi.mine()],
          ['events',    eventsApi.upcoming()],
        );
      } else if (userRole === 'bloodbankmanager') {
        // Manager sees their bank only
        calls.push(
          ['myBank',    bloodBanksApi.mine()],
          ['requests',  bloodRequestsApi.mine()],
          ['donations', donationsApi.mine()],
          ['events',    eventsApi.upcoming()],
        );
      } else {
        // Donor
        calls.push(
          ['requests',  bloodRequestsApi.mine()],
          ['donations', donationsApi.mine()],
          ['rank',      badgesApi.myRank()],
          ['events',    eventsApi.upcoming()],
        );
      }

      const results = await Promise.allSettled(calls.map(([_, p]) => p));
      if (cancelled) return;

      const get = (label) => {
        const idx = calls.findIndex(([l]) => l === label);
        return idx >= 0 ? results[idx] : null;
      };

      // Build stats object
      const newStats = {};
      if (userRole === 'admin') {
        const a = get('analytics');
        if (a?.status === 'fulfilled') newStats.analytics = a.value.data;
        const u = get('users');
        if (u?.status === 'fulfilled') newStats.users = Array.isArray(u.value.data) ? u.value.data : [];
        const b = get('banks');
        if (b?.status === 'fulfilled') {
          const banks = Array.isArray(b.value.data) ? b.value.data : [];
          newStats.banks = banks;
          newStats.pendingBanksCount = banks.filter((x) => (x.status ?? x.Status) === 'Pending' || (x.status ?? x.Status) === 0).length;
        }
      } else if (userRole === 'bloodbankmanager') {
        const m = get('myBank');
        if (m?.status === 'fulfilled') newStats.myBank = m.value.data;
      }

      const r = get('requests');
      if (r?.status === 'fulfilled' && Array.isArray(r.value.data)) {
        newStats.requests = r.value.data;
        setRecentRequests(r.value.data.slice(0, 5));
      }
      const d = get('donations');
      if (d?.status === 'fulfilled' && Array.isArray(d.value.data)) {
        newStats.donations = d.value.data;
        const pending = d.value.data.filter((x) => (x.status ?? x.Status) === 'Pending');
        setPendingDonations(pending.slice(0, 5));
        newStats.pendingDonationsCount = pending.length;
      }
      const e = get('events');
      if (e?.status === 'fulfilled' && Array.isArray(e.value.data)) {
        newStats.events = e.value.data;
        setRecentEvents(e.value.data.slice(0, 5));
      }
      const rk = get('rank');
      if (rk?.status === 'fulfilled') newStats.rank = rk.value.data;

      setStats(newStats);

      const firstError = results.find((r) => r.status === 'rejected');
      if (firstError) setError(apiErrorMessage(firstError.reason, 'Some data failed to load.'));

      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [userRole]);

  // Render by role
  if (userRole === 'admin') return <AdminDashboard user={user} stats={stats} loading={loading} error={error} recentRequests={recentRequests} pendingBanks={stats.pendingBanksCount} />;
  if (userRole === 'bloodbankmanager') return <ManagerDashboard user={user} stats={stats} loading={loading} error={error} recentRequests={recentRequests} pendingDonations={pendingDonations} recentEvents={recentEvents} />;
  return <DonorDashboard user={user} stats={stats} loading={loading} error={error} recentRequests={recentRequests} recentEvents={recentEvents} />;
}

/* ----------------------------- ADMIN ----------------------------- */
function AdminDashboard({ user, stats, loading, error, recentRequests, pendingBanks }) {
  const a = stats.analytics || {};
  return (
    <Container>
      <PageHeader
        title={`👑 Welcome, ${user?.fullName || user?.FullName || 'Admin'}`}
        subtitle="System-wide overview. You have full administrative access."
        actions={
          <>
            <Button as={Link} to="/admin/users" variant="danger">Manage Users</Button>
            <Button as={Link} to="/blood-banks" variant="outline-danger">Review Banks</Button>
          </>
        }
      />

      {error && <Alert variant="warning">{error}</Alert>}

      {loading ? <Loading /> : (
        <>
          <Row className="g-3 mb-4">
            <Col md={6} lg={3}>
              <StatCard
                title="Total users"
                value={a.Users?.Total ?? '—'}
                icon="👥"
              />
            </Col>
            <Col md={6} lg={3}>
              <StatCard
                title="Blood banks"
                value={`${a.BloodBanks?.Verified ?? 0} / ${a.BloodBanks?.Total ?? 0}`}
                icon="🏥"
                sub={`${a.BloodBanks?.Pending ?? 0} pending`}
                color="warning"
              />
            </Col>
            <Col md={6} lg={3}>
              <StatCard
                title="Requests"
                value={`${a.Requests?.Fulfilled ?? 0} / ${a.Requests?.Total ?? 0}`}
                icon="🩸"
                sub={`${a.Requests?.Pending ?? 0} pending · ${a.Requests?.CriticalPending ?? 0} critical`}
              />
            </Col>
            <Col md={6} lg={3}>
              <StatCard
                title="Donations"
                value={`${a.Donations?.Completed ?? 0} / ${a.Donations?.Total ?? 0}`}
                icon="💉"
                sub={`$${a.Monetary?.TotalDonatedUSD ?? 0} raised`}
                color="success"
              />
            </Col>
          </Row>

          <Row className="g-3">
            <Col lg={6}>
              <PendingBanksWidget />
            </Col>
            <Col lg={6}>
              <Card className="shadow-sm border-0">
                <Card.Header className="bg-white"><strong>Admin quick actions</strong></Card.Header>
                <Card.Body className="d-flex flex-column gap-2">
                  <Button as={Link} to="/admin/users" variant="outline-danger">👥 Manage users & roles</Button>
                  <Button as={Link} to="/blood-banks" variant="outline-warning">🏥 Approve / reject blood banks</Button>
                  <Button as={Link} to="/requests" variant="outline-primary">🩸 View all requests</Button>
                  <Button as={Link} to="/events" variant="outline-info">📅 Manage events</Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
}

function PendingBanksWidget() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await bloodBanksApi.list();
      const list = Array.isArray(res.data) ? res.data : [];
      // Filter to only pending banks (any of: status 0, "Pending", or unverified)
      const pending = list.filter((b) => {
        const s = b.status ?? b.Status;
        return s === 0 || s === '0' || s === 'Pending' || (!b.isVerified && s == null);
      });
      setItems(pending);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const approve = async (b) => {
    setWorking(b.id || b.Id);
    try {
      await bloodBanksApi.approve(b.id || b.Id);
      toast.success(`✓ "${b.name || b.Name}" approved!`);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Approve failed.'));
    } finally { setWorking(null); }
  };

  const reject = async (b) => {
    if (!confirm(`Reject "${b.name || b.Name}"?`)) return;
    setWorking(b.id || b.Id);
    try {
      await bloodBanksApi.reject(b.id || b.Id);
      toast.success(`✗ "${b.name || b.Name}" rejected.`);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Reject failed.'));
    } finally { setWorking(null); }
  };

  return (
    <Card className="shadow-sm border-0">
      <Card.Header className="bg-white d-flex justify-content-between align-items-center">
        <strong>⏳ Blood banks awaiting approval</strong>
        {!loading && items.length > 0 && <Badge bg="warning" text="dark">{items.length} pending</Badge>}
      </Card.Header>
      <Card.Body>
        {loading ? (
          <div className="text-muted small">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-muted">🎉 No pending banks — all caught up!</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {items.map((b) => {
              const id = b.id || b.Id;
              const busy = working === id;
              return (
                <div key={id} className="d-flex justify-content-between align-items-center p-2 border rounded bg-light">
                  <div>
                    <strong>{b.name || b.Name}</strong>
                    <div className="text-muted small">{b.cityAddress || b.CityAddress || '—'}</div>
                  </div>
                  <div className="d-flex gap-1">
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => approve(b)}
                      disabled={busy}
                    >
                      {busy ? <Spinner size="sm" animation="border" /> : '✓ Approve'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => reject(b)}
                      disabled={busy}
                    >
                      ✗ Reject
                    </Button>
                  </div>
                </div>
              );
            })}
            <div className="text-end mt-2">
              <Link to="/blood-banks" className="small">View all blood banks →</Link>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

/* ------------------------- BANK MANAGER ------------------------- */
function ManagerDashboard({ user, stats, loading, error, recentRequests, pendingDonations, recentEvents }) {
  const myBank = stats.myBank;
  const bankName = myBank?.name || myBank?.Name || 'Your bank';
  const bankStatus = myBank?.status ?? myBank?.Status;
  const isVerified = bankStatus === 1 || bankStatus === 'Verified';

  return (
    <Container>
      <PageHeader
        title={`🏥 ${bankName}`}
        subtitle={`Manager dashboard — ${user?.fullName || user?.FullName || ''}`}
        actions={
          <>
            <Button as={Link} to="/donations" variant="success">💉 Manage donations</Button>
            <Button as={Link} to="/events" variant="outline-danger">📅 Create event</Button>
          </>
        }
      />

      {error && <Alert variant="warning">{error}</Alert>}

      {myBank && !isVerified && (
        <Alert variant="warning">
          ⚠️ Your blood bank is <strong>pending admin approval</strong>. You can still schedule donations and create events, but they won't appear in public listings until verified.
        </Alert>
      )}

      {loading ? <Loading /> : (
        <>
          <Row className="g-3 mb-4">
            <Col md={4}>
              <StatCard
                title="Pending donations"
                value={stats.pendingDonationsCount ?? 0}
                icon="⏳"
                color="warning"
                sub="Need your approval"
              />
            </Col>
            <Col md={4}>
              <StatCard
                title="Total donations"
                value={stats.donations?.length ?? 0}
                icon="💉"
                color="success"
              />
            </Col>
            <Col md={4}>
              <StatCard
                title="My requests"
                value={stats.requests?.length ?? 0}
                icon="🩸"
              />
            </Col>
          </Row>

          <Row className="g-3">
            <Col lg={6}>
              <Card className="shadow-sm border-0">
                <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                  <strong>⏳ Pending donations</strong>
                  {stats.pendingDonationsCount > 0 && (
                    <Badge bg="warning" text="dark">{stats.pendingDonationsCount}</Badge>
                  )}
                </Card.Header>
                <Card.Body>
                  {pendingDonations.length === 0 ? (
                    <div className="text-muted">No pending donations. 🎉</div>
                  ) : (
                    <Table size="sm" className="mb-0 align-middle">
                      <thead>
                        <tr>
                          <th>Donor</th>
                          <th>Scheduled</th>
                          <th className="text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingDonations.map((d) => (
                          <tr key={d.id || d.Id}>
                            <td className="small">{d.donorName || `Donor #${d.donorId ?? d.DonorId}`}</td>
                            <td className="small">{formatDate(d.scheduledDate || d.ScheduledDate)}</td>
                            <td className="text-end">
                              <Button as={Link} to="/donations" size="sm" variant="success">Review</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6}>
              <Card className="shadow-sm border-0">
                <Card.Header className="bg-white"><strong>Manager quick actions</strong></Card.Header>
                <Card.Body className="d-flex flex-column gap-2">
                  <Button as={Link} to="/blood-banks" variant="outline-danger">📦 Update inventory</Button>
                  <Button as={Link} to="/donations" variant="outline-success">💉 Approve donations</Button>
                  <Button as={Link} to="/events" variant="outline-info">📅 Create / manage events</Button>
                  <Button as={Link} to="/requests" variant="outline-primary">🩸 View open requests</Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
}

/* ----------------------------- DONOR ----------------------------- */
function DonorDashboard({ user, stats, loading, error, recentRequests, recentEvents }) {
  return (
    <Container>
      <PageHeader
        title={`👋 Hello, ${user?.fullName || user?.FullName || 'Donor'}`}
        subtitle="Track your donations, requests, and badges."
        actions={
          <>
            <Button as={Link} to="/requests" variant="danger">+ Request blood</Button>
            <Button as={Link} to="/donations" variant="outline-danger">+ Schedule donation</Button>
          </>
        }
      />

      {error && <Alert variant="warning">{error}</Alert>}

      {loading ? <Loading /> : (
        <>
          <Row className="g-3 mb-4">
            <Col md={4}>
              <StatCard
                title="My donations"
                value={stats.donations?.length ?? 0}
                icon="💉"
                color="success"
              />
            </Col>
            <Col md={4}>
              <StatCard
                title="My requests"
                value={stats.requests?.length ?? 0}
                icon="🩸"
              />
            </Col>
            <Col md={4}>
              <StatCard
                title="My rank"
                value={stats.rank?.rank ?? stats.rank?.Rank ?? '—'}
                icon="🏅"
                color="warning"
                sub={stats.rank?.points != null ? `${stats.rank.points} pts` : null}
              />
            </Col>
          </Row>

          <Row className="g-3">
            <Col lg={7}>
              <Card className="shadow-sm border-0">
                <Card.Header className="bg-white"><strong>Recent requests</strong></Card.Header>
                <Card.Body>
                  {recentRequests.length === 0 ? (
                    <div className="text-muted">No requests yet.</div>
                  ) : (
                    <Table size="sm" hover className="mb-0 align-middle">
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
                          const s = donationStatusMeta(r.status ?? r.Status);
                          return (
                            <tr key={r.id || r.Id}>
                              <td><Badge bg="danger">{bloodTypeLabel(r.bloodType ?? r.BloodType)}</Badge></td>
                              <td className="small">{r.city || r.City || '—'}</td>
                              <td><Badge bg={u.variant}>{u.label}</Badge></td>
                              <td><Badge bg={s.variant}>{s.label}</Badge></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
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
                  <Button as={Link} to="/monetary" variant="outline-success">Donate money</Button>
                  <Button as={Link} to="/ratings" variant="outline-info">Rate a blood bank</Button>
                  <Button as={Link} to="/events" variant="outline-primary">View events</Button>
                  <Button as={Link} to="/profile" variant="outline-secondary">Edit my profile</Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
}
