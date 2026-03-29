# SenGuard - PRD

## App Overview
**SenGuard** — Premium AI photo/image enhancer, editor, video generator, and automated social media management platform. Fun, snappy brand — "Canva meets professional Adobe tools."

**URL**: https://photo-studio-ai-4.preview.emergentagent.com

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python) on port 8001
- **Database**: MongoDB (senguard_db)
- **AI**: Google Gemini (image gen), Google Veo (video gen), google-generativeai (profile optimizer)
- **Storage**: Emergent Object Storage
- **Auth**: JWT httpOnly cookies

## User Personas
1. Content creators wanting quick social media assets
2. Marketers needing professional retouches
3. Individuals wanting fun photo edits
4. Presenters needing polished visuals

## What's Been Implemented (March 2024)

### Backend (/app/backend/server.py)
- ✅ JWT auth (register, login, logout, me) with bcrypt
- ✅ Admin seeding (admin@senguard.com)
- ✅ File upload to Emergent Object Storage
- ✅ File serving from storage
- ✅ AI Image Generation (Gemini Nano Banana via emergentintegrations)
- ✅ Video Generation (Google Veo via google-genai, async polling)
- ✅ Profile Optimizer (Gemini 1.5 Flash for bio + tips)
- ✅ Social Scheduler CRUD (MongoDB-backed)
- ✅ Templates API (16 hardcoded templates)
- ✅ Projects CRUD
- ✅ Stats endpoint

### Frontend (8 pages)
- ✅ Landing Page (auth modal with login/register, feature cards)
- ✅ Dashboard (stats, quick actions, recent projects)
- ✅ Image Editor (3-pane: tools sidebar, canvas, properties) - 20+ CSS filters
- ✅ Video Generator (Veo integration with animation presets)
- ✅ Template Library (16 templates, platform filtering)
- ✅ Social Scheduler (calendar view, post creation modal)
- ✅ Profile Optimizer (AI bio + hashtags + tips)
- ✅ Navbar with all routes

### Filters (20+)
Neon Noir, Golden Hour, Nordic Cold, Analog 35mm, HDR Crisp, Cyberpunk Glow, Vintage Film, Cinematic Grain (Cinematic), Glitch VHS, Pop Art Halftone, Pastel Dream, Gothic Monochrome, Cyber-Edge, Soft Focus (Artistic), Y2K Sparkle, Sunset Gradient, Vogue Studio, Lo-Fi Warmth, Holographic Foil, HDR Pop (Social)

## Credentials
- Admin: admin@senguard.com / SenGuard2024!
- Gemini API Key: AIzaSyDZdo90XSgVR6oiiENjtmw-l9LZAcgmuqw
- Emergent LLM Key: sk-emergent-f251058F771Aa4c927 (for image gen + storage)

## P0 Backlog (Next Sprint)
- [ ] Meta/Instagram OAuth (real posting, not mocked)
- [ ] Persist Veo video jobs in MongoDB (currently in-memory)
- [ ] Real background removal (fal.ai Remove.bg API)
- [ ] AI skin smoothing filter
- [ ] Template editor (customize templates)

## P1 Features
- [ ] Google OAuth login (Emergent-managed)
- [ ] Profile picture AI enhancement (actual image editing, not just tips)
- [ ] Export to different formats (WebP, JPEG quality)
- [ ] Bulk scheduling (multiple posts at once)
- [ ] Analytics dashboard

## P2 Features
- [ ] TikTok/LinkedIn/Twitter OAuth
- [ ] Collaboration features
- [ ] Custom filter creator
- [ ] AI caption generation for scheduled posts
