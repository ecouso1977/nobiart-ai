import { useState, useRef, useEffect } from "react";
import Navbar from "@/components/Navbar";
import axios from "axios";
import { Video, Upload, Play, Clock, CheckCircle, XCircle, Sparkles, Image, Loader, Download } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ANIMATION_PRESETS = [
  { id: "parallax", name: "Parallax Depth", desc: "3D dolly zoom — subject forward, bg backward", prompt: "slow 3D dolly zoom, subject gets closer while background pushes away, cinematic depth effect" },
  { id: "ripple", name: "Prism Ripple", desc: "Liquid glass ripple around the edges", prompt: "subtle liquid glass ripple distortion continuously moving around outer edges, ethereal effect" },
  { id: "leaks", name: "Light Leaks", desc: "Colorful lens flares dancing across screen", prompt: "colorful optical lens flares dancing and sweeping across the frame, cinematic light leaks" },
  { id: "pulse", name: "Cinematic Pulse", desc: "Background breathing zoom, subject still", prompt: "subject perfectly still, background has rhythmic subtle breathing zoom effect, hypnotic motion" },
  { id: "crt", name: "Retro CRT Flick", desc: "Old TV turn-on/off animation", prompt: "old tube TV turning on with expanding white line and static, retro CRT flicker effect" },
  { id: "custom", name: "Custom Prompt", desc: "Write your own video prompt", prompt: "" },
];

