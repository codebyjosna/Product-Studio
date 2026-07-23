import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { PageSkeleton, getSkeletonVariant } from './PageSkeleton';

const LandingPage = lazy(() =>
  import('../pages/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const StudioPage = lazy(() =>
  import('../pages/StudioPage').then((m) => ({ default: m.StudioPage }))
);
const SignInPage = lazy(() =>
  import('../pages/SignInPage').then((m) => ({ default: m.SignInPage }))
);
const SignUpPage = lazy(() =>
  import('../pages/SignUpPage').then((m) => ({ default: m.SignUpPage }))
);
const VerifyOtpPage = lazy(() =>
  import('../pages/VerifyOtpPage').then((m) => ({ default: m.VerifyOtpPage }))
);
const ResetPasswordPage = lazy(() =>
  import('../pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage }))
);
const ResetOtpPage = lazy(() =>
  import('../pages/ResetOtpPage').then((m) => ({ default: m.ResetOtpPage }))
);
const NewPasswordPage = lazy(() =>
  import('../pages/NewPasswordPage').then((m) => ({ default: m.NewPasswordPage }))
);
const UpgradePage = lazy(() =>
  import('../pages/UpgradePage').then((m) => ({ default: m.UpgradePage }))
);
const OrderSummaryPage = lazy(() =>
  import('../pages/OrderSummaryPage').then((m) => ({ default: m.OrderSummaryPage }))
);
const FinalSummaryPage = lazy(() =>
  import('../pages/FinalSummaryPage').then((m) => ({ default: m.FinalSummaryPage }))
);
const TransactionSummaryPage = lazy(() =>
  import('../pages/TransactionSummaryPage').then((m) => ({ default: m.TransactionSummaryPage }))
);
const TermsPage = lazy(() =>
  import('../pages/LegalPages').then((m) => ({ default: m.TermsPage }))
);
const PrivacyPage = lazy(() =>
  import('../pages/LegalPages').then((m) => ({ default: m.PrivacyPage }))
);
const RefundPage = lazy(() =>
  import('../pages/LegalPages').then((m) => ({ default: m.RefundPage }))
);
const ContactPage = lazy(() =>
  import('../pages/LegalPages').then((m) => ({ default: m.ContactPage }))
);
const HtmlSitemapPage = lazy(() =>
  import('../pages/HtmlSitemapPage').then((m) => ({ default: m.HtmlSitemapPage }))
);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MIN_SKELETON_MS = 450;

function RootEntry() {
  return <LandingPage />;
}

function StudioEntry() {
  const { user } = useAuth();
  if (user) return <Navigate to={`/${user.userId}`} replace />;
  return <StudioPage />;
}

function HomeById() {
  const { user, authReady } = useAuth();
  const { userId } = useParams();

  if (!authReady) {
    return <PageSkeleton variant="studio" />;
  }

  // Guests must not open arbitrary UUID studio routes.
  if (!user) {
    return <Navigate to="/studio" replace />;
  }

  if (!userId || !UUID_RE.test(userId) || user.userId !== userId) {
    return <Navigate to={`/${user.userId}`} replace />;
  }

  return <StudioPage />;
}

function RoutedApp({ location }: { location: ReturnType<typeof useLocation> }) {
  return (
    <Routes location={location}>
      <Route path="/" element={<RootEntry />} />
      <Route path="/studio" element={<StudioEntry />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/reset-otp" element={<ResetOtpPage />} />
      <Route path="/new-password" element={<NewPasswordPage />} />
      <Route path="/upgrade" element={<UpgradePage />} />
      <Route path="/order-summary/:planId" element={<OrderSummaryPage />} />
      <Route path="/final-summary/:planId" element={<FinalSummaryPage />} />
      <Route path="/transaction-summary/:txnId" element={<TransactionSummaryPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/refund" element={<RefundPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/html-sitemap" element={<HtmlSitemapPage />} />
      <Route path="/:userId" element={<HomeById />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** Skeleton loading stage on every route change. */
export function NavigationShell() {
  const location = useLocation();
  const { authReady } = useAuth();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    const changed =
      location.pathname !== displayLocation.pathname ||
      location.search !== displayLocation.search;

    if (!changed) return;

    setShowSkeleton(true);
    const timer = window.setTimeout(() => {
      setDisplayLocation(location);
      setShowSkeleton(false);
    }, MIN_SKELETON_MS);

    return () => window.clearTimeout(timer);
  }, [location, displayLocation.pathname, displayLocation.search]);

  const variant = getSkeletonVariant(
    showSkeleton ? location.pathname : displayLocation.pathname
  );

  if (!authReady) {
    return <PageSkeleton variant={getSkeletonVariant(location.pathname)} />;
  }

  if (showSkeleton) {
    return <PageSkeleton variant={variant} />;
  }

  return (
    <Suspense fallback={<PageSkeleton variant={getSkeletonVariant(displayLocation.pathname)} />}>
      <RoutedApp location={displayLocation} />
    </Suspense>
  );
}
