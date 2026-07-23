import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { StudioPage } from './pages/StudioPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { VerifyOtpPage } from './pages/VerifyOtpPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ResetOtpPage } from './pages/ResetOtpPage';
import { NewPasswordPage } from './pages/NewPasswordPage';
import { PrivacyPage, TermsPage } from './pages/LegalPages';
import { UpgradePage } from './pages/UpgradePage';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function RootEntry() {
  const { user } = useAuth();
  if (user) return <Navigate to={`/${user.userId}`} replace />;
  return <StudioPage />;
}

function SignedInHome() {
  const { user } = useAuth();
  const { userId } = useParams();

  if (!user) return <Navigate to="/signin" replace />;
  if (!userId || !UUID_RE.test(userId)) {
    return <Navigate to={`/${user.userId}`} replace />;
  }
  if (user.userId !== userId) {
    return <Navigate to={`/${user.userId}`} replace />;
  }
  return <StudioPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootEntry />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/reset-otp" element={<ResetOtpPage />} />
          <Route path="/new-password" element={<NewPasswordPage />} />
          <Route path="/upgrade" element={<UpgradePage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/:userId" element={<SignedInHome />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
