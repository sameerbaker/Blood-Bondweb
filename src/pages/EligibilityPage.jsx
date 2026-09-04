import { useState } from 'react';
import { Container, Card, Form, Button, Row, Col, Alert, Spinner, Badge } from 'react-bootstrap';
import { donationsApi } from '../api/donations';
import { apiErrorMessage } from '../utils/error';
import PageHeader from '../components/PageHeader';
import toast from 'react-hot-toast';

export default function EligibilityPage() {
  const [form, setForm] = useState({
    weight: 70,
    age: 28,
    hasChronicDisease: false,
    lastSurgeryDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const res = await donationsApi.checkEligibility({
        weight: Number(form.weight),
        age: Number(form.age),
        hasChronicDisease: !!form.hasChronicDisease,
        lastSurgeryDate: form.lastSurgeryDate || null,
      });
      setResult(res.data);
      toast.success('Eligibility check complete.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Eligibility check failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container style={{ maxWidth: 720 }}>
      <PageHeader
        title="Eligibility Check"
        subtitle="Find out if you're eligible to donate blood right now."
      />
      {error && <Alert variant="danger">{error}</Alert>}
      <Card className="shadow-sm border-0">
        <Card.Body>
          <Form onSubmit={onSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Weight (kg)</Form.Label>
                  <Form.Control
                    type="number" min={1} value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Age</Form.Label>
                  <Form.Control
                    type="number" min={0} value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="chronic"
                label="I have a chronic disease"
                checked={form.hasChronicDisease}
                onChange={(e) => setForm({ ...form, hasChronicDisease: e.target.checked })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Last surgery date (if any)</Form.Label>
              <Form.Control
                type="date"
                value={form.lastSurgeryDate}
                onChange={(e) => setForm({ ...form, lastSurgeryDate: e.target.value })}
              />
            </Form.Group>
            <Button type="submit" variant="danger" disabled={loading}>
              {loading ? <Spinner size="sm" animation="border" /> : 'Check eligibility'}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      {result && (
        <Card className="shadow-sm border-0 mt-3">
          <Card.Body>
            <h5>Result</h5>
            <pre className="bg-light p-3 rounded small mb-0">
{JSON.stringify(result, null, 2)}
            </pre>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}
