import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import StaffDashboard from './pages/StaffDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

function AppContent() {
  const { user, userProfile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('login');

  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/register') {
      setCurrentPage('register');
    } else if (path === '/login' || path === '/') {
      setCurrentPage('login');
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/register') {
        setCurrentPage('register');
      } else {
        setCurrentPage('login');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handleLinkClick = (e) => {
      const target = e.target;
      if (target.tagName === 'A') {
        const href = target.getAttribute('href');
        if (href === '/register' || href === '/login') {
          e.preventDefault();
          const newPage = href === '/register' ? 'register' : 'login';
          setCurrentPage(newPage);
          window.history.pushState({}, '', href);
        }
      }
    };

    document.addEventListener('click', handleLinkClick);
    return () => document.removeEventListener('click', handleLinkClick);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return currentPage === 'register' ? <Register /> : <Login />;
  }

  switch (userProfile.role) {
    case 'student':
      return <StudentDashboard />;
    case 'staff':
      return <StaffDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <Login />;
  }
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
