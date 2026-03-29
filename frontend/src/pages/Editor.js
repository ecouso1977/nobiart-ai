import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import axios from "axios";
import { Upload, Download, Wand2, Sparkles, RefreshCw, Save, ZoomIn, ZoomOut, Trash2, Video, ChevronDown, ChevronUp, Sliders, Image as ImageIcon, X } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// 20+ Named Filters
const FILTERS = [
  // Cinematic & Professional
  { id: "none", name: "Original", category: "Original", filter: "none", preview: "#888" },
  { id: "neon_noir", name: "Neon Noir", category: "Cinematic", filter: "contrast(1.6) brightness(0.75) saturate(1.8) hue-rotate(200deg)", preview: "#1a1a3e" },
  { id: "golden_hour", name: "Golden Hour", category: "Cinematic", filter: "brightness(1.12) sepia(0.45) saturate(1.6) contrast(1.1)", preview: "#8B5E3C" },
  { id: "nordic_cold", name: "Nordic Cold", category: "Cinematic", filter: "saturate(0.6) hue-rotate(175deg) brightness(1.15) contrast(1.05)", preview: "#4a7fa5" },
  { id: "analog_35mm", name: "Analog 35mm", category: "Cinematic", filter: "sepia(0.35) contrast(1.12) brightness(0.92) saturate(0.9)", preview: "#8a6a50" },
  { id: "hdr_crisp", name: "HDR Crisp", category: "Cinematic", filter: "contrast(1.35) brightness(1.08) saturate(1.25)", preview: "#3a9bd5" },
  { id: "cyberpunk_glow", name: "Cyberpunk Glow", category: "Cinematic", filter: "contrast(1.5) hue-rotate(265deg) saturate(2) brightness(0.85)", preview: "#7b00ff" },
  { id: "vintage_film", name: "Vintage Film", category: "Cinematic", filter: "sepia(0.65) brightness(0.9) contrast(1.08) saturate(0.85)", preview: "#c09060" },
  { id: "cinematic_grain", name: "Cinematic Grain", category: "Cinematic", filter: "contrast(1.25) brightness(0.92) saturate(0.85) grayscale(0.1)", preview: "#666" },
  // Artistic & Stylized
  { id: "glitch_vhs", name: "Glitch VHS", category: "Artistic", filter: "hue-rotate(20deg) saturate(1.8) contrast(1.3) brightness(0.9)", preview: "#ff3388" },
  { id: "pop_art", name: "Pop Art Halftone", category: "Artistic", filter: "saturate(3.5) contrast(1.7) brightness(1.15)", preview: "#ff0066" },
  { id: "pastel_dream", name: "Pastel Dream", category: "Artistic", filter: "brightness(1.25) saturate(0.65) contrast(0.88) opacity(0.95)", preview: "#f5c8e0" },
  { id: "gothic_mono", name: "Gothic Monochrome", category: "Artistic", filter: "grayscale(1) contrast(1.7) brightness(0.75)", preview: "#222" },
  { id: "cyber_edge", name: "Cyber-Edge", category: "Artistic", filter: "brightness(0.75) contrast(1.6) saturate(1.8) hue-rotate(285deg)", preview: "#003366" },
  { id: "soft_focus", name: "Soft Focus", category: "Artistic", filter: "brightness(1.1) saturate(0.9) contrast(0.85) blur(1px)", preview: "#c8b0d0" },
  // Social Media Ready
  { id: "y2k_sparkle", name: "Y2K Sparkle", category: "Social", filter: "brightness(1.2) saturate(1.5) contrast(1.15) hue-rotate(15deg)", preview: "#ff99cc" },
  { id: "sunset_gradient", name: "Sunset Gradient", category: "Social", filter: "hue-rotate(340deg) saturate(1.4) brightness(1.08) contrast(1.05)", preview: "#ff6b35" },
  { id: "vogue_studio", name: "Vogue Studio", category: "Social", filter: "brightness(1.25) contrast(1.25) saturate(1.15)", preview: "#f5e0c0" },
  { id: "lofi_warmth", name: "Lo-Fi Warmth", category: "Social", filter: "sepia(0.45) brightness(1.08) contrast(0.92) saturate(0.88)", preview: "#c8905a" },
  { id: "holographic", name: "Holographic Foil", category: "Social", filter: "hue-rotate(240deg) saturate(2.2) brightness(1.15) contrast(1.15)", preview: "#a040ff" },
  { id: "hdp_pop", name: "HDR Pop", category: "Social", filter: "saturate(1.8) contrast(1.4) brightness(1.1)", preview: "#2ecc71" },
];

