export default function EmptyState({ title = 'Nothing here yet', message, icon = '🩸', children }) {
  return (
    <div className="text-center py-5">
      <div style={{ fontSize: '3rem' }}>{icon}</div>
      <h5 className="mt-3">{title}</h5>
      {message && <p className="text-muted">{message}</p>}
      {children}
    </div>
  );
}
