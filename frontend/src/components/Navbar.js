import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, ImagePlus, Video, LayoutTemplate, Calendar, Sparkles, Settings, LogOut, Menu, X, Zap, Code2 } from "lucide-react";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/editor", label: "Editor", icon: ImagePlus },
  { path: "/video", label: "Video AI", icon: Video },
  { path: "/templates", label: "Templates", icon: LayoutTemplate },
  { path: "/schedule", label: "Scheduler", icon: Calendar },
  { path: "/profile-optimizer", label: "Profile AI", icon: Sparkles },
  { path: "/ide", label: "IDE Assistant", icon: Code2 },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-[#0F0F13] border-r border-white/10 fixed left-0 top-0 z-40">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/10">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF007A] to-[#9D4CDD] flex items-center justify-center shadow-[0_0_20px_rgba(255,0,122,0.4)]">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-lg" style={{ fontFamily: 'Unbounded, sans-serif' }}>
                Sen<span className="text-[#FF007A]">Guard</span>
              </span>
              <p className="text-[10px] text-[#A0A0AB] tracking-widest uppercase">AI Studio</p>
            </div>
          </Link>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                data-testid={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  active
                    ? "bg-[#FF007A]/10 text-white border border-[#FF007A]/30 shadow-[0_0_15px_rgba(255,0,122,0.1)]"
                    : "text-[#A0A0AB] hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={18} className={active ? "text-[#FF007A]" : "group-hover:text-[#FF007A] transition-colors"} />
                {label}
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FF007A]" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF007A] to-[#9D4CDD] flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-[#70707C] text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-btn"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-[#A0A0AB] hover:text-white hover:bg-white/5 transition-all w-full text-sm"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0F0F13] border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF007A] to-[#9D4CDD] flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-bold text-white" style={{ fontFamily: 'Unbounded, sans-serif' }}>
            Sen<span className="text-[#FF007A]">Guard</span>
          </span>
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white p-1">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-[#050505]/95 pt-16">
          <nav className="px-4 py-4 space-y-2">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium ${
                  location.pathname === path ? "bg-[#FF007A]/10 text-white border border-[#FF007A]/30" : "text-[#A0A0AB]"
                }`}
              >
                <Icon size={20} className={location.pathname === path ? "text-[#FF007A]" : ""} />
                {label}
              </Link>
            ))}
            <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-[#A0A0AB] text-base w-full">
              <LogOut size={20} />
              Sign out
            </button>
          </nav>
        </div>
      )}
    </>
  );
}
