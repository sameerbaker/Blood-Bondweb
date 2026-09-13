import { useState } from 'react';
import {
  Container, Row, Col, Card, Badge, Button, Table, Alert, Spinner,
  ListGroup, Tabs, Tab, Modal, Form,
} from 'react-bootstrap';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Curated list of all features the admin can attempt from the UI.
// Each entry tells you whether it works right now (with the deployed
// backend) or what you need to fix in the backend to make it work.
const FEATURES = {
  working: [
    {
      area: 'Admin',
      name: 'List users',
      endpoint: 'GET /api/admin/users',
      notes: 'Returns all registered users with their roles[] and IsBlocked flag.',
    },
    {
      area: 'Admin',
      name: 'Change user role',
      endpoint: 'PATCH /api/admin/users/{id}/role',
      notes: 'Pick a role from the dropdown — works as Admin.',
    },
    {
      area: 'Admin',
      name: 'Block / Unblock user',
      endpoint: 'PATCH /api/admin/users/{id}/block | /unblock',
      notes: 'Toggle the Active/Blocked badge in the users table.',
    },
    {
      area: 'Admin',
      name: 'Create user',
      endpoint: 'POST /api/admin/create',
      notes: 'Use the + New user button on /admin/users.',
    },
    {
      area: 'Admin',
      name: 'System analytics',
      endpoint: 'GET /api/admin/analytics',
      notes: 'Shown on the admin dashboard. Counts users, banks, requests, donations.',
    },
    {
      area: 'Blood Banks',
      name: 'Approve blood bank',
      endpoint: 'PATCH /api/bloodbanks/{id}/approve',
      notes: 'Click ✓ Approve on any Pending bank.',
    },
    {
      area: 'Blood Banks',
      name: 'Reject blood bank',
      endpoint: 'PATCH /api/bloodbanks/{id}/reject',
      notes: 'Click ✗ Reject on any Pending bank.',
    },
    {
      area: 'Blood Banks',
      name: 'Create blood bank',
      endpoint: 'POST /api/bloodbanks',
      notes: 'Click + New blood bank. Works for User, BloodBankManager, or Admin.',
    },
    {
      area: 'Events',
      name: 'Create event',
      endpoint: 'POST /api/events',
      notes: 'Manager/Admin only. Use the + New event button on /events.',
    },
    {
      area: 'Events',
      name: 'Update / delete event',
      endpoint: 'PUT / DELETE /api/events/{id}',
      notes: 'Manager/Admin only. Edit or delete from the Manage tab.',
    },
    {
      area: 'Blood Requests',
      name: 'Create blood request',
      endpoint: 'POST /api/bloodrequests',
      notes: 'Any signed-in user can create.',
    },
    {
      area: 'Blood Requests',
      name: 'Fulfill blood request',
      endpoint: 'PATCH /api/bloodrequests/{id}/fulfill',
      notes: 'Manager/Admin only. Marks the request as Fulfilled.',
    },
    {
      area: 'Donations',
      name: 'Schedule donation',
      endpoint: 'POST /api/donations',
      notes: 'Donor schedules with a bank.',
    },
    {
      area: 'Donations',
      name: 'Approve donation',
      endpoint: 'PATCH /api/donations/{id}/approve',
      notes: 'Manager/Admin only. Moves from Pending → Approved.',
    },
    {
      area: 'Donations',
      name: 'Complete donation',
      endpoint: 'PATCH /api/donations/{id}/complete',
      notes: 'Manager/Admin only. Records units donated and updates inventory.',
    },
    {
      area: 'Monetary',
      name: 'Create donation intent (mock)',
      endpoint: 'POST /api/monetarydonations/create-intent',
      notes: 'Works in mock mode (no real Stripe key). Opens a test card modal.',
    },
    {
      area: 'Monetary',
      name: 'Admin mark donation paid',
      endpoint: 'POST /api/monetarydonations/confirm?status=Succeeded',
      notes: 'Admin can manually mark Pending donations as Succeeded.',
    },
  ],

  // Things that need a backend fix — currently return 500 because
  // the deployed backend still has the old code.
  needsFix: [
    {
      area: 'Blood Banks',
      name: 'Edit blood bank details (as admin)',
      endpoint: 'PUT /api/bloodbanks/{id}',
      problem: 'Backend throws UnauthorizedAccessException when an Admin tries to edit a bank that is not theirs. Currently mapped to 500.',
      fix: 'In BloodBankService.UpdateAsync, check if the caller is Admin and skip the ManagerId ownership check. The fix is already in your workspace at BloodBond.BLL/Service/BloodBankService.cs.',
    },
    {
      area: 'Blood Banks',
      name: 'Set inventory (as admin)',
      endpoint: 'PUT /api/bloodbanks/{id}/inventory',
      problem: 'Same ownership issue as Edit. Additionally the old code did RemoveRange + Add which can produce a duplicate-key error.',
      fix: 'Replace the old RemoveRange/Add block with an upsert (look up by BloodBankId+BloodType, update if exists, insert otherwise). The fix is already in your workspace.',
    },
  ],
};

