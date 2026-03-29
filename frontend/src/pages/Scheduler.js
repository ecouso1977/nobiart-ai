import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import axios from "axios";
import { Plus, Calendar, Trash2, Instagram, Facebook, Clock, RefreshCw, X } from "lucide-react";
import { FaInstagram, FaFacebook, FaTiktok, FaLinkedin, FaTwitter } from "react-icons/fa";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: FaInstagram, color: "#E1306C" },
  { id: "facebook", label: "Facebook", icon: FaFacebook, color: "#1877F2" },
  { id: "tiktok", label: "TikTok", icon: FaTiktok, color: "#ff0050" },
  { id: "linkedin", label: "LinkedIn", icon: FaLinkedin, color: "#0077B5" },
  { id: "twitter", label: "X / Twitter", icon: FaTwitter, color: "#1DA1F2" },
];

const RECURRENCE = [
  { id: "", label: "One-time" },
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

function PlatformBadge({ platform }) {
  const p = PLATFORMS.find(pl => pl.id === platform);
  if (!p) return <span className="text-xs text-[#70707C]">{platform}</span>;
  const Icon = p.icon;
  return (
    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border" style={{ color: p.color, borderColor: `${p.color}40`, backgroundColor: `${p.color}10` }}>
      <Icon size={10} /> {p.label}
    </span>
  );
}

export default function Scheduler() {
  const [posts, setPosts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    content: "",
    platforms: [],
    scheduled_at: "",
    recurrence: ""
  });

  const load = async () => {
    try {
      const { data } = await axios.get(`${API}/schedule/posts`, { withCredentials: true });
      setPosts(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const togglePlatform = (id) => {
    setForm(f => ({
      ...f,
      platforms: f.platforms.includes(id) ? f.platforms.filter(p => p !== id) : [...f.platforms, id]
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.content.trim()) { setError("Content is required"); return; }
    if (form.platforms.length === 0) { setError("Select at least one platform"); return; }
    if (!form.scheduled_at) { setError("Schedule date is required"); return; }
    setError("");
    setSubmitting(true);
    try {
      await axios.post(`${API}/schedule/posts`, {
        content: form.content,
        platforms: form.platforms,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        recurrence: form.recurrence || null,
        media_paths: []
      }, { withCredentials: true });
      setShowModal(false);
      setForm({ content: "", platforms: [], scheduled_at: "", recurrence: "" });
      load();
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to schedule post");
    } finally { setSubmitting(false); }
  };

  const deletePost = async (id) => {
    try {
      await axios.delete(`${API}/schedule/posts/${id}`, { withCredentials: true });
      setPosts(posts.filter(p => p.id !== id));
    } catch (e) { console.error(e); }
  };

  const upcoming = posts.filter(p => new Date(p.scheduled_at) > new Date()).slice(0, 20);
  const past = posts.filter(p => new Date(p.scheduled_at) <= new Date()).slice(0, 5);

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Navbar />
      <main className="flex-1 md:ml-64 p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Unbounded, sans-serif' }}>
              Social <span className="text-[#E2FF31]">Scheduler</span>
            </h1>
            <p className="text-[#A0A0AB] text-sm">Plan and auto-publish your content across platforms.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            data-testid="new-post-btn"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E2FF31] text-[#050505] font-semibold text-sm hover:bg-[#E8FF66] hover:shadow-[0_0_20px_rgba(226,255,49,0.3)] transition-all"
          >
            <Plus size={16} /> Schedule Post
          </button>
        </div>

        {/* Meta OAuth Notice */}
        <div className="bg-[#1A1A24] border border-[#E2FF31]/20 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#E2FF31]/10 flex items-center justify-center flex-shrink-0">
            <FaInstagram size={14} className="text-[#E2FF31]" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">Connect your social accounts</p>
            <p className="text-[#70707C] text-xs mt-0.5">OAuth integration with Meta (Instagram/Facebook) coming soon. Posts will be queued and published once connected.</p>
            <button data-testid="connect-instagram-btn" className="mt-2 text-[#E2FF31] text-xs font-medium hover:underline">
              Connect Instagram & Facebook →
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total Scheduled", value: posts.length, color: "#E2FF31" },
            { label: "Upcoming", value: upcoming.length, color: "#00FF9D" },
            { label: "Past", value: past.length, color: "#70707C" },
          ].map(s => (
            <div key={s.label} className="bg-[#0F0F13] border border-white/10 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[#70707C] text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Upcoming Posts */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-[#0F0F13] border border-white/10 rounded-2xl animate-pulse" />)}
          </div>
        ) : posts.length === 0 ? (
          <div data-testid="empty-schedule" className="bg-[#0F0F13] border border-dashed border-white/20 rounded-2xl p-12 text-center">
            <Calendar size={32} className="text-[#50505C] mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">No posts scheduled</p>
            <p className="text-[#70707C] text-sm mb-5">Create your first scheduled post to get started</p>
            <button
              onClick={() => setShowModal(true)}
              data-testid="schedule-first-post-btn"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E2FF31] text-[#050505] font-semibold text-sm hover:bg-[#E8FF66] transition-all"
            >
              <Plus size={14} /> Schedule Post
            </button>
          </div>
        ) : (
          <div className="space-y-3" data-testid="posts-list">
            <h3 className="text-white font-semibold text-sm mb-3">Upcoming Posts</h3>
            {upcoming.map(post => (
              <div key={post.id} data-testid={`post-item-${post.id}`} className="bg-[#0F0F13] border border-white/10 rounded-2xl p-4 flex items-start gap-4 hover:border-white/20 transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#1A1A24] flex items-center justify-center flex-shrink-0">
                  <Calendar size={16} className="text-[#E2FF31]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm leading-relaxed line-clamp-2">{post.content}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {post.platforms.map(p => <PlatformBadge key={p} platform={p} />)}
                    <span className="flex items-center gap-1 text-[#70707C] text-xs">
                      <Clock size={10} />
                      {new Date(post.scheduled_at).toLocaleDateString()} {new Date(post.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {post.recurrence && (
                      <span className="flex items-center gap-1 text-[#9D4CDD] text-xs">
                        <RefreshCw size={10} /> {post.recurrence}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deletePost(post.id)}
                  data-testid={`delete-post-${post.id}`}
                  className="text-[#50505C] hover:text-red-400 transition-colors flex-shrink-0 p-1"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
            <div className="w-full max-w-lg bg-[#0F0F13] rounded-3xl border border-white/10 p-7 relative shadow-2xl max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowModal(false)} className="absolute top-5 right-5 text-[#A0A0AB] hover:text-white">
                <X size={20} />
              </button>
              <h2 className="text-white font-bold text-xl mb-6" style={{ fontFamily: 'Unbounded, sans-serif' }}>Schedule Post</h2>

              <form onSubmit={submit} className="space-y-5">
                <div>
                  <label className="text-xs text-[#A0A0AB] uppercase tracking-widest mb-2 block">Content</label>
                  <textarea
                    value={form.content}
                    onChange={e => setForm({ ...form, content: e.target.value })}
                    placeholder="What do you want to post?"
                    rows={4}
                    required
                    data-testid="post-content-input"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-[#50505C] focus:border-[#E2FF31]/50 outline-none transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#A0A0AB] uppercase tracking-widest mb-2 block">Platforms</label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map(p => {
                      const Icon = p.icon;
                      const selected = form.platforms.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => togglePlatform(p.id)}
                          data-testid={`platform-${p.id}`}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
                            selected
                              ? "border text-white"
                              : "bg-[#1A1A24] border border-white/10 text-[#A0A0AB] hover:text-white"
                          }`}
                          style={selected ? { borderColor: `${p.color}60`, backgroundColor: `${p.color}15`, color: p.color } : {}}
                        >
                          <Icon size={14} /> {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#A0A0AB] uppercase tracking-widest mb-2 block">Schedule Date & Time</label>
                    <input
                      type="datetime-local"
                      value={form.scheduled_at}
                      onChange={e => setForm({ ...form, scheduled_at: e.target.value })}
                      required
                      data-testid="schedule-datetime-input"
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-[#E2FF31]/50 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#A0A0AB] uppercase tracking-widest mb-2 block">Repeat</label>
                    <select
                      value={form.recurrence}
                      onChange={e => setForm({ ...form, recurrence: e.target.value })}
                      data-testid="recurrence-select"
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-[#E2FF31]/50 outline-none"
                    >
                      {RECURRENCE.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                  </div>
                </div>

                {error && <p className="text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-xl border border-red-400/20">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  data-testid="submit-post-btn"
                  className="w-full py-3.5 rounded-xl bg-[#E2FF31] text-[#050505] font-bold hover:bg-[#E8FF66] transition-all disabled:opacity-50"
                >
                  {submitting ? "Scheduling..." : "Schedule Post"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