export default function VideoGenerator() {
  const [image, setImage] = useState(null);
  const [imageB64, setImageB64] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [duration, setDuration] = useState(8);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();
  const pollRef = useRef();

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImage(ev.target.result);
      const b64 = ev.target.result.split(",")[1];
      setImageB64(b64);
    };
    reader.readAsDataURL(file);
  };

  const selectPreset = (preset) => {
    setSelectedPreset(preset.id);
    if (preset.id !== "custom") setPrompt(preset.prompt);
  };

  const generate = async () => {
    if (!prompt.trim()) { setError("Please enter a prompt or select a preset"); return; }
    setError("");
    setLoading(true);
    setJobStatus(null);
    setJobId(null);
    try {
      const { data } = await axios.post(`${API}/generate/video`, {
        prompt,
        image_b64: imageB64,
        aspect_ratio: aspectRatio,
        duration
      }, { withCredentials: true });

      setJobId(data.job_id);
      setJobStatus({ status: data.status });
      if (data.status === "processing") startPolling(data.job_id);
    } catch (e) {
      setError(e.response?.data?.detail || "Video generation failed");
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (id) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await axios.get(`${API}/generate/video/status/${id}`, { withCredentials: true });
        setJobStatus(data);
        if (data.status !== "processing") clearInterval(pollRef.current);
      } catch (e) {
        clearInterval(pollRef.current);
      }
    }, 8000);
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Navbar />
      <main className="flex-1 md:ml-64 p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Unbounded, sans-serif' }}>
            Video <span className="text-[#00E5FF]">Generator</span>
          </h1>
          <p className="text-[#A0A0AB] text-sm">Transform photos into stunning 8-second videos powered by Google Veo AI.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Config */}
          <div className="space-y-5">
            {/* Image Upload */}
            <div className="bg-[#0F0F13] border border-white/10 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Image size={16} className="text-[#00E5FF]" /> Base Image (optional)
              </h3>
              {image ? (
                <div className="relative rounded-xl overflow-hidden">
                  <img src={image} alt="Base" className="w-full max-h-48 object-cover" />
                  <button
                    onClick={() => { setImage(null); setImageB64(null); }}
                    className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg hover:bg-black/80 transition-all"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  data-testid="video-image-upload-btn"
                  className="w-full border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-[#00E5FF]/40 hover:bg-[#00E5FF]/5 transition-all group"
                >
                  <Upload size={24} className="mx-auto mb-2 text-[#50505C] group-hover:text-[#00E5FF] transition-colors" />
                  <p className="text-[#70707C] text-sm">Upload image to animate it</p>
                  <p className="text-[#50505C] text-xs mt-1">or leave empty for text-to-video</p>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>

            {/* Animation Presets */}
            <div className="bg-[#0F0F13] border border-white/10 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Sparkles size={16} className="text-[#E2FF31]" /> Animation Style
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {ANIMATION_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => selectPreset(preset)}
                    data-testid={`preset-${preset.id}`}
                    className={`p-3 rounded-xl text-left transition-all ${
                      selectedPreset === preset.id
                        ? "bg-[#00E5FF]/10 border border-[#00E5FF]/40 shadow-[0_0_15px_rgba(0,229,255,0.1)]"
                        : "bg-[#1A1A24] border border-white/5 hover:border-white/15"
                    }`}
                  >
                    <p className="text-white text-xs font-semibold">{preset.name}</p>
                    <p className="text-[#70707C] text-[10px] mt-0.5 leading-tight">{preset.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt */}
            <div className="bg-[#0F0F13] border border-white/10 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Video size={16} className="text-[#FF007A]" /> Video Prompt
              </h3>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Describe the motion and animation you want..."
                data-testid="video-prompt-input"
                rows={3}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-[#50505C] focus:border-[#00E5FF]/50 outline-none transition-all resize-none"
              />
            </div>

            {/* Settings */}
            <div className="bg-[#0F0F13] border border-white/10 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#A0A0AB] uppercase tracking-widest mb-1.5 block">Aspect Ratio</label>
                  <select
                    value={aspectRatio}
                    onChange={e => setAspectRatio(e.target.value)}
                    data-testid="aspect-ratio-select"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-[#00E5FF]/50 outline-none"
                  >
                    <option value="9:16">9:16 (Portrait)</option>
                    <option value="16:9">16:9 (Landscape)</option>
                    <option value="1:1">1:1 (Square)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#A0A0AB] uppercase tracking-widest mb-1.5 block">Duration: {duration}s</label>
                  <input
                    type="range" min="4" max="8" step="2"
                    value={duration}
                    onChange={e => setDuration(parseInt(e.target.value))}
                    data-testid="duration-slider"
                    className="w-full accent-[#00E5FF] mt-2"
                  />
                </div>
              </div>
            </div>

            {error && (
              <p data-testid="video-error" className="text-red-400 text-sm bg-red-400/10 px-4 py-3 rounded-xl border border-red-400/20">
                {error}
              </p>
            )}

            <button
              onClick={generate}
              disabled={loading || jobStatus?.status === "processing"}
              data-testid="generate-video-btn"
              className="w-full py-3.5 rounded-xl bg-[#00E5FF] text-[#050505] font-bold hover:bg-[#33EEFF] hover:shadow-[0_0_25px_rgba(0,229,255,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader size={18} className="animate-spin" /> Initiating Veo...</>
              ) : (
                <><Video size={18} /> Generate Video with Veo</>
              )}
            </button>
          </div>

          {/* Right: Status & Result */}
          <div className="space-y-5">
            {!jobStatus && (
              <div className="bg-[#0F0F13] border border-white/10 rounded-2xl p-8 text-center h-96 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center mx-auto mb-4">
                  <Video size={28} className="text-[#00E5FF]" />
                </div>
                <p className="text-white font-semibold mb-2">Powered by Google Veo</p>
                <p className="text-[#70707C] text-sm max-w-xs">Select an animation style and click Generate. Veo will create a stunning 8-second video clip for you.</p>
              </div>
            )}

            {jobStatus?.status === "processing" && (
              <div data-testid="video-processing" className="bg-[#0F0F13] border border-[#00E5FF]/30 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 rounded-full border-2 border-[#00E5FF] border-t-transparent animate-spin mx-auto mb-6" />
                <p className="text-white font-semibold text-lg mb-2">Generating your video...</p>
                <p className="text-[#70707C] text-sm">Google Veo is working its magic. This takes 2-5 minutes.</p>
                <div className="flex items-center gap-2 justify-center mt-4 text-[#70707C] text-xs">
                  <Clock size={12} />
                  <span>Job ID: {jobId?.slice(0, 8)}...</span>
                </div>
              </div>
            )}

            {jobStatus?.status === "completed" && (
              <div data-testid="video-completed" className="bg-[#0F0F13] border border-[#00FF9D]/30 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle size={20} className="text-[#00FF9D]" />
                  <span className="text-[#00FF9D] font-semibold">Video Generated!</span>
                </div>
                {jobStatus.video_uri && (
                  <div className="space-y-3">
                    <p className="text-[#70707C] text-xs">Video URI:</p>
                    <p className="text-white text-xs bg-black/50 px-3 py-2 rounded-lg font-mono break-all">{jobStatus.video_uri}</p>
                    <a
                      href={jobStatus.video_uri}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00FF9D]/10 border border-[#00FF9D]/30 text-[#00FF9D] text-sm font-medium hover:bg-[#00FF9D]/20 transition-all"
                    >
                      <Play size={16} /> View Video
                    </a>
                  </div>
                )}
              </div>
            )}

            {jobStatus?.status === "failed" && (
              <div data-testid="video-failed" className="bg-[#0F0F13] border border-red-500/30 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <XCircle size={20} className="text-red-400" />
                  <span className="text-red-400 font-semibold">Generation Failed</span>
                </div>
                <p className="text-[#70707C] text-sm">{jobStatus.error || "An error occurred during video generation."}</p>
                <p className="text-[#50505C] text-xs mt-2">Note: Veo API requires enabled access via Google AI Studio.</p>
              </div>
            )}

            {/* Info Card */}
            <div className="bg-[#0F0F13] border border-white/10 rounded-2xl p-5">
              <h3 className="text-white font-semibold text-sm mb-3">How it works</h3>
              <div className="space-y-3">
                {[
                  { n: "1", t: "Upload or describe", d: "Use an edited photo or just a text prompt" },
                  { n: "2", t: "Choose animation style", d: "Pick from 5 cinematic presets or write your own" },
                  { n: "3", t: "Veo generates", d: "Google Veo AI creates an 8-second high-quality video" },
                  { n: "4", t: "Download & share", d: "Use it in your social media scheduler" },
                ].map(item => (
                  <div key={item.n} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF] text-xs font-bold flex-shrink-0">{item.n}</div>
                    <div>
                      <p className="text-white text-xs font-medium">{item.t}</p>
                      <p className="text-[#70707C] text-xs">{item.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
