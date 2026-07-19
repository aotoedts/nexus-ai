import { Navigate, Route, Routes } from 'react-router-dom';
import { Login } from './pages/Login.js';
import { Chat } from './pages/Chat.js';
import { Admin } from './pages/Admin.js';
import { useAuthStore } from './store/authStore.js';

function ProtectedRoute({ children, adminOnly = false }: { children: JSX.Element; adminOnly?: boolean }) {
  const { user, token } = useAuthStore();

  if (!token || !user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/chat" replace />;

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <Admin />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
}
