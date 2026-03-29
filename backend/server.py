"""
RetouchFly Backend - AI-powered photo editor & social media management
"""
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, File, UploadFile, Depends, BackgroundTasks
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os, logging, uuid, bcrypt, jwt, requests, base64, asyncio, json, re
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from typing import List, Optional, Dict
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Config ---
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
APP_NAME = "retouchfly"
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"

# --- MongoDB ---
mongo_client = AsyncIOMotorClient(MONGO_URL)
db = mongo_client[DB_NAME]

# --- FastAPI ---
app = FastAPI(title="RetouchFly API", version="1.0.0")
api_router = APIRouter(prefix="/api")

CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')
cors_origins = CORS_ORIGINS.split(',') if CORS_ORIGINS != '*' else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Object Storage ---
storage_key = None

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        logger.info("Storage initialized")
    except Exception as e:
        logger.warning(f"Storage init failed: {e}")
    return storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise Exception("Storage not initialized")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple:
    key = init_storage()
    if not key:
        raise Exception("Storage not initialized")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# --- Password Hashing ---
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

# --- JWT ---
def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except (jwt.InvalidTokenError, Exception):
        raise HTTPException(status_code=401, detail="Invalid token")

# --- Pydantic Models ---
class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class GenerateImageRequest(BaseModel):
    prompt: str
    style: Optional[str] = None
    reference_image_b64: Optional[str] = None

class GenerateVideoRequest(BaseModel):
    prompt: str
    image_path: Optional[str] = None
    image_b64: Optional[str] = None
    duration: int = 8
    aspect_ratio: str = "9:16"

class SchedulePostRequest(BaseModel):
    content: str
    platforms: List[str]
    media_paths: Optional[List[str]] = []
    scheduled_at: str
    recurrence: Optional[str] = None

class ProfileOptimizeRequest(BaseModel):
    image_b64: Optional[str] = None
    current_bio: Optional[str] = None
    platform: str = "instagram"
    style: Optional[str] = "professional"
    username: Optional[str] = None

# ===================== AUTH ENDPOINTS =====================

