import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RequireFullAccess } from './components/RequireFullAccess';
import Login from './pages/Login';
import Projects from './pages/Projects';
import Overview from './pages/Overview';
import Connect from './pages/Connect';
import Discovery from './pages/Discovery';
import CallFlow from './pages/CallFlow';
import Mapping from './pages/Mapping';
import Deploy from './pages/Deploy';
import Testing from './pages/Testing';
import Reports from './pages/Reports';
import Review from './pages/Review';
import Vectors from './pages/Vectors';
import DataIntegrations from './pages/DataIntegrations';
import Architecture from './pages/Architecture';
import Audio from './pages/Audio';
import Admin from './pages/Admin';
import TenantAdmin from './pages/TenantAdmin';
import Integrations from './pages/Integrations';
import Help from './pages/Help';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Projects />} />
        <Route path="/overview" element={<Overview />} />
        <Route path="/connect" element={<RequireFullAccess><Connect /></RequireFullAccess>} />
        <Route path="/discovery" element={<Discovery />} />
        <Route path="/callflow" element={<CallFlow />} />
        <Route path="/mapping" element={<Mapping />} />
        <Route path="/deploy" element={<RequireFullAccess><Deploy /></RequireFullAccess>} />
        <Route path="/testing" element={<Testing />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/review" element={<RequireFullAccess><Review /></RequireFullAccess>} />
        <Route path="/vectors" element={<RequireFullAccess><Vectors /></RequireFullAccess>} />
        <Route path="/dataint" element={<RequireFullAccess><DataIntegrations /></RequireFullAccess>} />
        <Route path="/architecture" element={<RequireFullAccess><Architecture /></RequireFullAccess>} />
        <Route path="/audio" element={<RequireFullAccess><Audio /></RequireFullAccess>} />
        <Route path="/admin" element={<RequireFullAccess><Admin /></RequireFullAccess>} />
        <Route path="/tenantadmin" element={<RequireFullAccess><TenantAdmin /></RequireFullAccess>} />
        <Route path="/integrations" element={<RequireFullAccess><Integrations /></RequireFullAccess>} />
        <Route path="/help" element={<Help />} />
      </Route>
    </Routes>
  );
}
