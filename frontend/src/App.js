import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LandingPage from "@/pages/LandingPage";
import Dashboard from "@/pages/Dashboard";
import Editor from "@/pages/Editor";
import VideoGenerator from "@/pages/VideoGenerator";
import Templates from "@/pages/Templates";
import Scheduler from "@/pages/Scheduler";
import ProfileOptimizer from "@/pages/ProfileOptimizer";

function ProtectedRoute() {
  const { user } = useAuth();
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FF007A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  return <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/video" element={<VideoGenerator />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/schedule" element={<Scheduler />} />
        <Route path="/profile-optimizer" element={<ProfileOptimizer />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