const CATEGORY_ORDER = ["Original", "Cinematic", "Artistic", "Social"];

const DEFAULT_ADJUSTMENTS = { brightness: 100, contrast: 100, saturation: 100, sharpness: 0, temperature: 0, vignette: 0 };

function buildFilterString(filter, adjustments) {
  if (filter === "none") {
    return `brightness(${adjustments.brightness / 100}) contrast(${adjustments.contrast / 100}) saturate(${adjustments.saturation / 100})`;
  }
  return `${filter} brightness(${adjustments.brightness / 100}) contrast(${adjustments.contrast / 100}) saturate(${adjustments.saturation / 100})`;
}

export default function Editor() {
  const location = useLocation();
  const [image, setImage] = useState(null);
  const [imagePath, setImagePath] = useState(null);
  const [imageB64, setImageB64] = useState(null);
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [adjustments, setAdjustments] = useState(DEFAULT_ADJUSTMENTS);
  const [activeCategory, setActiveCategory] = useState("Original");
  const [activeTool, setActiveTool] = useState("filters"); // filters | adjustments | ai
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(1);
  const imgRef = useRef();
  const fileRef = useRef();

  const filterStr = buildFilterString(activeFilter.filter, adjustments);

  // Load template if coming from Templates page
  useEffect(() => {
    if (location.state?.template) {
      const t = location.state.template;
      setAiPrompt(`Create a ${t.name} style image for ${t.platform}, ${t.category} category`);
    }
  }, [location.state]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImage(ev.target.result);
      setImageB64(ev.target.result.split(",")[1]);
    };
    reader.readAsDataURL(file);

    // Upload to server
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await axios.post(`${API}/upload`, fd, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" }
      });
      setImagePath(data.path);
    } catch (e) {
      console.error("Upload error:", e);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleFileUpload({ target: { files: [file] } });
    }
  };

  const downloadImage = () => {
    if (!imgRef.current) return;
    const canvas = document.createElement("canvas");
    const img = imgRef.current;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.filter = filterStr;
    ctx.drawImage(img, 0, 0);
    const link = document.createElement("a");
    link.download = `retouchfly-${activeFilter.name.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const generateAiImage = async () => {
    if (!aiPrompt.trim()) { setAiError("Enter a prompt"); return; }
    setAiLoading(true);
    setAiError("");
    try {
      const payload = { prompt: aiPrompt };
      if (imageB64) payload.reference_image_b64 = imageB64;
      const { data } = await axios.post(`${API}/generate/image`, payload, { withCredentials: true });
      const dataUrl = `data:${data.mime_type};base64,${data.image_b64}`;
      setImage(dataUrl);
      setImageB64(data.image_b64);
      setImagePath(data.path);
      setActiveFilter(FILTERS[0]);
      setAdjustments(DEFAULT_ADJUSTMENTS);
    } catch (e) {
      setAiError(e.response?.data?.detail || "AI generation failed");
    } finally {
      setAiLoading(false);
    }
  };

  const saveProject = async () => {
    if (!image) return;
    setSaving(true);
    try {
      await axios.post(`${API}/projects`, {
        title: `${activeFilter.name} Edit`,
        type: "image",
        filter_applied: activeFilter.name !== "Original" ? activeFilter.name : null,
        storage_path: imagePath,
        thumbnail: image.startsWith("data:") ? null : image
      }, { withCredentials: true });
    } catch (e) {
      console.error("Save error:", e);
    } finally {
      setSaving(false);
    }
  };

  const resetAdjustments = () => setAdjustments(DEFAULT_ADJUSTMENTS);

  const categorized = CATEGORY_ORDER.map(cat => ({
    cat,
    filters: FILTERS.filter(f => f.category === cat)
  })).filter(g => g.filters.length > 0);

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Navbar />
      <div className="flex-1 md:ml-64 flex flex-col h-screen overflow-hidden">
        {/* Top Toolbar */}
        <div className="bg-[#0F0F13] border-b border-white/10 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              data-testid="upload-image-btn"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A1A24] border border-white/10 text-white text-sm hover:bg-[#252530] transition-all"
            >
              <Upload size={14} className="text-[#FF007A]" />
              {uploading ? "Uploading..." : "Upload"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            {image && (
              <>
                <button onClick={() => setZoom(z => Math.min(z + 0.25, 3))} className="p-2 rounded-xl bg-[#1A1A24] border border-white/10 text-[#A0A0AB] hover:text-white transition-all">
                  <ZoomIn size={15} />
                </button>
                <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))} className="p-2 rounded-xl bg-[#1A1A24] border border-white/10 text-[#A0A0AB] hover:text-white transition-all">
                  <ZoomOut size={15} />
                </button>
                <span className="text-[#70707C] text-xs">{Math.round(zoom * 100)}%</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {image && (
              <>
                <button
                  onClick={saveProject}
                  disabled={saving}
                  data-testid="save-project-btn"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A1A24] border border-white/10 text-white text-sm hover:bg-[#252530] transition-all disabled:opacity-50"
                >
                  <Save size={14} className="text-[#00E5FF]" />
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={downloadImage}
                  data-testid="download-btn"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF007A] text-white text-sm font-medium hover:bg-[#FF3399] hover:shadow-[0_0_15px_rgba(255,0,122,0.3)] transition-all"
                >
                  <Download size={14} />
                  Export
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Tools */}
          <div className="w-72 bg-[#0F0F13] border-r border-white/10 flex flex-col overflow-hidden flex-shrink-0">
            {/* Tool Tabs */}
            <div className="flex border-b border-white/10">
              {[
                { id: "filters", label: "Filters", icon: ImageIcon },
                { id: "adjustments", label: "Adjust", icon: Sliders },
                { id: "ai", label: "AI Gen", icon: Wand2 },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTool(id)}
                  data-testid={`tool-tab-${id}`}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-all ${
                    activeTool === id
                      ? "text-white border-b-2 border-[#FF007A]"
                      : "text-[#70707C] hover:text-[#A0A0AB]"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>

            {/* Filters Panel */}
            {activeTool === "filters" && (
              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {categorized.map(({ cat, filters }) => (
                  <div key={cat}>
                    <button
                      onClick={() => setActiveCategory(activeCategory === cat ? "" : cat)}
                      className="flex items-center justify-between w-full text-xs text-[#70707C] uppercase tracking-widest mb-2 hover:text-[#A0A0AB] transition-colors"
                    >
                      <span>{cat}</span>
                      {activeCategory === cat ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    {(activeCategory === cat || cat === "Original") && (
                      <div className="grid grid-cols-2 gap-2">
                        {filters.map(f => (
                          <button
                            key={f.id}
                            onClick={() => setActiveFilter(f)}
                            data-testid={`filter-${f.id}`}
                            className={`group relative rounded-xl overflow-hidden transition-all duration-200 ${
                              activeFilter.id === f.id
                                ? "ring-2 ring-[#FF007A] shadow-[0_0_15px_rgba(255,0,122,0.3)]"
                                : "hover:ring-1 hover:ring-white/30"
                            }`}
                          >
                            <div className="aspect-square relative overflow-hidden">
                              {image ? (
                                <img
                                  src={image}
                                  alt={f.name}
                                  className="w-full h-full object-cover"
                                  style={{ filter: f.filter === "none" ? "none" : f.filter }}
                                />
                              ) : (
                                <div
                                  className="w-full h-full"
                                  style={{ backgroundColor: f.preview, filter: f.filter === "none" ? "none" : f.filter }}
                                />
                              )}
                            </div>
                            <div className={`absolute bottom-0 left-0 right-0 px-1.5 py-1 text-center ${activeFilter.id === f.id ? "bg-[#FF007A]" : "bg-black/70"}`}>
                              <span className="text-white text-[9px] font-semibold leading-tight block truncate">{f.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Adjustments Panel */}
            {activeTool === "adjustments" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-sm font-semibold">Adjustments</span>
                  <button onClick={resetAdjustments} className="text-[#FF007A] text-xs hover:text-[#FF3399] transition-colors flex items-center gap-1">
                    <RefreshCw size={10} /> Reset
                  </button>
                </div>
                {[
                  { key: "brightness", label: "Brightness", min: 0, max: 200 },
                  { key: "contrast", label: "Contrast", min: 0, max: 200 },
                  { key: "saturation", label: "Saturation", min: 0, max: 300 },
                ].map(({ key, label, min, max }) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-[#A0A0AB]">{label}</label>
                      <span className="text-xs text-[#FF007A] font-mono">{adjustments[key]}</span>
                    </div>
                    <input
                      type="range" min={min} max={max}
                      value={adjustments[key]}
                      onChange={e => setAdjustments(a => ({ ...a, [key]: parseInt(e.target.value) }))}
                      data-testid={`adjust-${key}`}
                      className="w-full accent-[#FF007A]"
                    />
                  </div>
                ))}

                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-[#70707C] mb-3 uppercase tracking-widest">Active Filter</p>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#1A1A24] border border-white/5">
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                      {image ? (
                        <img src={image} alt="preview" className="w-full h-full object-cover" style={{ filter: activeFilter.filter }} />
                      ) : (
                        <div className="w-full h-full" style={{ backgroundColor: activeFilter.preview }} />
                      )}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{activeFilter.name}</p>
                      <p className="text-[#70707C] text-xs">{activeFilter.category}</p>
                    </div>
                    {activeFilter.id !== "none" && (
                      <button onClick={() => setActiveFilter(FILTERS[0])} className="ml-auto text-[#50505C] hover:text-[#FF007A] transition-colors">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* AI Generation Panel */}
            {activeTool === "ai" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={16} className="text-[#E2FF31]" />
                    <span className="text-white text-sm font-semibold">AI Image Generator</span>
                  </div>
                  <p className="text-[#70707C] text-xs mb-3">Powered by Gemini Nano Banana. {image ? "Describe edits to enhance current image." : "Describe any image to generate it."}</p>

                  <textarea
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    placeholder={image ? "e.g. Make it look cinematic with neon lighting" : "e.g. A cyberpunk city at night with neon rain"}
                    rows={4}
                    data-testid="ai-prompt-input"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs placeholder-[#50505C] focus:border-[#E2FF31]/40 outline-none transition-all resize-none"
                  />

                  {aiError && <p className="text-red-400 text-xs mt-2 bg-red-400/10 px-3 py-2 rounded-lg">{aiError}</p>}

                  <button
                    onClick={generateAiImage}
                    disabled={aiLoading}
                    data-testid="ai-generate-btn"
                    className="w-full mt-3 py-2.5 rounded-xl bg-[#E2FF31] text-[#050505] font-bold text-sm hover:bg-[#E8FF66] hover:shadow-[0_0_15px_rgba(226,255,49,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {aiLoading ? (
                      <><RefreshCw size={14} className="animate-spin" /> Generating...</>
                    ) : (
                      <><Wand2 size={14} /> {image ? "Enhance with AI" : "Generate Image"}</>
                    )}
                  </button>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-[#70707C] mb-2 uppercase tracking-widest">Quick Styles</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["cyberpunk neon", "golden hour portrait", "minimalist studio", "vintage film grain", "dreamy pastel", "bold product shot"].map(s => (
                      <button
                        key={s}
                        onClick={() => setAiPrompt(image ? `${s} style edit` : s)}
                        className="px-2.5 py-1 rounded-lg bg-[#1A1A24] border border-white/10 text-[#A0A0AB] text-xs hover:text-white hover:border-[#E2FF31]/30 transition-all"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Center Canvas */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden bg-[#0a0a0f] relative"
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            data-testid="editor-canvas"
          >
            {!image ? (
              <div className="text-center">
                <div
                  className="w-72 h-64 border-2 border-dashed border-white/20 rounded-3xl flex flex-col items-center justify-center mb-6 hover:border-[#FF007A]/40 hover:bg-[#FF007A]/5 transition-all cursor-pointer"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={36} className="text-[#50505C] mb-3" />
                  <p className="text-white font-semibold mb-1">Drop your image here</p>
                  <p className="text-[#70707C] text-sm">or click to browse</p>
                  <p className="text-[#50505C] text-xs mt-3">PNG, JPG, WEBP · Up to 10MB</p>
                </div>
                <p className="text-[#50505C] text-sm">or use AI to generate one →</p>
              </div>
            ) : (
              <div
                className="relative transition-transform duration-300"
                style={{ transform: `scale(${zoom})` }}
              >
                <img
                  ref={imgRef}
                  src={image}
                  alt="Editing"
                  data-testid="canvas-image"
                  className="max-w-full max-h-[calc(100vh-200px)] object-contain rounded-xl shadow-2xl"
                  style={{ filter: filterStr }}
                  crossOrigin="anonymous"
                />
                {/* Filter name overlay */}
                {activeFilter.id !== "none" && (
                  <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm text-[#FF007A] text-xs font-semibold px-3 py-1.5 rounded-full border border-[#FF007A]/30">
                    {activeFilter.name}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar - Properties */}
          <div className="w-60 bg-[#0F0F13] border-l border-white/10 flex flex-col overflow-y-auto flex-shrink-0 p-4 space-y-4">
            <h3 className="text-white font-semibold text-sm">Properties</h3>

            {image && (
              <>
                {/* Current Filter Info */}
                <div className="bg-[#1A1A24] rounded-xl p-3 border border-white/5">
                  <p className="text-[#70707C] text-xs uppercase tracking-widest mb-2">Active Filter</p>
                  <p className="text-white text-sm font-semibold">{activeFilter.name}</p>
                  <p className="text-[#FF007A] text-xs">{activeFilter.category}</p>
                </div>

                {/* Export Options */}
                <div className="space-y-2">
                  <p className="text-[#70707C] text-xs uppercase tracking-widest">Export</p>
                  <button onClick={downloadImage} data-testid="export-png-btn" className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FF007A]/10 border border-[#FF007A]/25 text-[#FF007A] text-sm hover:bg-[#FF007A]/20 transition-all">
                    <Download size={14} /> Export PNG
                  </button>
                </div>

                {/* Send to Video */}
                <div className="space-y-2">
                  <p className="text-[#70707C] text-xs uppercase tracking-widest">Actions</p>
                  <a
                    href="/video"
                    data-testid="send-to-video-btn"
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/25 text-[#00E5FF] text-sm hover:bg-[#00E5FF]/20 transition-all"
                  >
                    <Video size={14} /> Generate Video
                  </a>
                  <button
                    onClick={() => { setImage(null); setImageB64(null); setImagePath(null); setActiveFilter(FILTERS[0]); setAdjustments(DEFAULT_ADJUSTMENTS); }}
                    data-testid="clear-canvas-btn"
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1A1A24] border border-white/10 text-[#70707C] text-sm hover:text-white hover:border-white/20 transition-all"
                  >
                    <Trash2 size={14} /> Clear Canvas
                  </button>
                </div>

                {/* Keyboard Shortcuts */}
                <div className="bg-[#1A1A24] rounded-xl p-3 border border-white/5">
                  <p className="text-[#70707C] text-xs uppercase tracking-widest mb-2">Tips</p>
                  <div className="space-y-1.5 text-xs text-[#70707C]">
                    <p>• Drag & drop images</p>
                    <p>• Click filters to preview</p>
                    <p>• Use AI tab to generate</p>
                    <p>• Export applies filters</p>
                  </div>
                </div>
              </>
            )}

            {!image && (
              <div className="text-center py-8">
                <ImageIcon size={24} className="text-[#50505C] mx-auto mb-2" />
                <p className="text-[#70707C] text-xs">Upload an image to see properties</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
