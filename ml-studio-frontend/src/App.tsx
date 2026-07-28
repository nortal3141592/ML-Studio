import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthGuard } from './components/layout/AuthGuard'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ProjectOverviewPage } from './pages/ProjectOverviewPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { AccountPage } from './pages/AccountPage'
import { CleanedPreviewPage } from './pages/pipeline/CleanedPreviewPage'
import { RawPreviewPage } from './pages/pipeline/RawPreviewPage'
import { EngineeredPreviewPage } from './pages/pipeline/EngineeredPreviewPage'
import { TrainingPage } from './pages/pipeline/TrainingPage'
import { Navigate } from 'react-router-dom'
import { RunOverviewPage } from './pages/runs/RunOverviewPage'
import { RunDetailsPage } from './pages/runs/RunDetailsPage'
import { RunMetricsPage } from './pages/runs/RunMetricsPage'
import { RunEvaluationPage } from './pages/runs/RunEvaluationPage'
import { DashboardPage } from './pages/pipeline/DashboardPage'
import { RunDownloadPage } from './pages/runs/RunDownloadPage'


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* protected routes — must pass AuthGuard, then render inside AppLayout */}
        <Route element={<AuthGuard />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<ProjectsPage />} />
            <Route path="/projects/:projectId" element={<ProjectOverviewPage />}>
              <Route path="raw" element={<RawPreviewPage />} />
              <Route path="cleaned" element={<CleanedPreviewPage />} />
              <Route path="engineered" element={<EngineeredPreviewPage />} />
              <Route path="training" element={<TrainingPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route index element={<div className="text-text-muted text-sm">Redirecting...</div>} />
            </Route>
            <Route path="/account" element={<AccountPage />} />
          </Route>
        </Route>
        <Route path="/projects/:projectId/runs/:runId" element={<RunOverviewPage />}>
          <Route index element={<Navigate to="details" replace />} />
          <Route path="details" element={<RunDetailsPage />} />
          <Route path="metrics" element={<RunMetricsPage />} />
          <Route path="evaluation" element={<RunEvaluationPage />} />
          <Route path="download" element={<RunDownloadPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App