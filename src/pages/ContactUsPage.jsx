import { useState } from 'react';
import {
  Container, Row, Col, Card, Form, Button, Alert, Spinner, InputGroup,
} from 'react-bootstrap';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';

// Frontend-only contact form.
// - If you wire up a backend endpoint later, change `submit()` to call it.
// - Until then we open the user's mail client with the message pre-filled.
const CONTACT_EMAIL = 'support@bloodbond.com';

const SUBJECTS = [
  { value: 'general',  label: 'General question' },
  { value: 'support',  label: 'Technical support' },
  { value: 'partner',  label: 'Partnership / blood bank inquiry' },
  { value: 'feedback', label: 'Feedback / suggestion' },
  { value: 'press',    label: 'Press / media' },
  { value: 'other',    label: 'Other' },
];

const empty = { name: '', email: '', subject: 'general', message: '' };

export default function ContactUsPage() {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const onChange = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    if (errors[k]) setErrors({ ...errors, [k]: null });
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Please tell us your name.';
    if (!form.email.trim()) next.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'That email looks off.';
    if (!form.message.trim() || form.message.trim().length < 10) {
      next.message = 'Please write at least 10 characters.';
    }
    return next;
  };

  const submit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length > 0) {
      setErrors(v);
      return;
    }
    setSending(true);
    try {
      // ── Option A: try the real API first if you have one ─────────────
      // Uncomment when a contact endpoint exists in the backend:
      //
      //   await api.post('/api/contact', form);
      //
      // ── Option B: fall back to a mailto link ─────────────────────────
      const subjectLabel = SUBJECTS.find((s) => s.value === form.subject)?.label || 'Contact';
      const body = [
        `Name: ${form.name}`,
        `Email: ${form.email}`,
        `Subject: ${subjectLabel}`,
        '',
        form.message,
      ].join('\n');
      const mailto =
        `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`[${subjectLabel}] ${form.name}`)}` +
        `&body=${encodeURIComponent(body)}`;

      // Open the user's mail client. Use a hidden link click to avoid popup blockers.
      const a = document.createElement('a');
      a.href = mailto;
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();

      toast.success('Opening your mail app…');
      setSent(true);
      setForm(empty);
    } catch (err) {
      toast.error('Could not send — please email us directly at ' + CONTACT_EMAIL);
    } finally {
      setSending(false);
    }
  };

  return (
    <Container>
      <PageHeader
        title="Contact us"
        subtitle="Questions, ideas, partnership opportunities? Drop us a line."
      />

      <Row className="g-3">
        <Col lg={7}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              {sent && (
                <Alert variant="success" onClose={() => setSent(false)} dismissible>
                  Your mail app should be opening with the message ready to send.
                  If nothing happened, email us directly at <strong>{CONTACT_EMAIL}</strong>.
                </Alert>
              )}
              <Form onSubmit={submit} noValidate>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Your name</Form.Label>
                      <Form.Control
                        value={form.name}
                        onChange={onChange('name')}
                        isInvalid={!!errors.name}
                        placeholder="Jane Doe"
                      />
                      <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        value={form.email}
                        onChange={onChange('email')}
                        isInvalid={!!errors.email}
                        placeholder="you@example.com"
                      />
                      <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Subject</Form.Label>
                  <Form.Select value={form.subject} onChange={onChange('subject')}>
                    {SUBJECTS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Message</Form.Label>
                  <Form.Control
                    as="textarea" rows={6}
                    value={form.message}
                    onChange={onChange('message')}
                    isInvalid={!!errors.message}
                    placeholder="Tell us what's on your mind…"
                  />
                  <Form.Control.Feedback type="invalid">{errors.message}</Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    {form.message.trim().length} / 10 minimum
                  </Form.Text>
                </Form.Group>

                <Button type="submit" variant="danger" size="lg" disabled={sending}>
                  {sending ? <><Spinner size="sm" animation="border" /> Sending…</> : 'Send message'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="shadow-sm border-0 mb-3">
            <Card.Body>
              <h5 className="mb-3">Get in touch</h5>

              <ContactRow icon="📧" title="Email" value={CONTACT_EMAIL} href={`mailto:${CONTACT_EMAIL}`} />
              <ContactRow icon="📞" title="Phone" value="+970 599 000 000" href="tel:+970599000000" />
              <ContactRow icon="📍" title="Address" value="Ramallah, Palestine" />
              <ContactRow icon="🕐" title="Hours" value="Sun – Thu, 9:00 – 17:00" />
            </Card.Body>
          </Card>

          <Card className="shadow-sm border-0">
            <Card.Body>
              <h5 className="mb-3">Quick links</h5>
              <ul className="list-unstyled mb-0">
                <li className="mb-2">🩸 <a href="/requests">View open blood requests</a></li>
                <li className="mb-2">🏥 <a href="/blood-banks">Find a blood bank</a></li>
                <li className="mb-2">📅 <a href="/events">Upcoming events</a></li>
                <li className="mb-2">💰 <a href="/monetary">Make a monetary donation</a></li>
                <li className="mb-2">❓ <a href="/eligibility">Check your eligibility</a></li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

function ContactRow({ icon, title, value, href }) {
  const body = (
    <div className="d-flex align-items-start gap-3 mb-3">
      <div
        className="d-flex align-items-center justify-content-center bg-danger text-white rounded"
        style={{ width: 40, height: 40, fontSize: '1.2rem', flexShrink: 0 }}
      >{icon}</div>
      <div>
        <div className="text-muted small">{title}</div>
        <div className="fw-semibold">{value}</div>
      </div>
    </div>
  );
  return href ? <a href={href} className="text-decoration-none text-reset">{body}</a> : body;
}
