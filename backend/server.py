from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise ValueError("JWT_SECRET environment variable is required")
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 5  # Default session length
JWT_REMEMBER_ME_HOURS = 168  # 7 days when "remember me" is checked

# Owner PIN (stored securely in env)
OWNER_PIN = os.environ.get('OWNER_PIN')
if not OWNER_PIN:
    raise ValueError("OWNER_PIN environment variable is required")

# Demo account limits
DEMO_MAX_KEYS = 4
DEMO_MAX_USERS = 1

# Create uploads directory for images
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(title="KeyFlow API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Serve uploaded files statically through /api/uploads to ensure proper routing
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ MODELS ============

class UserRole:
    OWNER = "owner"
    DEALERSHIP_ADMIN = "dealership_admin"
    # Standard user roles (all have same permissions)
    SALES = "sales"
    SERVICE = "service"
    DELIVERY = "delivery"
    PORTER = "porter"
    LOT_TECH = "lot_tech"
    USER = "user"  # Legacy/default

# List of standard roles for validation
STANDARD_USER_ROLES = [UserRole.SALES, UserRole.SERVICE, UserRole.DELIVERY, UserRole.PORTER, UserRole.LOT_TECH, UserRole.USER]

class DealershipType:
    AUTOMOTIVE = "automotive"
    RV = "rv"

class AttentionStatus:
    NONE = "none"
    NEEDS_ATTENTION = "needs_attention"
    FIXED = "fixed"

class PDIStatus:
    NOT_PDI_YET = "not_pdi_yet"
    IN_PROGRESS = "in_progress"
    FINISHED = "finished"

# Valid PDI statuses for validation
VALID_PDI_STATUSES = [PDIStatus.NOT_PDI_YET, PDIStatus.IN_PROGRESS, PDIStatus.FINISHED]

# Auth Models
class UserCreate(BaseModel):
    name: str
    pin: str  # 4-6 digit PIN for user login
    role: str = UserRole.USER
    dealership_id: Optional[str] = None
    # Legacy fields - optional for backwards compatibility
    email: Optional[EmailStr] = None
    password: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False

class AdminPinLogin(BaseModel):
    """Admin login with PIN only (quick access)"""
    dealership_id: str
    pin: str
    remember_me: bool = False

class UserPinLogin(BaseModel):
    """User login with name and PIN"""
    dealership_id: str
    name: str
    pin: str
    remember_me: bool = False

class AdminLogin(BaseModel):
    email: EmailStr
    pin: str
    remember_me: bool = False

class OwnerLogin(BaseModel):
    pin: str
    remember_me: bool = False

class UserResponse(BaseModel):
    id: str
    email: Optional[str] = None
    name: str
    role: str
    dealership_id: Optional[str] = None
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Dealership Models
class DealershipCreate(BaseModel):
    name: str
    dealership_type: str = DealershipType.AUTOMOTIVE
    address: Optional[str] = None
    phone: Optional[str] = None
    service_bays: int = 0  # For RV dealerships
    # Admin account for new dealership
    admin_email: Optional[str] = None
    admin_password: Optional[str] = None
    admin_name: Optional[str] = None
    admin_pin: Optional[str] = None  # PIN for admin access (4-6 digits)

class DealershipUpdate(BaseModel):
    name: Optional[str] = None
    dealership_type: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    service_bays: Optional[int] = None
    is_active: Optional[bool] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    custom_roles: Optional[List[str]] = None  # Custom user role names

class DealershipResponse(BaseModel):
    id: str
    name: str
    dealership_type: str
    address: Optional[str] = None
    phone: Optional[str] = None
    service_bays: int = 0
    is_active: bool = True
    logo_url: Optional[str] = None
    primary_color: Optional[str] = "#22d3ee"
    secondary_color: Optional[str] = "#0891b2"
    custom_roles: Optional[List[str]] = []  # Custom user role names
    created_at: str

# Key Models
class KeyStatus:
    AVAILABLE = "available"
    CHECKED_OUT = "checked_out"

class KeyCondition:
    NEW = "new"
    USED = "used"

class CheckoutReason:
    TEST_DRIVE = "test_drive"
    SERVICE_LOANER = "service_loaner"
    EXTENDED_TEST_DRIVE = "extended_test_drive"
    SHOW_MOVE = "show_move"
    SERVICE = "service"  # For RV - includes bay info

class KeyCreate(BaseModel):
    stock_number: str
    vehicle_year: Optional[int] = None
    vehicle_make: Optional[str] = None
    vehicle_model: str
    vehicle_vin: Optional[str] = None  # Optional - not required for RV
    condition: str = KeyCondition.NEW  # new or used
    dealership_id: str

class KeyUpdate(BaseModel):
    stock_number: Optional[str] = None
    vehicle_year: Optional[int] = None
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_vin: Optional[str] = None
    condition: Optional[str] = None
    is_active: Optional[bool] = None

class KeyBulkImportItem(BaseModel):
    condition: str  # "new" or "used"
    stock_number: str
    vehicle_year: Optional[int] = None
    vehicle_make: Optional[str] = None
    vehicle_model: str

class KeyBulkImportRequest(BaseModel):
    dealership_id: str
    keys: List[KeyBulkImportItem]

class KeyResponse(BaseModel):
    id: str
    stock_number: str
    vehicle_year: Optional[int] = None
    vehicle_make: Optional[str] = None
    vehicle_model: str
    vehicle_vin: Optional[str] = None
    condition: str = KeyCondition.NEW
    dealership_id: str
    status: str
    current_checkout: Optional[dict] = None
    notes_history: Optional[List[dict]] = []
    images: Optional[List[str]] = []  # Up to 3 image URLs
    attention_status: str = "none"  # none, needs_attention, fixed
    # PDI Status fields
    pdi_status: str = PDIStatus.NOT_PDI_YET
    pdi_last_updated_at: Optional[str] = None
    pdi_last_updated_by_user_id: Optional[str] = None
    pdi_last_updated_by_user_name: Optional[str] = None
    is_active: bool = True
    created_at: str

class PDIStatusUpdate(BaseModel):
    status: str  # not_pdi_yet, in_progress, finished
    notes: Optional[str] = None

class PDIAuditLogResponse(BaseModel):
    id: str
    key_id: str
    stock_number: str
    changed_by_user_id: str
    changed_by_user_name: str
    changed_at: str
    previous_status: str
    new_status: str
    notes: Optional[str] = None

class KeyCheckoutRequest(BaseModel):
    reason: str
    notes: Optional[str] = None
    service_bay: Optional[int] = None  # For RV service
    needs_attention: bool = False  # Flag if unit needs attention
    images: Optional[List[str]] = []  # Up to 3 image URLs

class KeyReturnRequest(BaseModel):
    notes: Optional[str] = None
    new_bay: Optional[int] = None  # For RV - move to new bay before return

class KeyMarkFixedRequest(BaseModel):
    notes: Optional[str] = None

class BayMoveRequest(BaseModel):
    new_bay: int

# Repair Request Models
class RepairRequestCreate(BaseModel):
    key_id: str
    notes: str
    images: Optional[List[str]] = []  # Up to 3 image URLs

class RepairRequestResponse(BaseModel):
    id: str
    key_id: str
    stock_number: str
    vehicle_info: str
    dealership_id: str
    reported_by_id: str
    reported_by_name: str
    notes: str
    images: List[str] = []
    status: str  # pending, fixed
    reported_at: str
    fixed_by_id: Optional[str] = None
    fixed_by_name: Optional[str] = None
    fixed_at: Optional[str] = None

# Admin PIN Change
class AdminPinChange(BaseModel):
    current_pin: str
    new_pin: str

# Custom Role Management
class CustomRoleCreate(BaseModel):
    name: str

# Time Alert Models
class TimeAlertCreate(BaseModel):
    dealership_id: str
    alert_minutes: int = 30
    is_active: bool = True

class TimeAlertResponse(BaseModel):
    id: str
    dealership_id: str
    alert_minutes: int
    is_active: bool

# Invite Token Models
class InviteTokenCreate(BaseModel):
    dealership_id: str
    role: str = "dealership_admin"  # Role the invited user will have
    expires_in_days: int = 7

class InviteTokenResponse(BaseModel):
    id: str
    token: str
    dealership_id: str
    dealership_name: str
    role: str
    created_by: str
    created_at: str
    expires_at: str
    is_used: bool = False
    used_by: Optional[str] = None

class AcceptInviteRequest(BaseModel):
    token: str
    name: str
    email: EmailStr
    password: str

# Sales Tracker Models
class SalesGoalCreate(BaseModel):
    year: int
    yearly_sales_target: int

class SalesGoalResponse(BaseModel):
    id: str
    user_id: str
    year: int
    yearly_sales_target: int
    created_at: str

class DailyActivityCreate(BaseModel):
    date: str  # YYYY-MM-DD
    worked: bool = True  # Did they work this day or day off?
    leads_walk_in: int = 0
    leads_phone: int = 0
    leads_internet: int = 0
    writeups: int = 0
    sales: int = 0
    appointments_scheduled: int = 0
    appointments_shown: int = 0
    other_activities: Optional[str] = None
    notes: Optional[str] = None

class DailyActivityResponse(BaseModel):
    id: str
    user_id: str
    date: str
    worked: bool = True
    leads_walk_in: int
    leads_phone: int
    leads_internet: int
    writeups: int
    sales: int
    appointments_scheduled: int
    appointments_shown: int
    other_activities: Optional[str] = None
    notes: Optional[str] = None
    created_at: str

class SalesProgressResponse(BaseModel):
    goal: Optional[SalesGoalResponse] = None
    total_leads: int = 0
    total_writeups: int = 0
    total_sales: int = 0
    total_appointments: int = 0
    days_worked: int = 0
    days_off: int = 0
    days_elapsed: int = 0
    days_remaining: int = 0
    sales_needed_remaining: int = 0
    weekly_sales_needed: float = 0.0
    monthly_sales_needed: float = 0.0
    current_pace_per_day: float = 0.0
    projected_annual_sales: int = 0
    goal_achievement_probability: float = 0.0
    on_track: bool = False

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str, dealership_id: Optional[str] = None, remember_me: bool = False) -> str:
    expiration_hours = JWT_REMEMBER_ME_HOURS if remember_me else JWT_EXPIRATION_HOURS
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "dealership_id": dealership_id,
        "remember_me": remember_me,
        "exp": datetime.now(timezone.utc) + timedelta(hours=expiration_hours)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(*roles):
    async def role_checker(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "role": data.role,
        "dealership_id": data.dealership_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, data.email, data.role, data.dealership_id)
    user_response = UserResponse(
        id=user_id,
        email=data.email,
        name=data.name,
        role=data.role,
        dealership_id=data.dealership_id,
        created_at=user_doc["created_at"]
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"], user["role"], user.get("dealership_id"), data.remember_me)
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        dealership_id=user.get("dealership_id"),
        created_at=user["created_at"]
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/owner-login", response_model=TokenResponse)
async def owner_login(data: OwnerLogin):
    if data.pin != OWNER_PIN:
        raise HTTPException(status_code=401, detail="Invalid PIN")
    
    # Check if owner exists, create if not
    owner = await db.users.find_one({"role": UserRole.OWNER}, {"_id": 0})
    if not owner:
        owner_id = str(uuid.uuid4())
        owner = {
            "id": owner_id,
            "email": "owner@keyflow.app",
            "password": hash_password("owner"),
            "name": "System Owner",
            "role": UserRole.OWNER,
            "dealership_id": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(owner)
    
    token = create_token(owner["id"], owner["email"], owner["role"], None, data.remember_me)
    user_response = UserResponse(
        id=owner["id"],
        email=owner["email"],
        name=owner["name"],
        role=owner["role"],
        dealership_id=None,
        created_at=owner["created_at"]
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        dealership_id=user.get("dealership_id"),
        created_at=user["created_at"]
    )

@api_router.post("/auth/demo-login", response_model=TokenResponse)
async def demo_login():
    """Demo login - creates or retrieves demo account with limited features"""
    # Check if demo dealership exists
    demo_dealership = await db.dealerships.find_one({"name": "Demo Dealership", "is_demo": True}, {"_id": 0})
    
    if not demo_dealership:
        # Create demo dealership
        dealership_id = str(uuid.uuid4())
        demo_dealership = {
            "id": dealership_id,
            "name": "Demo Dealership",
            "dealership_type": "automotive",
            "address": "123 Demo Street",
            "phone": "(555) 000-0000",
            "service_bays": 0,
            "is_active": True,
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.dealerships.insert_one(demo_dealership)
    
    # Check if demo user exists
    demo_user = await db.users.find_one({"email": "demo@keyflow.app", "is_demo": True}, {"_id": 0})
    
    if not demo_user:
        # Create demo user
        user_id = str(uuid.uuid4())
        demo_user = {
            "id": user_id,
            "email": "demo@keyflow.app",
            "password": hash_password("demo123"),
            "name": "Demo Admin",
            "role": UserRole.DEALERSHIP_ADMIN,
            "dealership_id": demo_dealership["id"],
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(demo_user)
    
    token = create_token(demo_user["id"], demo_user["email"], demo_user["role"], demo_user.get("dealership_id"))
    user_response = UserResponse(
        id=demo_user["id"],
        email=demo_user["email"],
        name=demo_user["name"],
        role=demo_user["role"],
        dealership_id=demo_user.get("dealership_id"),
        created_at=demo_user["created_at"]
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/demo-limits")
async def get_demo_limits(user: dict = Depends(get_current_user)):
    """Get demo account limits and current usage"""
    if not user.get("is_demo"):
        return {"is_demo": False}
    
    dealership_id = user.get("dealership_id")
    
    # Count current keys
    key_count = await db.keys.count_documents({"dealership_id": dealership_id, "is_active": True})
    
    # Count current users (excluding the demo admin)
    user_count = await db.users.count_documents({
        "dealership_id": dealership_id, 
        "is_demo": {"$ne": True}
    })
    
    return {
        "is_demo": True,
        "max_keys": DEMO_MAX_KEYS,
        "current_keys": key_count,
        "can_add_keys": key_count < DEMO_MAX_KEYS,
        "max_users": DEMO_MAX_USERS,
        "current_users": user_count,
        "can_add_users": user_count < DEMO_MAX_USERS
    }

@api_router.post("/auth/admin-login", response_model=TokenResponse)
async def admin_login(data: AdminLogin):
    """Admin login with email and PIN"""
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user["role"] != UserRole.DEALERSHIP_ADMIN:
        raise HTTPException(status_code=401, detail="This login is for admins only")
    
    # Verify PIN
    admin_pin = user.get("admin_pin")
    if not admin_pin:
        raise HTTPException(status_code=401, detail="Admin PIN not set. Contact owner.")
    
    if not verify_password(data.pin, admin_pin):
        raise HTTPException(status_code=401, detail="Invalid PIN")
    
    token = create_token(user["id"], user.get("email", ""), user["role"], user.get("dealership_id"), data.remember_me)
    user_response = UserResponse(
        id=user["id"],
        email=user.get("email"),
        name=user["name"],
        role=user["role"],
        dealership_id=user.get("dealership_id"),
        created_at=user["created_at"]
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/admin-pin-login", response_model=TokenResponse)
async def admin_pin_login(data: AdminPinLogin):
    """Admin quick login with PIN only (finds admin for dealership)"""
    # Find the admin for this dealership
    user = await db.users.find_one({
        "dealership_id": data.dealership_id,
        "role": UserRole.DEALERSHIP_ADMIN
    }, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="No admin found for this dealership")
    
    # Verify PIN
    admin_pin = user.get("admin_pin")
    if not admin_pin:
        raise HTTPException(status_code=401, detail="Admin PIN not set. Contact owner.")
    
    if not verify_password(data.pin, admin_pin):
        raise HTTPException(status_code=401, detail="Invalid PIN")
    
    token = create_token(user["id"], user.get("email", ""), user["role"], user.get("dealership_id"), data.remember_me)
    user_response = UserResponse(
        id=user["id"],
        email=user.get("email"),
        name=user["name"],
        role=user["role"],
        dealership_id=user.get("dealership_id"),
        created_at=user["created_at"]
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/user-pin-login", response_model=TokenResponse)
async def user_pin_login(data: UserPinLogin):
    """User login with name and PIN"""
    # Find user by name (case-insensitive) and dealership
    user = await db.users.find_one({
        "dealership_id": data.dealership_id,
        "name": {"$regex": f"^{data.name}$", "$options": "i"},
        "role": {"$in": STANDARD_USER_ROLES}
    }, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Verify PIN
    user_pin = user.get("pin")
    if not user_pin:
        raise HTTPException(status_code=401, detail="PIN not set for this user")
    
    if not verify_password(data.pin, user_pin):
        raise HTTPException(status_code=401, detail="Invalid PIN")
    
    # Calculate token expiration based on remember_me
    # 6 hours of inactivity timeout for users (unless remember_me)
    token = create_token(user["id"], user.get("email", ""), user["role"], user.get("dealership_id"), data.remember_me)
    user_response = UserResponse(
        id=user["id"],
        email=user.get("email"),
        name=user["name"],
        role=user["role"],
        dealership_id=user.get("dealership_id"),
        created_at=user["created_at"]
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/change-user-pin")
async def change_user_pin(current_pin: str, new_pin: str, user: dict = Depends(get_current_user)):
    """Allow any user to change their PIN"""
    db_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current PIN
    current_pin_hash = db_user.get("pin") or db_user.get("admin_pin")
    if current_pin_hash and not verify_password(current_pin, current_pin_hash):
        raise HTTPException(status_code=401, detail="Current PIN is incorrect")
    
    # Validate new PIN
    if not new_pin.isdigit() or len(new_pin) < 4 or len(new_pin) > 6:
        raise HTTPException(status_code=400, detail="PIN must be 4-6 digits")
    
    # Update PIN (admin_pin for admins, pin for regular users)
    pin_field = "admin_pin" if user["role"] == UserRole.DEALERSHIP_ADMIN else "pin"
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {pin_field: hash_password(new_pin)}}
    )
    
    return {"message": "PIN changed successfully"}

@api_router.post("/auth/change-admin-pin")
async def change_admin_pin(data: AdminPinChange, user: dict = Depends(require_role(UserRole.DEALERSHIP_ADMIN))):
    """Allow admin to change their PIN"""
    db_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current PIN
    current_pin_hash = db_user.get("admin_pin")
    if current_pin_hash and not verify_password(data.current_pin, current_pin_hash):
        raise HTTPException(status_code=401, detail="Current PIN is incorrect")
    
    # Validate new PIN
    if not data.new_pin.isdigit() or len(data.new_pin) < 4 or len(data.new_pin) > 6:
        raise HTTPException(status_code=400, detail="PIN must be 4-6 digits")
    
    # Update PIN
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"admin_pin": hash_password(data.new_pin)}}
    )
    
    return {"message": "PIN changed successfully"}

# Get all dealerships for login selection (public endpoint)
@api_router.get("/dealerships/public")
async def get_public_dealerships():
    """Get list of dealerships for login selection (public, no auth required)"""
    dealerships = await db.dealerships.find(
        {"is_active": True},
        {"_id": 0, "id": 1, "name": 1}
    ).to_list(100)
    return dealerships

# ============ DEALERSHIP ENDPOINTS ============

@api_router.post("/dealerships", response_model=DealershipResponse)
async def create_dealership(data: DealershipCreate, user: dict = Depends(require_role(UserRole.OWNER))):
    """Only owners can create dealerships. Optionally creates admin account with PIN."""
    dealership_id = str(uuid.uuid4())
    doc = {
        "id": dealership_id,
        "name": data.name,
        "dealership_type": data.dealership_type,
        "address": data.address,
        "phone": data.phone,
        "service_bays": data.service_bays if data.dealership_type == DealershipType.RV else 0,
        "is_active": True,
        "custom_roles": [],  # Default empty, admin can add custom roles
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.dealerships.insert_one(doc)
    
    # Create admin account if credentials provided
    if data.admin_email and data.admin_password:
        existing = await db.users.find_one({"email": data.admin_email})
        if existing:
            raise HTTPException(status_code=400, detail="Admin email already registered")
        
        # Validate admin PIN (must be 4-6 digits)
        admin_pin = data.admin_pin or "0000"  # Default PIN if not provided
        if not admin_pin.isdigit() or len(admin_pin) < 4 or len(admin_pin) > 6:
            raise HTTPException(status_code=400, detail="Admin PIN must be 4-6 digits")
        
        admin_id = str(uuid.uuid4())
        admin_doc = {
            "id": admin_id,
            "email": data.admin_email,
            "password": hash_password(data.admin_password),
            "admin_pin": hash_password(admin_pin),  # Store hashed PIN
            "name": data.admin_name or f"{data.name} Admin",
            "role": UserRole.DEALERSHIP_ADMIN,
            "dealership_id": dealership_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_doc)
    
    return DealershipResponse(**doc)

@api_router.get("/dealerships", response_model=List[DealershipResponse])
async def get_dealerships(user: dict = Depends(get_current_user)):
    if user["role"] == UserRole.OWNER:
        dealerships = await db.dealerships.find({}, {"_id": 0}).to_list(100)
    elif user["role"] == UserRole.DEALERSHIP_ADMIN:
        dealerships = await db.dealerships.find({"id": user["dealership_id"]}, {"_id": 0}).to_list(1)
    else:
        dealerships = await db.dealerships.find({"id": user["dealership_id"]}, {"_id": 0}).to_list(1)
    return [DealershipResponse(**d) for d in dealerships]

@api_router.get("/dealerships/{dealership_id}", response_model=DealershipResponse)
async def get_dealership(dealership_id: str, user: dict = Depends(get_current_user)):
    dealership = await db.dealerships.find_one({"id": dealership_id}, {"_id": 0})
    if not dealership:
        raise HTTPException(status_code=404, detail="Dealership not found")
    return DealershipResponse(**dealership)

@api_router.put("/dealerships/{dealership_id}", response_model=DealershipResponse)
async def update_dealership(dealership_id: str, data: DealershipUpdate, user: dict = Depends(require_role(UserRole.OWNER, UserRole.DEALERSHIP_ADMIN))):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.dealerships.update_one({"id": dealership_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Dealership not found")
    
    dealership = await db.dealerships.find_one({"id": dealership_id}, {"_id": 0})
    return DealershipResponse(**dealership)

@api_router.delete("/dealerships/{dealership_id}")
async def delete_dealership(dealership_id: str, user: dict = Depends(require_role(UserRole.OWNER))):
    result = await db.dealerships.delete_one({"id": dealership_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Dealership not found")
    return {"message": "Dealership deleted"}

@api_router.get("/dealerships/{dealership_id}/roles")
async def get_dealership_roles(dealership_id: str, user: dict = Depends(get_current_user)):
    """Get available user roles for a dealership (standard + custom)"""
    dealership = await db.dealerships.find_one({"id": dealership_id}, {"_id": 0})
    if not dealership:
        raise HTTPException(status_code=404, detail="Dealership not found")
    
    # Standard roles
    standard_roles = [
        {"id": "sales", "name": "Sales"},
        {"id": "service", "name": "Service"},
        {"id": "delivery", "name": "Delivery"},
        {"id": "porter", "name": "Porter"},
        {"id": "lot_tech", "name": "Lot Tech"},
    ]
    
    # Custom roles from dealership
    custom_roles = [{"id": r.lower().replace(" ", "_"), "name": r} for r in dealership.get("custom_roles", [])]
    
    return {"standard_roles": standard_roles, "custom_roles": custom_roles}

@api_router.post("/dealerships/{dealership_id}/roles")
async def add_custom_role(dealership_id: str, data: CustomRoleCreate, user: dict = Depends(require_role(UserRole.OWNER, UserRole.DEALERSHIP_ADMIN))):
    """Add a custom user role to a dealership (admin only)"""
    if user["role"] == UserRole.DEALERSHIP_ADMIN and dealership_id != user["dealership_id"]:
        raise HTTPException(status_code=403, detail="Cannot modify other dealerships")
    
    dealership = await db.dealerships.find_one({"id": dealership_id}, {"_id": 0})
    if not dealership:
        raise HTTPException(status_code=404, detail="Dealership not found")
    
    custom_roles = dealership.get("custom_roles", [])
    if data.name in custom_roles:
        raise HTTPException(status_code=400, detail="Role already exists")
    
    custom_roles.append(data.name)
    await db.dealerships.update_one({"id": dealership_id}, {"$set": {"custom_roles": custom_roles}})
    
    return {"message": f"Role '{data.name}' added", "custom_roles": custom_roles}

@api_router.delete("/dealerships/{dealership_id}/roles/{role_name}")
async def remove_custom_role(dealership_id: str, role_name: str, user: dict = Depends(require_role(UserRole.OWNER, UserRole.DEALERSHIP_ADMIN))):
    """Remove a custom user role from a dealership (admin only)"""
    if user["role"] == UserRole.DEALERSHIP_ADMIN and dealership_id != user["dealership_id"]:
        raise HTTPException(status_code=403, detail="Cannot modify other dealerships")
    
    dealership = await db.dealerships.find_one({"id": dealership_id}, {"_id": 0})
    if not dealership:
        raise HTTPException(status_code=404, detail="Dealership not found")
    
    custom_roles = dealership.get("custom_roles", [])
    if role_name not in custom_roles:
        raise HTTPException(status_code=404, detail="Role not found")
    
    custom_roles.remove(role_name)
    await db.dealerships.update_one({"id": dealership_id}, {"$set": {"custom_roles": custom_roles}})
    
    return {"message": f"Role '{role_name}' removed", "custom_roles": custom_roles}

# ============ INVITE TOKEN ENDPOINTS ============

@api_router.post("/invites", response_model=InviteTokenResponse)
async def create_invite(data: InviteTokenCreate, user: dict = Depends(require_role(UserRole.OWNER, UserRole.DEALERSHIP_ADMIN))):
    """Create an invite token for a dealership. Admins can only create invites for their own dealership."""
    # Admins can only invite to their own dealership
    if user["role"] == UserRole.DEALERSHIP_ADMIN and data.dealership_id != user["dealership_id"]:
        raise HTTPException(status_code=403, detail="Cannot create invites for other dealerships")
    
    # Validate role
    if data.role not in [UserRole.DEALERSHIP_ADMIN, UserRole.USER]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'dealership_admin' or 'user'")
    
    # Admins can only create user invites, not admin invites
    if user["role"] == UserRole.DEALERSHIP_ADMIN and data.role == UserRole.DEALERSHIP_ADMIN:
        raise HTTPException(status_code=403, detail="Admins cannot create admin invites. Contact the owner.")
    
    # Get dealership name
    dealership = await db.dealerships.find_one({"id": data.dealership_id}, {"_id": 0})
    if not dealership:
        raise HTTPException(status_code=404, detail="Dealership not found")
    
    # Generate unique token
    token = str(uuid.uuid4())
    invite_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    doc = {
        "id": invite_id,
        "token": token,
        "dealership_id": data.dealership_id,
        "dealership_name": dealership["name"],
        "role": data.role,
        "created_by": user["id"],
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(days=data.expires_in_days)).isoformat(),
        "is_used": False,
        "used_by": None
    }
    
    await db.invites.insert_one(doc)
    return InviteTokenResponse(**doc)

@api_router.get("/invites", response_model=List[InviteTokenResponse])
async def get_invites(dealership_id: Optional[str] = None, user: dict = Depends(require_role(UserRole.OWNER, UserRole.DEALERSHIP_ADMIN))):
    """Get all invites. Owners see all, admins see their dealership's invites."""
    query = {}
    
    if user["role"] == UserRole.OWNER:
        if dealership_id:
            query["dealership_id"] = dealership_id
    else:
        query["dealership_id"] = user["dealership_id"]
    
    invites = await db.invites.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [InviteTokenResponse(**i) for i in invites]

@api_router.get("/invites/validate/{token}")
async def validate_invite(token: str):
    """Validate an invite token (public endpoint for registration)"""
    invite = await db.invites.find_one({"token": token}, {"_id": 0})
    
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite token")
    
    if invite["is_used"]:
        raise HTTPException(status_code=400, detail="This invite has already been used")
    
    expires_at = datetime.fromisoformat(invite["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="This invite has expired")
    
    return {
        "valid": True,
        "dealership_name": invite["dealership_name"],
        "role": invite["role"]
    }

@api_router.post("/invites/accept", response_model=TokenResponse)
async def accept_invite(data: AcceptInviteRequest):
    """Accept an invite and create a new user account"""
    invite = await db.invites.find_one({"token": data.token}, {"_id": 0})
    
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite token")
    
    if invite["is_used"]:
        raise HTTPException(status_code=400, detail="This invite has already been used")
    
    expires_at = datetime.fromisoformat(invite["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="This invite has expired")
    
    # Check if email already exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "role": invite["role"],
        "dealership_id": invite["dealership_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Mark invite as used
    await db.invites.update_one(
        {"token": data.token},
        {"$set": {"is_used": True, "used_by": user_id}}
    )
    
    # Generate login token
    token = create_token(user_id, data.email, invite["role"], invite["dealership_id"])
    
    user_response = UserResponse(
        id=user_id,
        email=data.email,
        name=data.name,
        role=invite["role"],
        dealership_id=invite["dealership_id"],
        created_at=user_doc["created_at"]
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.delete("/invites/{invite_id}")
async def delete_invite(invite_id: str, user: dict = Depends(require_role(UserRole.OWNER, UserRole.DEALERSHIP_ADMIN))):
    """Delete an invite token"""
    invite = await db.invites.find_one({"id": invite_id}, {"_id": 0})
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    if user["role"] == UserRole.DEALERSHIP_ADMIN and invite["dealership_id"] != user["dealership_id"]:
        raise HTTPException(status_code=403, detail="Cannot delete invites for other dealerships")
    
    await db.invites.delete_one({"id": invite_id})
    return {"message": "Invite deleted"}

# ============ USER MANAGEMENT ENDPOINTS ============

@api_router.post("/users", response_model=UserResponse)
async def create_user(data: UserCreate, user: dict = Depends(require_role(UserRole.OWNER, UserRole.DEALERSHIP_ADMIN))):
    if user["role"] == UserRole.DEALERSHIP_ADMIN and data.dealership_id != user["dealership_id"]:
        raise HTTPException(status_code=403, detail="Cannot create users for other dealerships")
    
    # Check demo limits
    if user.get("is_demo"):
        user_count = await db.users.count_documents({
            "dealership_id": data.dealership_id,
            "is_demo": {"$ne": True}
        })
        if user_count >= DEMO_MAX_USERS:
            raise HTTPException(status_code=403, detail=f"Demo account limited to {DEMO_MAX_USERS} additional user. Upgrade to add more!")
    
    # Validate PIN
    if not data.pin or not data.pin.isdigit() or len(data.pin) < 4 or len(data.pin) > 6:
        raise HTTPException(status_code=400, detail="PIN must be 4-6 digits")
    
    # Check for duplicate name in the same dealership
    existing_name = await db.users.find_one({
        "dealership_id": data.dealership_id,
        "name": {"$regex": f"^{data.name}$", "$options": "i"}
    })
    if existing_name:
        raise HTTPException(status_code=400, detail="A user with this name already exists in this dealership")
    
    # Check for duplicate email if provided
    if data.email:
        existing_email = await db.users.find_one({"email": data.email})
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": data.name,
        "pin": hash_password(data.pin),  # Store hashed PIN
        "role": data.role,
        "dealership_id": data.dealership_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Add optional fields if provided
    if data.email:
        user_doc["email"] = data.email
    if data.password:
        user_doc["password"] = hash_password(data.password)
    
    await db.users.insert_one(user_doc)
    
    return UserResponse(
        id=user_id,
        email=data.email,
        name=data.name,
        role=data.role,
        dealership_id=data.dealership_id,
        created_at=user_doc["created_at"]
    )

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(dealership_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if user["role"] == UserRole.OWNER:
        if dealership_id:
            query["dealership_id"] = dealership_id
    elif user["role"] == UserRole.DEALERSHIP_ADMIN:
        query["dealership_id"] = user["dealership_id"]
    else:
        query["id"] = user["id"]
    
    users = await db.users.find(query, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, user: dict = Depends(get_current_user)):
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**target_user)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_role(UserRole.OWNER, UserRole.DEALERSHIP_ADMIN))):
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user["role"] == UserRole.DEALERSHIP_ADMIN and target_user.get("dealership_id") != user["dealership_id"]:
        raise HTTPException(status_code=403, detail="Cannot delete users from other dealerships")
    
    await db.users.delete_one({"id": user_id})
    return {"message": "User deleted"}

# ============ KEY MANAGEMENT ENDPOINTS ============

@api_router.post("/keys", response_model=KeyResponse)
async def create_key(data: KeyCreate, user: dict = Depends(require_role(UserRole.OWNER, UserRole.DEALERSHIP_ADMIN))):
    if user["role"] == UserRole.DEALERSHIP_ADMIN and data.dealership_id != user["dealership_id"]:
        raise HTTPException(status_code=403, detail="Cannot create keys for other dealerships")
    
    # Check demo limits
    if user.get("is_demo"):
        key_count = await db.keys.count_documents({"dealership_id": data.dealership_id, "is_active": True})
        if key_count >= DEMO_MAX_KEYS:
            raise HTTPException(status_code=403, detail=f"Demo account limited to {DEMO_MAX_KEYS} keys. Upgrade to add more!")
    
    key_id = str(uuid.uuid4())
    doc = {
        "id": key_id,
        "stock_number": data.stock_number,
        "vehicle_year": data.vehicle_year,
        "vehicle_make": data.vehicle_make,
        "vehicle_model": data.vehicle_model,
        "vehicle_vin": data.vehicle_vin,
        "condition": data.condition,
        "dealership_id": data.dealership_id,
        "status": KeyStatus.AVAILABLE,
        "current_checkout": None,
        "is_active": True,
        # PDI Status - default to NOT_PDI_YET
        "pdi_status": PDIStatus.NOT_PDI_YET,
        "pdi_last_updated_at": None,
        "pdi_last_updated_by_user_id": None,
        "pdi_last_updated_by_user_name": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.keys.insert_one(doc)
    return KeyResponse(**doc)

@api_router.post("/keys/bulk-import")
async def bulk_import_keys(data: KeyBulkImportRequest, user: dict = Depends(require_role(UserRole.OWNER, UserRole.DEALERSHIP_ADMIN))):
    """Bulk import keys from CSV data. Format: condition, stock_number, year, make, model"""
    if user["role"] == UserRole.DEALERSHIP_ADMIN and data.dealership_id != user["dealership_id"]:
        raise HTTPException(status_code=403, detail="Cannot import keys for other dealerships")
    
    # Check demo limits
    if user.get("is_demo"):
        current_count = await db.keys.count_documents({"dealership_id": data.dealership_id, "is_active": True})
        if current_count + len(data.keys) > DEMO_MAX_KEYS:
            raise HTTPException(
                status_code=403, 
                detail=f"Demo account limited to {DEMO_MAX_KEYS} keys. You have {current_count} keys and are trying to add {len(data.keys)}."
            )
    
    created_keys = []
    errors = []
    
    for idx, key_data in enumerate(data.keys):
        try:
            # Validate condition
            condition = key_data.condition.lower().strip()
            if condition not in ['new', 'used']:
                errors.append({"row": idx + 1, "error": f"Invalid condition '{key_data.condition}'. Must be 'new' or 'used'."})
                continue
            
            # Check for duplicate stock number
            existing = await db.keys.find_one({
                "dealership_id": data.dealership_id, 
                "stock_number": key_data.stock_number,
                "is_active": True
            })
            if existing:
                errors.append({"row": idx + 1, "error": f"Stock number '{key_data.stock_number}' already exists."})
                continue
            
            key_id = str(uuid.uuid4())
            doc = {
                "id": key_id,
                "stock_number": key_data.stock_number.strip(),
                "vehicle_year": key_data.vehicle_year,
                "vehicle_make": key_data.vehicle_make.strip() if key_data.vehicle_make else None,
                "vehicle_model": key_data.vehicle_model.strip(),
                "vehicle_vin": None,
                "condition": condition,
                "dealership_id": data.dealership_id,
                "status": KeyStatus.AVAILABLE,
                "current_checkout": None,
                "notes_history": [],
                "is_active": True,
                # PDI Status - default to NOT_PDI_YET
                "pdi_status": PDIStatus.NOT_PDI_YET,
                "pdi_last_updated_at": None,
                "pdi_last_updated_by_user_id": None,
                "pdi_last_updated_by_user_name": None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.keys.insert_one(doc)
            created_keys.append(doc)
        except Exception as e:
            errors.append({"row": idx + 1, "error": str(e)})
    
    return {
        "success": True,
        "imported": len(created_keys),
        "errors": errors,
        "total_submitted": len(data.keys)
    }

@api_router.get("/keys", response_model=List[KeyResponse])
async def get_keys(dealership_id: Optional[str] = None, status: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"is_active": True}
    
    if user["role"] == UserRole.OWNER:
        if dealership_id:
            query["dealership_id"] = dealership_id
    else:
        query["dealership_id"] = user["dealership_id"]
    
    if status:
        query["status"] = status
    
    keys = await db.keys.find(query, {"_id": 0}).to_list(1000)
    return [KeyResponse(**k) for k in keys]

@api_router.get("/keys/{key_id}", response_model=KeyResponse)
async def get_key(key_id: str, user: dict = Depends(get_current_user)):
    key = await db.keys.find_one({"id": key_id}, {"_id": 0})
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    return KeyResponse(**key)

@api_router.put("/keys/{key_id}", response_model=KeyResponse)
async def update_key(key_id: str, data: KeyUpdate, user: dict = Depends(require_role(UserRole.OWNER, UserRole.DEALERSHIP_ADMIN))):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.keys.update_one({"id": key_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Key not found")
    
    key = await db.keys.find_one({"id": key_id}, {"_id": 0})
    return KeyResponse(**key)

@api_router.post("/keys/{key_id}/checkout", response_model=KeyResponse)
async def checkout_key(key_id: str, data: KeyCheckoutRequest, user: dict = Depends(get_current_user)):
    key = await db.keys.find_one({"id": key_id}, {"_id": 0})
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    
    if key["status"] == KeyStatus.CHECKED_OUT:
        raise HTTPException(status_code=400, detail="Key is already checked out")
    
    checkout_info = {
        "user_id": user["id"],
        "user_name": user["name"],
        "reason": data.reason,
        "notes": data.notes,
        "service_bay": data.service_bay,
        "checked_out_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Get existing notes history
    notes_history = key.get("notes_history", [])
    
    # Add current note to history if provided
    if data.notes:
        notes_history.insert(0, {
            "note": data.notes,
            "user_name": user["name"],
            "action": "checkout",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    # Handle attention status and images
    update_data = {
        "status": KeyStatus.CHECKED_OUT, 
        "current_checkout": checkout_info,
        "notes_history": notes_history
    }
    
    # If needs attention is flagged, set status and create repair request
    if data.needs_attention:
        update_data["attention_status"] = AttentionStatus.NEEDS_ATTENTION
        # Store images on the key if provided (up to 3)
        if data.images:
            update_data["images"] = data.images[:3]
        
        # Create repair request
        repair_doc = {
            "id": str(uuid.uuid4()),
            "key_id": key_id,
            "stock_number": key["stock_number"],
            "vehicle_info": f"{key.get('vehicle_year', '')} {key.get('vehicle_make', '')} {key.get('vehicle_model', '')}".strip(),
            "dealership_id": key["dealership_id"],
            "reported_by_id": user["id"],
            "reported_by_name": user["name"],
            "notes": data.notes or "Needs attention",
            "images": data.images[:3] if data.images else [],
            "status": "pending",
            "reported_at": datetime.now(timezone.utc).isoformat(),
            "fixed_by_id": None,
            "fixed_by_name": None,
            "fixed_at": None
        }
        await db.repair_requests.insert_one(repair_doc)
    
    await db.keys.update_one({"id": key_id}, {"$set": update_data})
    
    # Log checkout history
    history_doc = {
        "id": str(uuid.uuid4()),
        "key_id": key_id,
        "dealership_id": key["dealership_id"],
        "action": "checkout",
        **checkout_info
    }
    await db.key_history.insert_one(history_doc)
    
    key = await db.keys.find_one({"id": key_id}, {"_id": 0})
    return KeyResponse(**key)

@api_router.post("/keys/{key_id}/return", response_model=KeyResponse)
async def return_key(key_id: str, data: KeyReturnRequest, user: dict = Depends(get_current_user)):
    key = await db.keys.find_one({"id": key_id}, {"_id": 0})
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    
    if key["status"] != KeyStatus.CHECKED_OUT:
        raise HTTPException(status_code=400, detail="Key is not checked out")
    
    checkout_info = key.get("current_checkout", {})
    returned_at = datetime.now(timezone.utc)
    checked_out_at = datetime.fromisoformat(checkout_info.get("checked_out_at", returned_at.isoformat()))
    duration_minutes = int((returned_at - checked_out_at).total_seconds() / 60)
    
    # Get existing notes history and add return note if provided
    notes_history = key.get("notes_history", [])
    if data.notes:
        notes_history.insert(0, {
            "note": data.notes,
            "user_name": user["name"],
            "action": "return",
            "timestamp": returned_at.isoformat()
        })
    
    # Log return history
    history_doc = {
        "id": str(uuid.uuid4()),
        "key_id": key_id,
        "dealership_id": key["dealership_id"],
        "action": "return",
        "user_id": user["id"],
        "user_name": user["name"],
        "notes": data.notes,
        "returned_at": returned_at.isoformat(),
        "duration_minutes": duration_minutes,
        "original_checkout": checkout_info
    }
    await db.key_history.insert_one(history_doc)
    
    await db.keys.update_one(
        {"id": key_id},
        {"$set": {
            "status": KeyStatus.AVAILABLE, 
            "current_checkout": None,
            "notes_history": notes_history
        }}
    )
    
    key = await db.keys.find_one({"id": key_id}, {"_id": 0})
    return KeyResponse(**key)

@api_router.post("/keys/{key_id}/move-bay", response_model=KeyResponse)
async def move_to_bay(key_id: str, data: BayMoveRequest, user: dict = Depends(get_current_user)):
    key = await db.keys.find_one({"id": key_id}, {"_id": 0})
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    
    if key["status"] != KeyStatus.CHECKED_OUT:
        raise HTTPException(status_code=400, detail="Key is not checked out")
    
    checkout_info = key.get("current_checkout", {})
    old_bay = checkout_info.get("service_bay")
    checkout_info["service_bay"] = data.new_bay
    
    await db.keys.update_one(
        {"id": key_id},
        {"$set": {"current_checkout": checkout_info}}
    )
    
    # Log bay move
    history_doc = {
        "id": str(uuid.uuid4()),
        "key_id": key_id,
        "dealership_id": key["dealership_id"],
        "action": "bay_move",
        "user_id": user["id"],
        "user_name": user["name"],
        "old_bay": old_bay,
        "new_bay": data.new_bay,
        "moved_at": datetime.now(timezone.utc).isoformat()
    }
    await db.key_history.insert_one(history_doc)
    
    key = await db.keys.find_one({"id": key_id}, {"_id": 0})
    return KeyResponse(**key)

# ============ REPAIR REQUEST ENDPOINTS ============

@api_router.post("/keys/{key_id}/mark-fixed", response_model=KeyResponse)
async def mark_key_fixed(key_id: str, data: KeyMarkFixedRequest, user: dict = Depends(get_current_user)):
    """Mark a key as fixed (any user can do this)"""
    key = await db.keys.find_one({"id": key_id}, {"_id": 0})
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    
    if key.get("attention_status") != AttentionStatus.NEEDS_ATTENTION:
        raise HTTPException(status_code=400, detail="Key is not marked as needing attention")
    
    now = datetime.now(timezone.utc)
    
    # Update key status
    await db.keys.update_one(
        {"id": key_id},
        {"$set": {"attention_status": AttentionStatus.FIXED}}
    )
    
    # Update repair request
    await db.repair_requests.update_one(
        {"key_id": key_id, "status": "pending"},
        {"$set": {
            "status": "fixed",
            "fixed_by_id": user["id"],
            "fixed_by_name": user["name"],
            "fixed_at": now.isoformat(),
            "fix_notes": data.notes
        }}
    )
    
    # Log the fix action
    notes_history = key.get("notes_history", [])
    notes_history.insert(0, {
        "note": data.notes or "Marked as fixed",
        "user_name": user["name"],
        "action": "marked_fixed",
        "timestamp": now.isoformat()
    })
    await db.keys.update_one({"id": key_id}, {"$set": {"notes_history": notes_history}})
    
    key = await db.keys.find_one({"id": key_id}, {"_id": 0})
    return KeyResponse(**key)

@api_router.get("/repair-requests", response_model=List[RepairRequestResponse])
async def get_repair_requests(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Get all repair requests for the dealership"""
    query = {}
    
    if user["role"] == UserRole.OWNER:
        pass  # Owner sees all
    else:
        query["dealership_id"] = user["dealership_id"]
    
    if status:
        query["status"] = status
    
    requests = await db.repair_requests.find(query, {"_id": 0}).sort("reported_at", -1).to_list(500)
    return [RepairRequestResponse(**r) for r in requests]

@api_router.delete("/repair-requests/{request_id}")
async def clear_repair_request(request_id: str, user: dict = Depends(require_role(UserRole.OWNER, UserRole.DEALERSHIP_ADMIN))):
    """Clear/delete a repair request (admin only)"""
    request = await db.repair_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Repair request not found")
    
    if user["role"] == UserRole.DEALERSHIP_ADMIN and request["dealership_id"] != user["dealership_id"]:
        raise HTTPException(status_code=403, detail="Cannot delete repair requests from other dealerships")
    
    # Reset key attention status to none
    await db.keys.update_one(
        {"id": request["key_id"]},
        {"$set": {"attention_status": AttentionStatus.NONE, "images": []}}
    )
    
    await db.repair_requests.delete_one({"id": request_id})
    return {"message": "Repair request cleared"}

@api_router.post("/keys/{key_id}/add-images", response_model=KeyResponse)
async def add_key_images(key_id: str, images: List[str], user: dict = Depends(get_current_user)):
    """Add images to a key (up to 3 total)"""
    key = await db.keys.find_one({"id": key_id}, {"_id": 0})
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    
    existing_images = key.get("images", [])
    all_images = existing_images + images
    
    # Limit to 3 images
    await db.keys.update_one(
        {"id": key_id},
        {"$set": {"images": all_images[:3]}}
    )
    
    key = await db.keys.find_one({"id": key_id}, {"_id": 0})
    return KeyResponse(**key)

@api_router.post("/upload-image")
async def upload_image(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload an image file and return its URL"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: JPEG, PNG, WebP, GIF")
    
    # Limit file size to 5MB
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB")
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = UPLOAD_DIR / filename
    
    # Save file
    with open(filepath, "wb") as f:
        f.write(content)
    
    # Return URL (through /api/ for proper routing)
    return {"url": f"/api/uploads/{filename}"}

@api_router.post("/upload-image-base64")
async def upload_image_base64(data: dict, user: dict = Depends(get_current_user)):
    """Upload an image as base64 and return its URL"""
    image_data = data.get("image")
    if not image_data:
        raise HTTPException(status_code=400, detail="No image data provided")
    
    # Remove data URL prefix if present
    if "," in image_data:
        image_data = image_data.split(",")[1]
    
    try:
        content = base64.b64decode(image_data)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image data")
    
    # Limit file size to 5MB
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB")
    
    # Detect file type from content or use jpg
    ext = "jpg"
    if content[:8] == b'\x89PNG\r\n\x1a\n':
        ext = "png"
    elif content[:4] == b'RIFF' and content[8:12] == b'WEBP':
        ext = "webp"
    elif content[:3] == b'GIF':
        ext = "gif"
    
    # Generate unique filename
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = UPLOAD_DIR / filename
    
    # Save file
    with open(filepath, "wb") as f:
        f.write(content)
    
    # Return URL (through /api/ for proper routing)
    return {"url": f"/api/uploads/{filename}"}

@api_router.get("/keys/{key_id}/history")
async def get_key_history(key_id: str, user: dict = Depends(get_current_user)):
    history = await db.key_history.find({"key_id": key_id}, {"_id": 0}).sort("checked_out_at", -1).to_list(100)
    return history

@api_router.get("/checkout-history")
async def get_checkout_history(dealership_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if user["role"] == UserRole.OWNER:
        if dealership_id:
            query["dealership_id"] = dealership_id
    else:
        query["dealership_id"] = user["dealership_id"]
    
    history = await db.key_history.find(query, {"_id": 0}).sort("checked_out_at", -1).to_list(500)
    return history

# ============ TIME ALERTS ============

@api_router.post("/time-alerts", response_model=TimeAlertResponse)
async def create_time_alert(data: TimeAlertCreate, user: dict = Depends(require_role(UserRole.OWNER, UserRole.DEALERSHIP_ADMIN))):
    alert_id = str(uuid.uuid4())
    doc = {
        "id": alert_id,
        "dealership_id": data.dealership_id,
        "alert_minutes": data.alert_minutes,
        "is_active": data.is_active
    }
    await db.time_alerts.insert_one(doc)
    return TimeAlertResponse(**doc)

@api_router.get("/time-alerts", response_model=List[TimeAlertResponse])
async def get_time_alerts(dealership_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if user["role"] != UserRole.OWNER:
        query["dealership_id"] = user["dealership_id"]
    elif dealership_id:
        query["dealership_id"] = dealership_id
    
    alerts = await db.time_alerts.find(query, {"_id": 0}).to_list(100)
    return [TimeAlertResponse(**a) for a in alerts]

@api_router.put("/time-alerts/{alert_id}", response_model=TimeAlertResponse)
async def update_time_alert(alert_id: str, alert_minutes: int, is_active: bool = True, user: dict = Depends(require_role(UserRole.OWNER, UserRole.DEALERSHIP_ADMIN))):
    result = await db.time_alerts.update_one(
        {"id": alert_id},
        {"$set": {"alert_minutes": alert_minutes, "is_active": is_active}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert = await db.time_alerts.find_one({"id": alert_id}, {"_id": 0})
    return TimeAlertResponse(**alert)

@api_router.get("/overdue-keys")
async def get_overdue_keys(user: dict = Depends(get_current_user)):
    # Get time alert settings
    query = {}
    if user["role"] != UserRole.OWNER:
        query["dealership_id"] = user["dealership_id"]
    
    alerts = await db.time_alerts.find(query, {"_id": 0}).to_list(100)
    alert_map = {a["dealership_id"]: a["alert_minutes"] for a in alerts if a["is_active"]}
    
    # Get checked out keys
    key_query = {"status": KeyStatus.CHECKED_OUT}
    if user["role"] != UserRole.OWNER:
        key_query["dealership_id"] = user["dealership_id"]
    
    keys = await db.keys.find(key_query, {"_id": 0}).to_list(1000)
    
    overdue_keys = []
    now = datetime.now(timezone.utc)
    
    for key in keys:
        alert_minutes = alert_map.get(key["dealership_id"], 30)  # Default 30 min
        checkout = key.get("current_checkout", {})
        if checkout:
            checked_out_at = datetime.fromisoformat(checkout["checked_out_at"])
            elapsed = (now - checked_out_at).total_seconds() / 60
            if elapsed > alert_minutes:
                key["overdue_minutes"] = int(elapsed - alert_minutes)
                key["elapsed_minutes"] = int(elapsed)
                overdue_keys.append(key)
    
    return overdue_keys

# ============ SALES TRACKER ENDPOINTS ============

@api_router.post("/sales-goals", response_model=SalesGoalResponse)
async def create_sales_goal(data: SalesGoalCreate, user: dict = Depends(get_current_user)):
    # Check if goal already exists for this year
    existing = await db.sales_goals.find_one({"user_id": user["id"], "year": data.year})
    if existing:
        raise HTTPException(status_code=400, detail="Goal already exists for this year. Use update instead.")
    
    goal_id = str(uuid.uuid4())
    doc = {
        "id": goal_id,
        "user_id": user["id"],
        "year": data.year,
        "yearly_sales_target": data.yearly_sales_target,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.sales_goals.insert_one(doc)
    return SalesGoalResponse(**doc)

@api_router.get("/sales-goals", response_model=List[SalesGoalResponse])
async def get_sales_goals(user_id: Optional[str] = None, year: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    
    if current_user["role"] == UserRole.USER:
        query["user_id"] = current_user["id"]
    elif current_user["role"] == UserRole.DEALERSHIP_ADMIN:
        # Get all users in dealership
        users = await db.users.find({"dealership_id": current_user["dealership_id"]}, {"id": 1}).to_list(1000)
        user_ids = [u["id"] for u in users]
        if user_id and user_id in user_ids:
            query["user_id"] = user_id
        else:
            query["user_id"] = {"$in": user_ids}
    elif user_id:
        query["user_id"] = user_id
    
    if year:
        query["year"] = year
    
    goals = await db.sales_goals.find(query, {"_id": 0}).to_list(100)
    return [SalesGoalResponse(**g) for g in goals]

@api_router.put("/sales-goals/{goal_id}", response_model=SalesGoalResponse)
async def update_sales_goal(goal_id: str, data: SalesGoalCreate, user: dict = Depends(get_current_user)):
    goal = await db.sales_goals.find_one({"id": goal_id}, {"_id": 0})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    if goal["user_id"] != user["id"] and user["role"] not in [UserRole.OWNER, UserRole.DEALERSHIP_ADMIN]:
        raise HTTPException(status_code=403, detail="Cannot update other users' goals")
    
    update_data = data.model_dump()
    await db.sales_goals.update_one({"id": goal_id}, {"$set": update_data})
    
    goal = await db.sales_goals.find_one({"id": goal_id}, {"_id": 0})
    return SalesGoalResponse(**goal)

@api_router.post("/daily-activities", response_model=DailyActivityResponse)
async def create_daily_activity(data: DailyActivityCreate, user: dict = Depends(get_current_user)):
    # Check if entry exists for this date
    existing = await db.daily_activities.find_one({"user_id": user["id"], "date": data.date})
    if existing:
        # Update existing
        update_data = data.model_dump()
        await db.daily_activities.update_one({"id": existing["id"]}, {"$set": update_data})
        activity = await db.daily_activities.find_one({"id": existing["id"]}, {"_id": 0})
        return DailyActivityResponse(**activity)
    
    activity_id = str(uuid.uuid4())
    doc = {
        "id": activity_id,
        "user_id": user["id"],
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.daily_activities.insert_one(doc)
    return DailyActivityResponse(**doc)

@api_router.get("/daily-activities", response_model=List[DailyActivityResponse])
async def get_daily_activities(
    user_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if current_user["role"] == UserRole.USER:
        query["user_id"] = current_user["id"]
    elif current_user["role"] == UserRole.DEALERSHIP_ADMIN:
        users = await db.users.find({"dealership_id": current_user["dealership_id"]}, {"id": 1}).to_list(1000)
        user_ids = [u["id"] for u in users]
        if user_id and user_id in user_ids:
            query["user_id"] = user_id
        else:
            query["user_id"] = {"$in": user_ids}
    elif user_id:
        query["user_id"] = user_id
    
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    
    activities = await db.daily_activities.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return [DailyActivityResponse(**a) for a in activities]

@api_router.get("/sales-progress/{user_id}", response_model=SalesProgressResponse)
async def get_sales_progress(user_id: str, year: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    if not year:
        year = datetime.now().year
    
    # Check access
    if current_user["role"] == UserRole.USER and current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Cannot view other users' progress")
    
    if current_user["role"] == UserRole.DEALERSHIP_ADMIN:
        target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if target_user and target_user.get("dealership_id") != current_user["dealership_id"]:
            raise HTTPException(status_code=403, detail="Cannot view users from other dealerships")
    
    # Get goal
    goal = await db.sales_goals.find_one({"user_id": user_id, "year": year}, {"_id": 0})
    
    # Get activities for the year
    start_date = f"{year}-01-01"
    end_date = f"{year}-12-31"
    activities = await db.daily_activities.find(
        {"user_id": user_id, "date": {"$gte": start_date, "$lte": end_date}},
        {"_id": 0}
    ).to_list(366)
    
    # Calculate totals
    total_leads = sum(a.get("leads_walk_in", 0) + a.get("leads_phone", 0) + a.get("leads_internet", 0) for a in activities)
    total_writeups = sum(a.get("writeups", 0) for a in activities)
    total_sales = sum(a.get("sales", 0) for a in activities)
    total_appointments = sum(a.get("appointments_scheduled", 0) for a in activities)
    days_worked = sum(1 for a in activities if a.get("worked", True))
    days_off = sum(1 for a in activities if not a.get("worked", True))
    
    # Calculate progress
    now = datetime.now()
    year_start = datetime(year, 1, 1)
    year_end = datetime(year, 12, 31)
    
    if now.year == year:
        days_elapsed = (now - year_start).days + 1
        days_remaining = (year_end - now).days
    elif now.year > year:
        days_elapsed = 365
        days_remaining = 0
    else:
        days_elapsed = 0
        days_remaining = 365
    
    goal_response = SalesGoalResponse(**goal) if goal else None
    sales_target = goal["yearly_sales_target"] if goal else 0
    
    # Calculate what's needed
    sales_needed_remaining = max(0, sales_target - total_sales)
    
    # Weekly and monthly sales needed to hit goal (adjusted based on remaining time)
    weeks_remaining = max(1, days_remaining / 7)
    months_remaining = max(1, days_remaining / 30)
    weekly_sales_needed = sales_needed_remaining / weeks_remaining if weeks_remaining > 0 else 0
    monthly_sales_needed = sales_needed_remaining / months_remaining if months_remaining > 0 else 0
    
    # Current pace
    current_pace_per_day = total_sales / days_worked if days_worked > 0 else 0
    projected_annual = int(current_pace_per_day * 365) if days_worked > 0 else 0
    
    # Calculate probability based on pace vs target
    if sales_target > 0 and days_elapsed > 0:
        expected_by_now = (sales_target / 365) * days_elapsed
        if expected_by_now > 0:
            pace_ratio = total_sales / expected_by_now
            probability = min(100, max(0, pace_ratio * 100))
        else:
            probability = 0
    else:
        probability = 0 if sales_target > 0 else 100
    
    on_track = total_sales >= (sales_target / 365) * days_elapsed if sales_target > 0 else True
    
    return SalesProgressResponse(
        goal=goal_response,
        total_leads=total_leads,
        total_writeups=total_writeups,
        total_sales=total_sales,
        total_appointments=total_appointments,
        days_worked=days_worked,
        days_off=days_off,
        days_elapsed=days_elapsed,
        days_remaining=days_remaining,
        sales_needed_remaining=sales_needed_remaining,
        weekly_sales_needed=round(weekly_sales_needed, 1),
        monthly_sales_needed=round(monthly_sales_needed, 1),
        current_pace_per_day=round(current_pace_per_day, 2),
        projected_annual_sales=projected_annual,
        goal_achievement_probability=round(probability, 1),
        on_track=on_track
    )

@api_router.get("/team-sales-progress")
async def get_team_sales_progress(year: Optional[int] = None, current_user: dict = Depends(require_role(UserRole.OWNER, UserRole.DEALERSHIP_ADMIN))):
    if not year:
        year = datetime.now().year
    
    if current_user["role"] == UserRole.DEALERSHIP_ADMIN:
        users = await db.users.find({"dealership_id": current_user["dealership_id"]}, {"_id": 0, "password": 0}).to_list(1000)
    else:
        users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    
    team_progress = []
    for user in users:
        if user["role"] == UserRole.OWNER:
            continue
        
        # Get goal
        goal = await db.sales_goals.find_one({"user_id": user["id"], "year": year}, {"_id": 0})
        
        # Get activities
        start_date = f"{year}-01-01"
        end_date = f"{year}-12-31"
        activities = await db.daily_activities.find(
            {"user_id": user["id"], "date": {"$gte": start_date, "$lte": end_date}},
            {"_id": 0}
        ).to_list(366)
        
        total_sales = sum(a.get("sales", 0) for a in activities)
        total_leads = sum(a.get("leads_walk_in", 0) + a.get("leads_phone", 0) + a.get("leads_internet", 0) for a in activities)
        
        sales_target = goal["yearly_sales_target"] if goal else 0
        progress_percent = (total_sales / sales_target * 100) if sales_target > 0 else 0
        
        team_progress.append({
            "user_id": user["id"],
            "user_name": user["name"],
            "dealership_id": user.get("dealership_id"),
            "sales_target": sales_target,
            "total_sales": total_sales,
            "total_leads": total_leads,
            "progress_percent": round(progress_percent, 1)
        })
    
    return team_progress

# ============ SERVICE BAYS (RV) ============

@api_router.get("/service-bays/{dealership_id}")
async def get_service_bays(dealership_id: str, user: dict = Depends(get_current_user)):
    dealership = await db.dealerships.find_one({"id": dealership_id}, {"_id": 0})
    if not dealership:
        raise HTTPException(status_code=404, detail="Dealership not found")
    
    if dealership["dealership_type"] != DealershipType.RV:
        raise HTTPException(status_code=400, detail="Service bays only available for RV dealerships")
    
    # Get keys currently in service bays
    keys = await db.keys.find({
        "dealership_id": dealership_id,
        "status": KeyStatus.CHECKED_OUT,
        "current_checkout.service_bay": {"$ne": None}
    }, {"_id": 0}).to_list(100)
    
    bays = []
    for i in range(1, dealership["service_bays"] + 1):
        bay_key = next((k for k in keys if k.get("current_checkout", {}).get("service_bay") == i), None)
        bays.append({
            "bay_number": i,
            "is_occupied": bay_key is not None,
            "key": bay_key
        })
    
    return bays

# ============ STATS ============

@api_router.get("/stats/dashboard")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    query = {}
    if user["role"] != UserRole.OWNER:
        query["dealership_id"] = user["dealership_id"]
    
    total_keys = await db.keys.count_documents({**query, "is_active": True})
    checked_out = await db.keys.count_documents({**query, "status": KeyStatus.CHECKED_OUT})
    available = total_keys - checked_out
    
    # Get overdue count
    overdue_keys = await get_overdue_keys(user)
    overdue = len(overdue_keys)
    
    # User stats
    user_query = {}
    if user["role"] == UserRole.DEALERSHIP_ADMIN:
        user_query["dealership_id"] = user["dealership_id"]
    
    total_users = await db.users.count_documents(user_query)
    
    # Dealership stats (owner only)
    total_dealerships = await db.dealerships.count_documents({}) if user["role"] == UserRole.OWNER else 1
    
    return {
        "total_keys": total_keys,
        "available_keys": available,
        "checked_out_keys": checked_out,
        "overdue_keys": overdue,
        "total_users": total_users,
        "total_dealerships": total_dealerships
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
