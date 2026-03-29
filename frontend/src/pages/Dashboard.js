import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import axios from "axios";
import { ImagePlus, Video, Calendar, Sparkles, Folder, Plus, TrendingUp, Clock } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const quickActions = [
  { to: "/editor", label: "New Edit", desc: "Upload & edit a photo", icon: ImagePlus, color: "#FF007A", glow: "rgba(255,0,122,0.3)" },
  { to: "/video", label: "Gen Video", desc: "Create AI video with Veo", icon: Video, color: "#00E5FF", glow: "rgba(0,229,255,0.3)" },
  { to: "/templates", label: "Templates", desc: "Start from a template", icon: Folder, color: "#E2FF31", glow: "rgba(226,255,49,0.3)" },
  { to: "/profile-optimizer", label: "Profile AI", desc: "Optimize your profile", icon: Sparkles, color: "#9D4CDD", glow: "rgba(157,76,221,0.3)" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ projects: 0, scheduled_posts: 0, templates: 0, filters: 20 });
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, projectsRes] = await Promise.all([
          axios.get(`${API}/stats`, { withCredentials: true }),
          axios.get(`${API}/projects`, { withCredentials: true }),
        ]);
        setStats(statsRes.data);
        setProjects(projectsRes.data.slice(0, 6));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Navbar />
      <main className="flex-1 md:ml-64 p-6 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[#70707C] text-sm mb-1">{greeting},</p>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Unbounded, sans-serif' }}>
            {user?.name?.split(" ")[0]} <span className="text-[#FF007A]">✦</span>
          </h1>
          <p className="text-[#A0A0AB] text-sm mt-1">Let's make something awesome today</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Projects", value: stats.projects, icon: Folder, color: "#FF007A" },
            { label: "Scheduled", value: stats.scheduled_posts, icon: Calendar, color: "#00E5FF" },
            { label: "Templates", value: stats.templates, icon: TrendingUp, color: "#E2FF31" },
            { label: "Filters", value: stats.filters, icon: Sparkles, color: "#9D4CDD" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} data-testid={`stat-${label.toLowerCase()}`} className="bg-[#0F0F13] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[#70707C] text-xs uppercase tracking-widest">{label}</span>
                <Icon size={16} style={{ color }} />
              </div>
              <p className="text-3xl font-bold text-white">{loading ? "—" : value}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4" style={{ fontFamily: 'Unbounded, sans-serif' }}>Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map(({ to, label, desc, icon: Icon, color, glow }) => (
              <Link
                key={to}
                to={to}
                data-testid={`quick-action-${label.toLowerCase().replace(/\s+/g, '-')}`}
                className="group bg-[#0F0F13] border border-white/10 rounded-2xl p-5 hover:border-white/20 hover:-translate-y-1 transition-all duration-300 block"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
                  style={{ backgroundColor: `${color}15`, border: `1px solid ${color}25`, boxShadow: `0 0 0 0 ${glow}` }}
                >
                  <Icon size={20} style={{ color }} />
                </div>
                <p className="text-white font-semibold text-sm mb-1">{label}</p>
                <p className="text-[#70707C] text-xs">{desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Projects */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white" style={{ fontFamily: 'Unbounded, sans-serif' }}>Recent Projects</h2>
            <Link to="/editor" className="flex items-center gap-1.5 text-sm text-[#FF007A] hover:text-[#FF3399] transition-colors">
              <Plus size={14} />
              New project
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1,2,3].map(i => (
                <div key={i} className="bg-[#0F0F13] border border-white/10 rounded-2xl aspect-video animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div
              data-testid="empty-projects"
              className="bg-[#0F0F13] border border-dashed border-white/20 rounded-2xl p-12 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#FF007A]/10 border border-[#FF007A]/20 flex items-center justify-center mx-auto mb-4">
                <ImagePlus size={28} className="text-[#FF007A]" />
              </div>
              <p className="text-white font-semibold mb-2">No projects yet</p>
              <p className="text-[#70707C] text-sm mb-6">Upload an image and start editing!</p>
              <Link
                to="/editor"
                data-testid="create-first-project-btn"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#FF007A] text-white text-sm font-medium hover:bg-[#FF3399] transition-all"
              >
                <Plus size={16} /> Start editing
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {projects.map(p => (
                <Link key={p.id} to="/editor" className="group bg-[#0F0F13] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all hover:-translate-y-0.5">
                  <div className="aspect-video bg-[#1A1A24] relative overflow-hidden">
                    {p.thumbnail ? (
                      <img src={p.thumbnail} alt={p.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImagePlus size={24} className="text-[#50505C]" />
                      </div>
                    )}
                    {p.filter_applied && (
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-xs text-[#FF007A] px-2 py-0.5 rounded-full border border-[#FF007A]/30">
                        {p.filter_applied}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-white text-sm font-medium truncate">{p.title}</p>
                    <div className="flex items-center gap-1 mt-1 text-[#70707C] text-xs">
                      <Clock size={10} />
                      {new Date(p.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