export default function AdminDiagnosticPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [showCode, setShowCode] = useState(null);
  const userRole = (role || '').toLowerCase();
  const isAdmin = userRole === 'admin';

  return (
    <Container>
      <PageHeader
        title="🛠 Admin diagnostic"
        subtitle="A complete map of what works, what needs a backend fix, and how to fix it."
        actions={
          isAdmin ? null : (
            <Button variant="outline-secondary" onClick={() => navigate('/dashboard')}>
              Back to dashboard
            </Button>
          )
        }
      />

      {!isAdmin && (
        <Alert variant="warning">
          You are signed in as <strong>{userRole || 'user'}</strong>. This page is most useful for admins,
          but you can still browse it to learn what the system can do.
        </Alert>
      )}

      <Tabs defaultActiveKey="working" className="mb-3">
        <Tab eventKey="working" title={`✅ Working (${FEATURES.working.length})`}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <p className="text-muted">
                These features work end-to-end from the UI using your current deployed backend.
                The endpoint, who can call it, and where to find the UI control are listed.
              </p>
              <div className="table-responsive">
                <Table hover className="mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Area</th>
                      <th>Feature</th>
                      <th>Endpoint</th>
                      <th>UI control</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FEATURES.working.map((f, i) => (
                      <tr key={i}>
                        <td><Badge bg="info">{f.area}</Badge></td>
                        <td><strong>{f.name}</strong><div className="text-muted small">{f.notes}</div></td>
                        <td><code className="small">{f.endpoint}</code></td>
                        <td className="small text-muted">{uiHintForFeature(f)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="needsFix" title={`🛠 Needs backend fix (${FEATURES.needsFix.length})`}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Alert variant="warning" className="mb-3">
                <strong>Why these fail:</strong> your deployed backend on
                <code> blood-bond.runasp.net </code> still has the original ownership check. An admin
                can <em>approve</em> a bank but cannot <em>edit</em> it or update its
                <em> inventory</em>. The fix is already written in your workspace.
              </Alert>
              <div className="d-flex flex-column gap-3">
                {FEATURES.needsFix.map((f, i) => (
                  <Card key={i} className="border-warning">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start gap-3">
                        <div>
                          <h6 className="mb-1">
                            <Badge bg="warning" text="dark" className="me-2">{f.area}</Badge>
                            {f.name}
                          </h6>
                          <div className="small text-muted mb-2"><code>{f.endpoint}</code></div>
                          <p className="mb-2 small"><strong>Problem:</strong> {f.problem}</p>
                          <p className="mb-0 small"><strong>Fix:</strong> {f.fix}</p>
                        </div>
                        <Button size="sm" variant="outline-warning" onClick={() => setShowCode(f)}>
                          Show code
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>

              <Alert variant="info" className="mt-3 mb-0">
                <strong>How to apply the fix:</strong>
                <ol className="mb-0 mt-2 small">
                  <li>Open a terminal in <code>D:\BackEnd\testproject\Blood-Bond</code></li>
                  <li>Run <code>dotnet publish -c Release -o ./publish</code></li>
                  <li>Upload the contents of <code>publish/</code> to your MonsterASP site (FTP / IIS / Visual Studio publish profile)</li>
                  <li>Restart the app and test again</li>
                </ol>
              </Alert>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="deploy" title="🚀 Deploy steps">
          <Card className="shadow-sm border-0">
            <Card.Body>
              <h5>Backend (.NET) on MonsterASP</h5>
              <ol className="small">
                <li>Make sure the changes in <code>BloodBond.BLL/Service/BloodBankService.cs</code> and <code>BloodBond/Middleware/GlobalExceptionHandling.cs</code> are saved (they are).</li>
                <li>
                  Publish:
                  <pre className="bg-light p-2 rounded small mb-2 mt-1"><code>{`cd D:\\BackEnd\\testproject\\Blood-Bond
dotnet publish -c Release -o ./publish`}</code></pre>
                </li>
                <li>Upload the <code>publish/</code> folder to MonsterASP (FTP / IIS).</li>
                <li>Verify the live API is the new build (try <code>/api/bloodbanks</code> and check the version header if your backend exposes one).</li>
              </ol>

              <h5 className="mt-4">Frontend (React) on Vercel</h5>
              <ol className="small">
                <li>Make sure <code>VITE_API_BASE_URL</code> is set in Vercel → Settings → Environment Variables to <code>https://blood-bond.runasp.net</code></li>
                <li>Push the updated <code>BloodBond.Web/</code> to your git repo (or upload the <code>dist/</code> contents directly).</li>
                <li>Trigger a redeploy with "Clear build cache".</li>
                <li>Open your Vercel URL, hard refresh (<code>Ctrl+Shift+R</code>), and sign in.</li>
              </ol>

              <Alert variant="success" className="mt-3 mb-0">
                Once both are deployed, every feature on the "Working" tab will continue to work,
                and the two "Needs fix" features (Edit blood bank + Set inventory as admin) will
                start succeeding.
              </Alert>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    
      <CodeModal feature={showCode} onClose={() => setShowCode(null)} />
    </Container>
  );
  
}

function uiHintForFeature(f) {
  const map = {
    'List users': '/admin/users — table',
    'Change user role': '/admin/users — Role dropdown',
    'Block / Unblock user': '/admin/users — Block / Unblock button',
    'Create user': '/admin/users — + New user',
    'System analytics': '/dashboard (admin)',
    'Approve blood bank': '/blood-banks — ✓ Approve (admin)',
    'Reject blood bank': '/blood-banks — ✗ Reject (admin)',
    'Create blood bank': '/blood-banks — + New blood bank',
    'Create event': '/events — + New event',
    'Update / delete event': '/events — Manage tab — Edit / Delete',
    'Create blood request': '/requests — + New request',
    'Fulfill blood request': '/requests — ✓ Fulfill (manager/admin)',
    'Schedule donation': '/donations — + Schedule donation',
    'Approve donation': '/donations — ✓ Approve (manager/admin)',
    'Complete donation': '/donations — 💉 Complete (manager/admin)',
    'Create donation intent (mock)': '/monetary — Donate form',
    'Admin mark donation paid': '/monetary — ✓ Mark paid (admin only)',
  };
  return map[f.name] || '—';
}

function CodeModal({ feature, onClose }) {
  if (!feature) return null;
  const code = feature.area === 'Blood Banks'
    ? `// In BloodBond.BLL/Service/BloodBankService.cs
private bool IsAdminOrManager(string userId, string? managerId)
{
    if (managerId == userId) return true;
    var role = _http.HttpContext?.User?.FindFirst(ClaimTypes.Role)?.Value;
    return role == "Admin";
}

// Then in UpdateAsync / SetInventoryAsync replace the old check:
if (!IsAdminOrManager(managerId, bank.ManagerId))
    throw new UnauthorizedAccessException("You are not the manager of this blood bank.");

// And replace RemoveRange+Add with an upsert in SetInventoryAsync:
foreach (var item in items) {
    var existing = await _context.BloodInventories
        .FirstOrDefaultAsync(i => i.BloodBankId == id && i.BloodType == item.BloodType);
    if (existing != null) {
        existing.UnitsAvailable = item.UnitsAvailable;
        existing.LastUpdated = DateTime.UtcNow;
    } else {
        _context.BloodInventories.Add(new BloodInventory {
            BloodBankId = id,
            BloodType = item.BloodType,
            UnitsAvailable = item.UnitsAvailable,
            LastUpdated = DateTime.UtcNow
        });
    }
}
await _context.SaveChangesAsync();`
    : '';

  return (
    <Modal show onHide={onClose} size="lg" scrollable centered>
      <Modal.Header closeButton>
        <Modal.Title>Fix: {feature.name}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted small">{feature.fix}</p>
        {code && <pre className="bg-light p-3 rounded small"><code>{code}</code></pre>}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}
