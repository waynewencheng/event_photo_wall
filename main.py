import os
import shutil
import uuid
from typing import List

from fastapi import FastAPI, UploadFile, File, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import socketio
import aiofiles

# --- Configuration ---
UPLOAD_DIR = "uploads"
TEMP_DIR = os.path.join(UPLOAD_DIR, "temp")
APPROVED_DIR = os.path.join(UPLOAD_DIR, "approved")

os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(APPROVED_DIR, exist_ok=True)

# --- FastAPI & Socket.IO Setup ---
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
app = FastAPI()
socket_app = socketio.ASGIApp(sio, app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

templates = Jinja2Templates(directory="templates")

# --- In-Memory State ---
# simple list of approved image filenames
approved_photos: List[str] = []
# Config State
CONFIG = {
    "auto_approve": False,
    "show_qr": False,
    "guest_url": "" # Empty means default/auto-detect on client side usually, but we can store it.
}

# Populate initial list from disk
for filename in os.listdir(APPROVED_DIR):
    if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
        approved_photos.append(filename)

# --- Routes ---

@app.get("/")
async def index(request: Request):
    return templates.TemplateResponse("guest.html", {"request": request})

@app.get("/guest")
async def guest_ui(request: Request):
    return templates.TemplateResponse("guest.html", {"request": request})

@app.get("/display")
async def display_ui(request: Request):
    return templates.TemplateResponse("display.html", {
        "request": request,
        "approved_photos": approved_photos
    })

@app.get("/admin")
async def admin_ui(request: Request):
    # Pass initial list of temp files for review
    pending_photos = []
    for filename in os.listdir(TEMP_DIR):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
            pending_photos.append(filename)
            
    return templates.TemplateResponse("admin.html", {
        "request": request, 
        "pending_photos": pending_photos,
        "approved_photos": approved_photos,
        "config": CONFIG
    })

# --- API Endpoints ---
from pydantic import BaseModel

class ConfigUpdate(BaseModel):
    auto_approve: bool
    show_qr: bool
    guest_url: str

@app.post("/api/config")
async def update_config(data: ConfigUpdate):
    CONFIG["auto_approve"] = data.auto_approve
    CONFIG["show_qr"] = data.show_qr
    CONFIG["guest_url"] = data.guest_url
    
    # Notify display to update QR
    await sio.emit('update_qr', {'show': CONFIG['show_qr'], 'url': CONFIG['guest_url']})
    return {"status": "updated", "config": CONFIG}

@app.post("/api/upload")
async def upload_photo(file: UploadFile = File(...)):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    # Generate unique name
    ext = file.filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(TEMP_DIR, filename)
    
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    if CONFIG["auto_approve"]:
        # Auto-approve logic
        approved_path = os.path.join(APPROVED_DIR, filename)
        shutil.move(file_path, approved_path)
        approved_photos.append(filename)
        await sio.emit('photo_approved', {'filename': filename})
        return {"status": "auto_approved", "filename": filename}
    else:
        await sio.emit('new_photo_waiting', {'filename': filename})
        return {"status": "success", "filename": filename}

@app.post("/api/approve/{filename}")
async def approve_photo(filename: str):
    temp_path = os.path.join(TEMP_DIR, filename)
    approved_path = os.path.join(APPROVED_DIR, filename)
    
    if not os.path.exists(temp_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    shutil.move(temp_path, approved_path)
    
    if filename not in approved_photos:
        approved_photos.append(filename)
        
    await sio.emit('photo_approved', {'filename': filename})
    return {"status": "approved"}

@app.delete("/api/delete/{filename}")
async def delete_photo(filename: str, type: str = 'temp'):
    # type can be 'temp' or 'approved'
    if type == 'approved':
        path = os.path.join(APPROVED_DIR, filename)
        if filename in approved_photos:
            approved_photos.remove(filename)
            # Notify display to remove it? optional, depends on logic
    else:
        path = os.path.join(TEMP_DIR, filename)
        
    if os.path.exists(path):
        os.remove(path)
        
    return {"status": "deleted"}

# --- Socket.IO Events ---

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
async def send_danmu(sid, data):
    # data: {'text': 'Hello World', 'timestamp': ...}
    print(f"Danmu received: {data}")
    
    if CONFIG["auto_approve"]:
        await sio.emit('broadcast_danmu', data)
    else:
        # Send to admin for approval
        # Add ID to identify it
        data['id'] = str(uuid.uuid4())
        await sio.emit('new_message_waiting', data)

@sio.event
async def approve_message(sid, data):
    # data: {'text': '...', 'id': ...}
    await sio.emit('broadcast_danmu', data)

@sio.event
async def clear_screen(sid):
    print("Clear screen command received")
    await sio.emit('perform_clear_screen')

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:socket_app", host="0.0.0.0", port=8000, reload=True)
