import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import axios from "axios";
import { Search, ChevronRight, Maximize2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLATFORMS = [
  { id: "all", label: "All" },
  { id: "instagram_reels", label: "Instagram Reels" },
  { id: "instagram_post", label: "Instagram Post" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "twitter", label: "X (Twitter)" },
];

const PLATFORM_COLORS = {
  instagram_reels: "#E1306C",
  instagram_post: "#E1306C",
  tiktok: "#ff0050",
  youtube: "#FF0000",
  linkedin: "#0077B5",
  twitter: "#1DA1F2",
};

export default function Templates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [platform, setPlatform] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/templates`, { withCredentials: true })
      .then(r => { setTemplates(r.data); setFiltered(r.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let list = templates;
    if (platform !== "all") list = list.filter(t => t.platform === platform);
    if (search) list = list.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()));
    setFiltered(list);
  }, [platform, search, templates]);

  const applyTemplate = (t) => {
    navigate("/editor", { state: { template: t } });
  };

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Navbar />
      <main className="flex-1 md:ml-64 p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Unbounded, sans-serif' }}>
            Template <span className="text-[#FF007A]">Library</span>
          </h1>
          <p className="text-[#A0A0AB] text-sm">Polished, platform-ready templates. Pick one, customize it, go viral.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#50505C]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search templates..."
              data-testid="template-search"
              className="w-full bg-[#0F0F13] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-[#50505C] focus:border-[#FF007A]/50 outline-none transition-all"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                data-testid={`platform-filter-${p.id}`}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                  platform === p.id
                    ? "bg-[#FF007A]/10 text-white border border-[#FF007A]/40"
                    : "bg-[#0F0F13] text-[#A0A0AB] border border-white/10 hover:border-white/20 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-[#0F0F13] border border-white/10 rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-[3/4] bg-[#1A1A24]" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-[#1A1A24] rounded w-3/4" />
                  <div className="h-2 bg-[#1A1A24] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#70707C] text-lg">No templates found</p>
            <p className="text-[#50505C] text-sm mt-1">Try a different filter or search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5" data-testid="templates-grid">
            {filtered.map(t => (
              <div
                key={t.id}
                data-testid={`template-card-${t.id}`}
                className="group bg-[#0F0F13] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                onClick={() => applyTemplate(t)}
              >
                <div className={`relative overflow-hidden ${t.aspect_ratio === "9:16" ? "aspect-[9/16]" : t.aspect_ratio === "16:9" ? "aspect-video" : "aspect-square"}`}>
                  <img
                    src={t.thumbnail}
                    alt={t.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                    <button
                      data-testid={`use-template-${t.id}`}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FF007A] text-white text-xs font-semibold shadow-lg"
                    >
                      Use Template <ChevronRight size={12} />
                    </button>
                  </div>
                  {/* Platform Badge */}
                  <div
                    className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-white text-[10px] font-bold"
                    style={{ backgroundColor: PLATFORM_COLORS[t.platform] || "#FF007A" }}
                  >
                    {t.platform.replace("_", " ").toUpperCase().slice(0, 2)}
                  </div>
                  {/* Dimensions */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded">
                    <Maximize2 size={9} />
                    {t.dimensions}
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-white text-sm font-semibold truncate">{t.name}</p>
                  <p className="text-[#70707C] text-xs mt-0.5">{t.category} · {t.aspect_ratio}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
