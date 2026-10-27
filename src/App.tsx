import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import GalleryPage from "./pages/GalleryPage";
import ClientGalleryPage from "./pages/ClientGalleryPage";
import SettingsPage from "./pages/SettingsPage";
import BillingPage from "./pages/BillingPage";
import ProtectedRoute from "./auth/ProtectedRoute";
import LegalRedirect from "./components/LegalRedirect";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/galleries/:id"
        element={
          <ProtectedRoute>
            <GalleryPage />
          </ProtectedRoute>
        }
      />
      <Route path="/dashboard/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/dashboard/billing" element={<ProtectedRoute><BillingPage /></ProtectedRoute>} />
      <Route path="/g/:token" element={<ClientGalleryPage />} />
      <Route path="/terms" element={<LegalRedirect page="terms" />} />
      <Route path="/privacy" element={<LegalRedirect page="privacy" />} />
      <Route path="/cookies" element={<LegalRedirect page="cookies" />} />
      <Route path="/refund" element={<LegalRedirect page="refund" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
