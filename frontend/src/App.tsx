import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase/config';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Repos } from './pages/Repos';
import { TrackedRepos } from './pages/TrackedRepos';
import { Incidents } from './pages/Incidents';
import { IncidentDetail } from './pages/IncidentDetail';
import { Integrations } from './pages/Integrations';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthedShell } from './components/AuthedShell';
import styles from './App.module.css';

/**
 * Main App component with routing
 */
function App() {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          element={
            <ProtectedRoute>
              <AuthedShell />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="repos" element={<Repos />} />
          <Route path="tracked-repos" element={<TrackedRepos />} />
          <Route path="incidents" element={<Incidents />} />
          <Route path="incidents/:incidentId" element={<IncidentDetail />} />
          <Route path="integrations" element={<Integrations />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
