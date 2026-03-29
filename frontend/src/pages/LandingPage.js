import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, formatError } from "@/contexts/AuthContext";
import { Zap, ImagePlus, Video, Calendar, Sparkles, ChevronRight, Star, X } from "lucide-react";

const features = [
  { icon: ImagePlus, title: "AI Image Editor", desc: "20+ pro filters, AI enhance, background removal & generation", color: "#FF007A" },
  { icon: Video, title: "Veo Video Gen", desc: "Turn photos into stunning 8-sec videos with Google Veo AI", color: "#00E5FF" },
  { icon: Calendar, title: "Social Scheduler", desc: "Auto-post to Instagram & Facebook with calendar scheduling", color: "#E2FF31" },
  { icon: Sparkles, title: "Profile Optimizer", desc: "AI rewrites your bio & enhances your profile picture", color: "#9D4CDD" },
];

const filters = ["Neon Noir", "Golden Hour", "Cyberpunk Glow", "Nordic Cold", "Glitch VHS", "Pastel Dream", "Y2K Sparkle", "Lo-Fi Warmth"];

export default function LandingPage() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState("login");
  const [showAuth, setShowAuth] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate("/dashboard");
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (authMode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.password);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF007A]/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#9D4CDD]/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-[#00E5FF]/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF007A] to-[#9D4CDD] flex items-center justify-center shadow-[0_0_20px_rgba(255,0,122,0.5)]">
            <Zap size={18} className="text-white" />
          </div>
          <span className="font-bold text-xl" style={{ fontFamily: 'Unbounded, sans-serif' }}>
            Retouch<span className="text-[#FF007A]">Fly</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setAuthMode("login"); setShowAuth(true); }}
            data-testid="nav-login-btn"
            className="px-5 py-2 rounded-full border border-white/20 text-white text-sm hover:bg-white/5 transition-all"
          >
            Sign in
          </button>
          <button
            onClick={() => { setAuthMode("register"); setShowAuth(true); }}
            data-testid="nav-signup-btn"
            className="px-5 py-2 rounded-full bg-[#FF007A] text-white text-sm font-medium hover:bg-[#FF3399] hover:shadow-[0_0_20px_rgba(255,0,122,0.4)] transition-all"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-[#A0A0AB] mb-8">
          <Star size={12} className="text-[#E2FF31] fill-[#E2FF31]" />
          AI-powered by Google Gemini & Veo
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter mb-6 leading-[1.05]" style={{ fontFamily: 'Unbounded, sans-serif' }}>
          Edit. Generate.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF007A] via-[#9D4CDD] to-[#00E5FF]">
            Go Viral.
          </span>
        </h1>

        <p className="text-lg text-[#A0A0AB] max-w-2xl mx-auto mb-10 leading-relaxed">
          RetouchFly is the fun, powerful AI studio for creators. Edit photos, generate videos, schedule posts — all in one ridiculous-easy tool.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button
            onClick={() => { setAuthMode("register"); setShowAuth(true); }}
            data-testid="hero-cta-btn"
            className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#FF007A] text-white font-semibold hover:bg-[#FF3399] hover:shadow-[0_0_30px_rgba(255,0,122,0.5)] transition-all text-base"
          >
            Start for free <ChevronRight size={18} />
          </button>
          <button
            onClick={() => { setAuthMode("login"); setShowAuth(true); }}
            className="flex items-center gap-2 px-8 py-3.5 rounded-full border border-white/20 text-white font-medium hover:bg-white/5 transition-all text-base"
          >
            Sign in
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 justify-center mt-12">
          {filters.map(f => (
            <span key={f} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-[#A0A0AB] hover:border-[#FF007A]/40 hover:text-white transition-all cursor-default">
              {f}
            </span>
          ))}
          <span className="px-3 py-1 rounded-full bg-[#FF007A]/10 border border-[#FF007A]/30 text-xs text-[#FF007A]">+12 more filters</span>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map(({ icon: Icon, title, desc, color }) => (
            <div
              key={title}
              className="p-6 rounded-2xl bg-[#0F0F13] border border-white/10 hover:border-white/20 hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                <Icon size={20} style={{ color }} />
              </div>
              <h3 className="text-white font-semibold text-base mb-2">{title}</h3>
              <p className="text-[#70707C] text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Hero Image */}
        <div className="mt-16 rounded-3xl overflow-hidden border border-white/10 relative">
          <img
            src="https://images.unsplash.com/photo-1773982417805-fef047dce498?crop=entropy&cs=srgb&fm=jpg&q=80&w=1200&h=500&fit=crop"
            alt="RetouchFly Editor"
            className="w-full object-cover opacity-60"
            style={{ maxHeight: 400 }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <p className="text-[#A0A0AB] text-sm uppercase tracking-widest mb-2">The Editor</p>
            <h2 className="text-3xl font-bold text-white" style={{ fontFamily: 'Unbounded, sans-serif' }}>
              Professional. Fast. Fun.
            </h2>
          </div>
        </div>
      </section>

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-[#0F0F13] rounded-3xl border border-white/10 p-8 relative shadow-2xl">
            <button onClick={() => setShowAuth(false)} className="absolute top-5 right-5 text-[#A0A0AB] hover:text-white transition-colors">
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF007A] to-[#9D4CDD] flex items-center justify-center">
                <Zap size={18} className="text-white" />
              </div>
              <span className="font-bold text-xl text-white" style={{ fontFamily: 'Unbounded, sans-serif' }}>
                Retouch<span className="text-[#FF007A]">Fly</span>
              </span>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-black/40 rounded-xl mb-6 border border-white/10">
              {["login", "register"].map(mode => (
                <button
                  key={mode}
                  onClick={() => { setAuthMode(mode); setError(""); }}
                  data-testid={`auth-tab-${mode}`}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    authMode === mode ? "bg-[#FF007A] text-white shadow-[0_0_15px_rgba(255,0,122,0.3)]" : "text-[#A0A0AB] hover:text-white"
                  }`}
                >
                  {mode === "login" ? "Sign in" : "Register"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === "register" && (
                <div>
                  <label className="block text-xs text-[#A0A0AB] uppercase tracking-widest mb-1.5">Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Your name"
                    required
                    data-testid="register-name-input"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#50505C] focus:border-[#FF007A]/50 focus:ring-1 focus:ring-[#FF007A]/30 outline-none transition-all"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs text-[#A0A0AB] uppercase tracking-widest mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  required
                  data-testid="auth-email-input"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#50505C] focus:border-[#FF007A]/50 focus:ring-1 focus:ring-[#FF007A]/30 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-[#A0A0AB] uppercase tracking-widest mb-1.5">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  data-testid="auth-password-input"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#50505C] focus:border-[#FF007A]/50 focus:ring-1 focus:ring-[#FF007A]/30 outline-none transition-all"
                />
              </div>

              {error && (
                <p data-testid="auth-error" className="text-red-400 text-sm bg-red-400/10 px-4 py-2.5 rounded-xl border border-red-400/20">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                data-testid="auth-submit-btn"
                className="w-full py-3.5 rounded-xl bg-[#FF007A] text-white font-semibold hover:bg-[#FF3399] hover:shadow-[0_0_20px_rgba(255,0,122,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    {authMode === "login" ? "Signing in..." : "Creating account..."}
                  </span>
                ) : (
                  authMode === "login" ? "Sign in" : "Create account"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