@api_router.post("/auth/register")
async def register(data: UserCreate, response: Response):
    email = data.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user_oid = ObjectId()
    user_id = str(user_oid)
    now = datetime.now(timezone.utc).isoformat()
    await db.users.insert_one({
        "_id": user_oid,
        "name": data.name,
        "email": email,
        "password_hash": hash_password(data.password),
        "role": "user",
        "avatar": None,
        "created_at": now
    })
    token = create_access_token(user_id, email)
    response.set_cookie(key="access_token", value=token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    return {"id": user_id, "name": data.name, "email": email, "role": "user", "avatar": None}

@api_router.post("/auth/login")
async def login(data: UserLogin, response: Response):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user_id = str(user["_id"])
    token = create_access_token(user_id, email)
    response.set_cookie(key="access_token", value=token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    return {"id": user_id, "name": user["name"], "email": email, "role": user.get("role", "user"), "avatar": user.get("avatar")}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def me(current_user: dict = Depends(get_current_user)):
    return current_user

# ===================== FILE UPLOAD =====================

@api_router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if not file.content_type or not file.content_type.startswith(("image/", "video/")):
        raise HTTPException(status_code=400, detail="Only image and video files allowed")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    path = f"{APP_NAME}/uploads/{current_user['_id']}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    try:
        result = put_object(path, data, file.content_type)
        file_id = str(uuid.uuid4())
        await db.files.insert_one({
            "id": file_id,
            "user_id": current_user["_id"],
            "storage_path": result["path"],
            "original_filename": file.filename,
            "content_type": file.content_type,
            "size": len(data),
            "is_deleted": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"file_id": file_id, "path": result["path"], "url": f"/api/files/{result['path']}"}
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        # Return base64 fallback
        b64 = base64.b64encode(data).decode()
        return {"file_id": str(uuid.uuid4()), "path": path, "url": f"data:{file.content_type};base64,{b64}", "fallback": True}

@api_router.get("/files/{path:path}")
async def serve_file(path: str):
    try:
        data, content_type = get_object(path)
        return Response(content=data, media_type=content_type)
    except Exception as e:
        raise HTTPException(status_code=404, detail="File not found")

# ===================== AI IMAGE GENERATION =====================

@api_router.post("/generate/image")
async def generate_image(
    req: GenerateImageRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        style_prefix = f"{req.style} style, " if req.style else ""
        full_prompt = f"{style_prefix}{req.prompt}, highly detailed, professional photo quality, sharp focus"

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"imggen-{uuid.uuid4()}",
            system_message="You are a professional AI image generator creating stunning, high-quality visuals."
        )
        chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])

        if req.reference_image_b64:
            msg = UserMessage(
                text=f"Edit/enhance this image: {full_prompt}",
                file_contents=[ImageContent(req.reference_image_b64)]
            )
        else:
            msg = UserMessage(text=full_prompt)

        text, images = await chat.send_message_multimodal_response(msg)

        if not images:
            raise HTTPException(status_code=500, detail="No image was generated. Try a different prompt.")

        img_b64 = images[0]['data']
        mime_type = images[0].get('mime_type', 'image/png')
        ext = "png" if "png" in mime_type else "jpg"
        path = f"{APP_NAME}/generated/{current_user['_id']}/{uuid.uuid4()}.{ext}"

        try:
            img_bytes = base64.b64decode(img_b64)
            put_object(path, img_bytes, mime_type)
            storage_url = f"/api/files/{path}"
        except Exception:
            storage_url = f"data:{mime_type};base64,{img_b64}"

        return {
            "success": True,
            "image_b64": img_b64,
            "mime_type": mime_type,
            "path": path,
            "url": storage_url,
            "description": text or "Image generated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)[:200]}")

# ===================== VIDEO GENERATION (VEO) =====================

video_jobs: Dict[str, dict] = {}

async def run_veo_generation(job_id: str, prompt: str, image_b64: Optional[str], aspect_ratio: str, duration: int):
    try:
        from google import genai as gai
        from google.genai.types import GenerateVideosConfig

        client = gai.Client(api_key=GEMINI_API_KEY)
        config = GenerateVideosConfig(
            aspect_ratio=aspect_ratio,
            duration_seconds=duration,
            number_of_videos=1,
        )

        loop = asyncio.get_event_loop()

        if image_b64:
            from google.genai.types import Image as GImage
            image = GImage(bytes_base64_encoded=image_b64)
            operation = await loop.run_in_executor(
                None, lambda: client.models.generate_videos(
                    model="veo-2-generate-001",
                    prompt=prompt,
                    image=image,
                    config=config
                )
            )
        else:
            operation = await loop.run_in_executor(
                None, lambda: client.models.generate_videos(
                    model="veo-2-generate-001",
                    prompt=prompt,
                    config=config
                )
            )

        video_jobs[job_id]["operation_name"] = operation.name
        max_wait, elapsed = 360, 0

        while elapsed < max_wait:
            await asyncio.sleep(15)
            elapsed += 15
            try:
                op = await loop.run_in_executor(None, lambda: client.operations.get(operation.name))
                if op.done:
                    if hasattr(op, 'response') and op.response:
                        videos = op.response.generated_videos
                        if videos and len(videos) > 0:
                            video_uri = videos[0].video.uri
                            video_jobs[job_id]["status"] = "completed"
                            video_jobs[job_id]["video_uri"] = video_uri
                            video_jobs[job_id]["completed_at"] = datetime.now(timezone.utc).isoformat()
                            logger.info(f"Video job {job_id} completed")
                            return
                    video_jobs[job_id]["status"] = "failed"
                    video_jobs[job_id]["error"] = "No video in response"
                    return
            except Exception as pe:
                logger.warning(f"Poll error {job_id}: {pe}")

        video_jobs[job_id]["status"] = "failed"
        video_jobs[job_id]["error"] = "Generation timed out"
    except Exception as e:
        video_jobs[job_id]["status"] = "failed"
        video_jobs[job_id]["error"] = str(e)[:300]
        logger.error(f"Veo generation failed: {e}")

@api_router.post("/generate/video")
async def generate_video(
    req: GenerateVideoRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    job_id = str(uuid.uuid4())
    video_jobs[job_id] = {
        "status": "processing",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "prompt": req.prompt,
        "user_id": current_user["_id"]
    }

    if not GEMINI_API_KEY:
        video_jobs[job_id]["status"] = "failed"
        video_jobs[job_id]["error"] = "Gemini API key not configured"
        return {"job_id": job_id, "status": "failed", "error": "API key not configured"}

    # Get image b64 if path provided
    image_b64 = req.image_b64
    if req.image_path and not image_b64:
        try:
            img_data, _ = get_object(req.image_path)
            image_b64 = base64.b64encode(img_data).decode()
        except Exception as e:
            logger.warning(f"Could not load image: {e}")

    background_tasks.add_task(run_veo_generation, job_id, req.prompt, image_b64, req.aspect_ratio, req.duration)
    return {"job_id": job_id, "status": "processing"}

@api_router.get("/generate/video/status/{job_id}")
async def video_status(job_id: str, current_user: dict = Depends(get_current_user)):
    if job_id not in video_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return video_jobs[job_id]

# ===================== PROFILE OPTIMIZER =====================

@api_router.post("/optimize/profile")
async def optimize_profile(
    req: ProfileOptimizeRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)

        platform_limits = {"instagram": 150, "twitter": 160, "linkedin": 220, "tiktok": 80}
        char_limit = platform_limits.get(req.platform, 150)

        prompt = f"""You are a top-tier social media expert and copywriter. 
Create an optimized {req.platform} profile bio for:
- Username/Name: {req.username or current_user.get('name', 'User')}
- Current bio: {req.current_bio or 'Not provided'}
- Style preference: {req.style}
- Character limit: {char_limit}

Respond ONLY with valid JSON (no markdown):
{{
  "bio": "your optimized bio here",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "tips": ["tip 1", "tip 2", "tip 3"],
  "tone": "professional/playful/inspiring"
}}"""

        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        text = response.text

        try:
            json_match = re.search(r'\{[\s\S]*\}', text)
            result = json.loads(json_match.group()) if json_match else {"bio": text, "hashtags": [], "tips": []}
        except Exception:
            result = {"bio": text, "hashtags": [], "tips": []}

        # AI image enhancement description if image provided
        enhancement_tips = []
        if req.image_b64:
            try:
                model_v = genai.GenerativeModel('gemini-1.5-flash')
                img_response = model_v.generate_content([
                    "Analyze this profile photo and give 3 specific enhancement tips to make it more professional. Be concise.",
                    {"mime_type": "image/jpeg", "data": req.image_b64}
                ])
                enhancement_tips = [img_response.text]
            except Exception as e:
                enhancement_tips = ["Upload a high-res photo with good lighting", "Use a plain or blurred background", "Smile naturally and make eye contact"]

        return {
            "success": True,
            "result": result,
            "image_tips": enhancement_tips
        }
    except Exception as e:
        logger.error(f"Profile optimization failed: {e}")
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)[:200]}")

