import { Container } from 'react-bootstrap';

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <Container className="mb-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div>
          <h1 className="h3 mb-1 text-danger fw-bold">{title}</h1>
          {subtitle && <div className="text-muted">{subtitle}</div>}
        </div>
        {actions && <div className="d-flex gap-2">{actions}</div>}
      </div>
      <hr />
    </Container>
  );
}
