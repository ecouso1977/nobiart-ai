import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import axios from "axios";
import { Sparkles, Upload, Copy, CheckCircle, RefreshCw } from "lucide-react";
import { FaInstagram, FaFacebook, FaTiktok, FaLinkedin, FaTwitter } from "react-icons/fa";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: FaInstagram, limit: 150 },
  { id: "twitter", label: "X/Twitter", icon: FaTwitter, limit: 160 },
  { id: "linkedin", label: "LinkedIn", icon: FaLinkedin, limit: 220 },
  { id: "tiktok", label: "TikTok", icon: FaTiktok, limit: 80 },
  { id: "facebook", label: "Facebook", icon: FaFacebook, limit: 255 },
];

const STYLES = ["professional", "creative", "playful", "inspiring", "minimalist", "bold"];

export default function ProfileOptimizer() {
  const { user } = useAuth();
  const [platform, setPlatform] = useState("instagram");
  const [style, setStyle] = useState("professional");
  const [currentBio, setCurrentBio] = useState("");
  const [username, setUsername] = useState(user?.name || "");
  const [image, setImage] = useState(null);
  const [imageB64, setImageB64] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const fileRef = useRef();

  const selectedPlatform = PLATFORMS.find(p => p.id === platform);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImage(ev.target.result);
      setImageB64(ev.target.result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const optimize = async () => {
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const { data } = await axios.post(`${API}/optimize/profile`, {
        image_b64: imageB64,
        current_bio: currentBio,
        platform,
        style,
        username
      }, { withCredentials: true });
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.detail || "Optimization failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyBio = () => {
    if (result?.result?.bio) {
      navigator.clipboard.writeText(result.result.bio);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Navbar />
      <main className="flex-1 md:ml-64 p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Unbounded, sans-serif' }}>
            Profile <span className="text-[#9D4CDD]">Optimizer</span>
          </h1>
          <p className="text-[#A0A0AB] text-sm">AI-powered bio writing and profile picture enhancement tips.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Input */}
          <div className="space-y-5">
            {/* Platform */}
            <div className="bg-[#0F0F13] border border-white/10 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-3">Platform</h3>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPlatform(p.id)}
                      data-testid={`platform-${p.id}`}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
                        platform === p.id
                          ? "bg-[#9D4CDD]/15 border border-[#9D4CDD]/50 text-white"
                          : "bg-[#1A1A24] border border-white/10 text-[#A0A0AB] hover:text-white"
                      }`}
                    >
                      <Icon size={14} /> {p.label}
                    </button>
                  );
                })}
              </div>
              {selectedPlatform && (
                <p className="text-[#70707C] text-xs mt-2">Bio limit: {selectedPlatform.limit} characters</p>
              )}
            </div>

            {/* Profile Photo */}
            <div className="bg-[#0F0F13] border border-white/10 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-3">Profile Photo (optional)</h3>
              {image ? (
                <div className="flex items-center gap-4">
                  <img src={image} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-[#9D4CDD]/40" />
                  <div>
                    <p className="text-white text-sm font-medium">Photo uploaded</p>
                    <p className="text-[#70707C] text-xs">AI will analyze and give tips</p>
                    <button onClick={() => { setImage(null); setImageB64(null); }} className="text-[#FF007A] text-xs mt-1 hover:underline">Remove</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  data-testid="profile-image-upload"
                  className="w-full border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-[#9D4CDD]/40 transition-all group"
                >
                  <Upload size={20} className="mx-auto mb-2 text-[#50505C] group-hover:text-[#9D4CDD] transition-colors" />
                  <p className="text-[#70707C] text-sm">Upload profile photo</p>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
            </div>

            {/* Bio & Details */}
            <div className="bg-[#0F0F13] border border-white/10 rounded-2xl p-5 space-y-4">
              <div>
                <label className="text-xs text-[#A0A0AB] uppercase tracking-widest mb-1.5 block">Your Name / Username</label>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="@yourusername"
                  data-testid="username-input"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#50505C] focus:border-[#9D4CDD]/50 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-[#A0A0AB] uppercase tracking-widest mb-1.5 block">Current Bio (optional)</label>
                <textarea
                  value={currentBio}
                  onChange={e => setCurrentBio(e.target.value)}
                  placeholder="Paste your current bio here..."
                  rows={3}
                  data-testid="current-bio-input"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#50505C] focus:border-[#9D4CDD]/50 outline-none transition-all resize-none"
                />
              </div>
            </div>

            {/* Style */}
            <div className="bg-[#0F0F13] border border-white/10 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-3">Bio Style</h3>
              <div className="flex flex-wrap gap-2">
                {STYLES.map(s => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    data-testid={`style-${s}`}
                    className={`px-3 py-1.5 rounded-xl text-sm capitalize transition-all ${
                      style === s
                        ? "bg-[#9D4CDD]/15 border border-[#9D4CDD]/50 text-white"
                        : "bg-[#1A1A24] border border-white/10 text-[#A0A0AB] hover:text-white"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {error && <p data-testid="optimizer-error" className="text-red-400 text-sm bg-red-400/10 px-4 py-3 rounded-xl border border-red-400/20">{error}</p>}

            <button
              onClick={optimize}
              disabled={loading}
              data-testid="optimize-btn"
              className="w-full py-3.5 rounded-xl bg-[#9D4CDD] text-white font-bold hover:bg-[#B060EE] hover:shadow-[0_0_25px_rgba(157,76,221,0.4)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><RefreshCw size={18} className="animate-spin" /> Analyzing with AI...</>
              ) : (
                <><Sparkles size={18} /> Optimize Profile</>
              )}
            </button>
          </div>

          {/* Right: Results */}
          <div className="space-y-5">
            {!result && !loading && (
              <div className="bg-[#0F0F13] border border-white/10 rounded-2xl p-8 text-center min-h-80 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-[#9D4CDD]/10 border border-[#9D4CDD]/20 flex items-center justify-center mb-4">
                  <Sparkles size={28} className="text-[#9D4CDD]" />
                </div>
                <p className="text-white font-semibold mb-2">AI Profile Optimizer</p>
                <p className="text-[#70707C] text-sm max-w-xs">Fill in your details and let Gemini AI craft the perfect bio, hashtags, and profile tips for you.</p>
              </div>
            )}

            {loading && (
              <div className="bg-[#0F0F13] border border-[#9D4CDD]/30 rounded-2xl p-8 text-center min-h-80 flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full border-2 border-[#9D4CDD] border-t-transparent animate-spin mb-4" />
                <p className="text-white font-semibold">Gemini is crafting your profile...</p>
                <p className="text-[#70707C] text-sm mt-1">Analyzing your style and platform</p>
              </div>
            )}

            {result && (
              <div data-testid="optimizer-result" className="space-y-4">
                {/* Bio Result */}
                <div className="bg-[#0F0F13] border border-[#9D4CDD]/30 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-semibold">Optimized Bio</h3>
                    <button
                      onClick={copyBio}
                      data-testid="copy-bio-btn"
                      className="flex items-center gap-1.5 text-xs text-[#9D4CDD] hover:text-white transition-colors"
                    >
                      {copied ? <CheckCircle size={13} className="text-[#00FF9D]" /> : <Copy size={13} />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p data-testid="generated-bio" className="text-white text-sm leading-relaxed bg-[#1A1A24] rounded-xl p-4 border border-white/5">
                    {result.result?.bio || "Bio generation failed"}
                  </p>
                  {result.result?.bio && (
                    <p className="text-[#70707C] text-xs mt-2 text-right">
                      {result.result.bio.length} / {selectedPlatform?.limit || 150} chars
                    </p>
                  )}
                </div>

                {/* Hashtags */}
                {result.result?.hashtags?.length > 0 && (
                  <div className="bg-[#0F0F13] border border-white/10 rounded-2xl p-5">
                    <h3 className="text-white font-semibold mb-3">Recommended Hashtags</h3>
                    <div className="flex flex-wrap gap-2">
                      {result.result.hashtags.map((tag, i) => (
                        <span key={i} className="px-3 py-1 rounded-full bg-[#9D4CDD]/10 border border-[#9D4CDD]/30 text-[#9D4CDD] text-xs">
                          #{tag.replace(/^#/, "")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tips */}
                {result.result?.tips?.length > 0 && (
                  <div className="bg-[#0F0F13] border border-white/10 rounded-2xl p-5">
                    <h3 className="text-white font-semibold mb-3">Growth Tips</h3>
                    <div className="space-y-2">
                      {result.result.tips.map((tip, i) => (
                        <div key={i} className="flex gap-3 p-3 rounded-xl bg-[#1A1A24]">
                          <div className="w-5 h-5 rounded-full bg-[#9D4CDD]/20 flex items-center justify-center text-[#9D4CDD] text-xs font-bold flex-shrink-0">{i + 1}</div>
                          <p className="text-[#A0A0AB] text-sm">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Photo Tips */}
                {result.image_tips?.length > 0 && (
                  <div className="bg-[#0F0F13] border border-white/10 rounded-2xl p-5">
                    <h3 className="text-white font-semibold mb-3">Photo Enhancement Tips</h3>
                    {result.image_tips.map((tip, i) => (
                      <p key={i} className="text-[#A0A0AB] text-sm bg-[#1A1A24] rounded-xl p-3">{tip}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