# ===================== SOCIAL SCHEDULING =====================

@api_router.post("/schedule/posts")
async def create_post(req: SchedulePostRequest, current_user: dict = Depends(get_current_user)):
    post_id = str(uuid.uuid4())
    post = {
        "id": post_id,
        "user_id": current_user["_id"],
        "content": req.content,
        "platforms": req.platforms,
        "media_paths": req.media_paths or [],
        "scheduled_at": req.scheduled_at,
        "recurrence": req.recurrence,
        "status": "scheduled",
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.scheduled_posts.insert_one(post)
    post.pop("_id", None)
    return post

@api_router.get("/schedule/posts")
async def get_posts(current_user: dict = Depends(get_current_user)):
    posts = await db.scheduled_posts.find(
        {"user_id": current_user["_id"], "is_deleted": {"$ne": True}},
        {"_id": 0, "id": 1, "content": 1, "platforms": 1, "scheduled_at": 1, "recurrence": 1, "status": 1, "media_paths": 1, "created_at": 1}
    ).sort("scheduled_at", 1).limit(200).to_list(200)
    return posts

@api_router.delete("/schedule/posts/{post_id}")
async def delete_post(post_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.scheduled_posts.update_one(
        {"id": post_id, "user_id": current_user["_id"]},
        {"$set": {"is_deleted": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": "Deleted"}

@api_router.put("/schedule/posts/{post_id}")
async def update_post(post_id: str, req: SchedulePostRequest, current_user: dict = Depends(get_current_user)):
    result = await db.scheduled_posts.update_one(
        {"id": post_id, "user_id": current_user["_id"]},
        {"$set": {
            "content": req.content, "platforms": req.platforms,
            "scheduled_at": req.scheduled_at, "recurrence": req.recurrence,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": "Updated"}

# ===================== TEMPLATES =====================

TEMPLATES = [
    {"id": "t1", "name": "Neon Product Showcase", "platform": "instagram_reels", "category": "Product", "aspect_ratio": "9:16", "dimensions": "1080x1920", "thumbnail": "https://images.unsplash.com/photo-1746378890786-6deefdf600b0?w=300&h=500&fit=crop&q=80"},
    {"id": "t2", "name": "Cinematic Story", "platform": "instagram_reels", "category": "Lifestyle", "aspect_ratio": "9:16", "dimensions": "1080x1920", "thumbnail": "https://images.pexels.com/photos/8108406/pexels-photo-8108406.jpeg?auto=compress&cs=tinysrgb&w=300&h=500"},
    {"id": "t3", "name": "Golden Hour Portrait", "platform": "instagram_post", "category": "Portrait", "aspect_ratio": "1:1", "dimensions": "1080x1080", "thumbnail": "https://images.unsplash.com/photo-1723750599301-fee00405eaff?w=300&h=300&fit=crop&q=80"},
    {"id": "t4", "name": "Minimalist Product", "platform": "instagram_post", "category": "Product", "aspect_ratio": "1:1", "dimensions": "1080x1080", "thumbnail": "https://images.pexels.com/photos/6476257/pexels-photo-6476257.jpeg?auto=compress&cs=tinysrgb&w=300&h=300"},
    {"id": "t5", "name": "Viral Energy", "platform": "tiktok", "category": "Entertainment", "aspect_ratio": "9:16", "dimensions": "1080x1920", "thumbnail": "https://images.unsplash.com/photo-1773982417805-fef047dce498?w=300&h=500&fit=crop&q=80"},
    {"id": "t6", "name": "Tutorial Card", "platform": "tiktok", "category": "Education", "aspect_ratio": "9:16", "dimensions": "1080x1920", "thumbnail": "https://images.pexels.com/photos/8108406/pexels-photo-8108406.jpeg?auto=compress&cs=tinysrgb&w=300&h=500"},
    {"id": "t7", "name": "Cinematic Thumbnail", "platform": "youtube", "category": "Thumbnail", "aspect_ratio": "16:9", "dimensions": "1280x720", "thumbnail": "https://images.unsplash.com/photo-1723750599301-fee00405eaff?w=400&h=225&fit=crop&q=80"},
    {"id": "t8", "name": "Channel Banner Pro", "platform": "youtube", "category": "Banner", "aspect_ratio": "16:9", "dimensions": "2560x1440", "thumbnail": "https://images.unsplash.com/photo-1773982417805-fef047dce498?w=400&h=225&fit=crop&q=80"},
    {"id": "t9", "name": "Professional Headshot", "platform": "linkedin", "category": "Profile", "aspect_ratio": "1:1", "dimensions": "800x800", "thumbnail": "https://images.pexels.com/photos/6476257/pexels-photo-6476257.jpeg?auto=compress&cs=tinysrgb&w=300&h=300"},
    {"id": "t10", "name": "Corporate Post", "platform": "linkedin", "category": "Corporate", "aspect_ratio": "1.91:1", "dimensions": "1200x627", "thumbnail": "https://images.unsplash.com/photo-1746378890786-6deefdf600b0?w=400&h=210&fit=crop&q=80"},
    {"id": "t11", "name": "Bold Statement", "platform": "twitter", "category": "Quote", "aspect_ratio": "16:9", "dimensions": "1600x900", "thumbnail": "https://images.unsplash.com/photo-1773982417805-fef047dce498?w=400&h=225&fit=crop&q=80"},
    {"id": "t12", "name": "Event Promo", "platform": "twitter", "category": "Event", "aspect_ratio": "16:9", "dimensions": "1600x900", "thumbnail": "https://images.pexels.com/photos/8108406/pexels-photo-8108406.jpeg?auto=compress&cs=tinysrgb&w=400&h=225"},
    {"id": "t13", "name": "Cyberpunk Portrait", "platform": "instagram_post", "category": "Artistic", "aspect_ratio": "4:5", "dimensions": "1080x1350", "thumbnail": "https://images.unsplash.com/photo-1746378890786-6deefdf600b0?w=300&h=375&fit=crop&q=80"},
    {"id": "t14", "name": "Neon Night Out", "platform": "instagram_reels", "category": "Lifestyle", "aspect_ratio": "9:16", "dimensions": "1080x1920", "thumbnail": "https://images.unsplash.com/photo-1773982417805-fef047dce498?w=300&h=500&fit=crop&q=80"},
    {"id": "t15", "name": "Fitness Motivation", "platform": "tiktok", "category": "Fitness", "aspect_ratio": "9:16", "dimensions": "1080x1920", "thumbnail": "https://images.pexels.com/photos/6476257/pexels-photo-6476257.jpeg?auto=compress&cs=tinysrgb&w=300&h=500"},
    {"id": "t16", "name": "Food Photography", "platform": "instagram_post", "category": "Food", "aspect_ratio": "1:1", "dimensions": "1080x1080", "thumbnail": "https://images.unsplash.com/photo-1723750599301-fee00405eaff?w=300&h=300&fit=crop&q=80"},
]

@api_router.get("/templates")
async def get_templates(platform: Optional[str] = None):
    templates = TEMPLATES
    if platform and platform != "all":
        templates = [t for t in templates if t["platform"] == platform]
    return templates

# ===================== PROJECTS =====================

@api_router.post("/projects")
async def create_project(data: dict, current_user: dict = Depends(get_current_user)):
    project_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    project = {
        "id": project_id, "user_id": current_user["_id"],
        "title": data.get("title", "Untitled Project"),
        "type": data.get("type", "image"),
        "thumbnail": data.get("thumbnail"),
        "filter_applied": data.get("filter_applied"),
        "storage_path": data.get("storage_path"),
        "is_deleted": False, "created_at": now, "updated_at": now
    }
    await db.projects.insert_one(project)
    project.pop("_id", None)
    return project

@api_router.get("/projects")
async def get_projects(current_user: dict = Depends(get_current_user)):
    projects = await db.projects.find(
        {"user_id": current_user["_id"], "is_deleted": {"$ne": True}},
        {"_id": 0, "id": 1, "title": 1, "type": 1, "thumbnail": 1, "filter_applied": 1, "storage_path": 1, "created_at": 1, "updated_at": 1}
    ).sort("created_at", -1).limit(50).to_list(50)
    return projects

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, current_user: dict = Depends(get_current_user)):
    await db.projects.update_one(
        {"id": project_id, "user_id": current_user["_id"]},
        {"$set": {"is_deleted": True}}
    )
    return {"message": "Deleted"}

# ===================== STATS =====================

@api_router.get("/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    projects_count = await db.projects.count_documents({"user_id": current_user["_id"], "is_deleted": {"$ne": True}})
    posts_count = await db.scheduled_posts.count_documents({"user_id": current_user["_id"], "is_deleted": {"$ne": True}})
    return {
        "projects": projects_count,
        "scheduled_posts": posts_count,
        "templates": len(TEMPLATES),
        "filters": 20
    }

@api_router.get("/")
async def root():
    return {"message": "RetouchFly API v1.0", "status": "online"}

app.include_router(api_router)

# ===================== STARTUP =====================

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.scheduled_posts.create_index("user_id")
    await db.projects.create_index("user_id")

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@retouchfly.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "RetouchFly2024!")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "_id": ObjectId(), "name": "Admin", "email": admin_email,
            "password_hash": hash_password(admin_password),
            "role": "admin", "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin seeded: {admin_email}")

    init_storage()
    logger.info("RetouchFly API started successfully")

@app.on_event("shutdown")
async def shutdown():
    mongo_client.close()
