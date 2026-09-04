import { Outlet } from 'react-router-dom';
import AppNavbar from './AppNavbar';

export default function AppLayout() {
  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <AppNavbar />
      <main className="flex-grow-1 py-4">
        <Outlet />
      </main>
      <footer className="text-center text-muted py-3 border-top bg-white small">
        Blood Bond &middot; Built with React + Bootstrap &middot; &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
