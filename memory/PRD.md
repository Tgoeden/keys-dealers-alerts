# KeyFlow - Product Requirements Document

## Original Problem Statement
Build a web app called "KeyFlow" for automotive and RV dealerships to manage vehicle keys, track who has them, and monitor key usage.

## User Personas
1. **Master Owner**: Controls all dealerships, can create unlimited dealerships, has PIN 9988 for access
2. **Dealership Admin**: Manages a single dealership, has their own PIN, can create/manage users
3. **Staff Users**: Sales, Service, Delivery, Porter, Lot Tech roles - can checkout/return keys

## Core Features

### Authentication System
- **Master Owner**: 5-tap logo → enter PIN (9988)
- **Admin Login**: Select dealership → Enter PIN (quick access)
- **Staff Login**: Select dealership → Enter name → Enter PIN
- **Remember Me**: Keeps session active; without it, 6-hour inactivity timeout
- **Demo Mode**: Quick demo with limited features (4 keys max)

### Key Management
- Check out keys with reason, notes, optional images
- Return keys
- "Needs Attention" flag for repair/service with photo upload (up to 3)
- Notes history on each key
- Filter by status (Available/Checked Out)
- Bulk CSV import

### Repair/Maintenance Module
- Flag units as "Needs Attention" during checkout
- Attach up to 3 photos with notes
- "Needs Attention" page shows all flagged units
- Any user can mark as "Fixed"
- Only admin can clear from repair log
- Timestamps and user attribution on all actions

### User Management
- Create users with Name + PIN (no email required)
- Standard roles: Sales, Service, Delivery, Porter, Lot Tech
- Custom roles can be added by admin
- All non-admin roles have same permissions

### Settings
- Change PIN (admins and users)
- Custom role management
- Branding (logo URL, colors)
- Key alert threshold

### Hidden Features
- Sales Tracker (suspended, hidden from UI)

## Technical Stack
- **Backend**: FastAPI (Python)
- **Frontend**: React with Tailwind CSS, Shadcn/UI
- **Database**: MongoDB
- **Authentication**: JWT tokens, PIN-based login
- **Image Storage**: Local file storage (/app/backend/uploads/)

## What's Been Implemented (as of Jan 2026)

### Phase 1: Core MVP ✅
- User authentication (owner, admin, user roles)
- Dealership management
- Key check-in/out system
- Notes history
- Basic UI with dark theme

### Phase 2: Advanced Features ✅
- Persistent login with "Remember Me" (7-day token)
- CSV bulk key upload
- PWA support (home screen icon)
- Share Access with invite links
- Help page with FAQ
- Logs & Reports with activity history
- Deployment readiness

### Phase 3: Major Feature Expansion ✅ (Current)
- **Admin PIN System**: Admins have their own PIN, separate login flow
- **User PIN Login**: Staff login with name + PIN only (6-hour inactivity timeout)
- **Repair/Maintenance Module**: 
  - "Needs Attention" flag with photos
  - Repair requests collection
  - Mark fixed / Admin clear functionality
  - Dedicated "Needs Attention" page
- **Custom User Roles**: Sales, Service, Delivery, Porter, Lot Tech + custom
- **Image Upload**: Local file storage with base64 upload
- **Sales Tracker Hidden**: Suspended per user request

## API Endpoints

### Authentication
- `POST /api/auth/owner-login` - Owner PIN login
- `POST /api/auth/admin-pin-login` - Admin quick login with PIN
- `POST /api/auth/user-pin-login` - Staff login with name + PIN
- `POST /api/auth/demo-login` - Demo mode
- `POST /api/auth/change-admin-pin` - Change admin PIN
- `POST /api/auth/change-user-pin` - Change user PIN
- `GET /api/dealerships/public` - Public dealership list for login

### Keys
- `GET /api/keys` - Get all keys
- `POST /api/keys` - Create key
- `POST /api/keys/{id}/checkout` - Checkout with needs_attention flag
- `POST /api/keys/{id}/return` - Return key
- `POST /api/keys/{id}/mark-fixed` - Mark as fixed

### Repair Requests
- `GET /api/repair-requests` - Get repair requests
- `DELETE /api/repair-requests/{id}` - Admin clear repair

### Images
- `POST /api/upload-image-base64` - Upload image
- `/uploads/{filename}` - Serve uploaded images

### Roles
- `GET /api/dealerships/{id}/roles` - Get roles
- `POST /api/dealerships/{id}/roles` - Add custom role
- `DELETE /api/dealerships/{id}/roles/{name}` - Remove custom role

## Database Collections

### users
```json
{
  "id": "uuid",
  "name": "string",
  "email": "optional string",
  "pin": "hashed string",
  "admin_pin": "hashed string (for admins)",
  "role": "owner|dealership_admin|sales|service|etc",
  "dealership_id": "uuid",
  "created_at": "ISO datetime"
}
```

### keys
```json
{
  "id": "uuid",
  "stock_number": "string",
  "vehicle_make": "string",
  "vehicle_model": "string",
  "vehicle_year": "int",
  "status": "available|checked_out",
  "attention_status": "none|needs_attention|fixed",
  "images": ["url", "url", "url"],
  "notes_history": [{...}],
  "current_checkout": {...},
  "dealership_id": "uuid"
}
```

### repair_requests
```json
{
  "id": "uuid",
  "key_id": "uuid",
  "stock_number": "string",
  "vehicle_info": "string",
  "dealership_id": "uuid",
  "reported_by_id": "uuid",
  "reported_by_name": "string",
  "notes": "string",
  "images": ["url"],
  "status": "pending|fixed",
  "reported_at": "ISO datetime",
  "fixed_by_id": "uuid|null",
  "fixed_by_name": "string|null",
  "fixed_at": "ISO datetime|null"
}
```

## Backlog (P2/P3)

1. **Payment/Subscription Integration** - Stripe integration for dealership subscriptions
2. **Time Alerts for Overdue Keys** - Backend scheduled task for notifications
3. **Re-activate Sales Tracker** - Owner-only access to Sales Tracker feature
4. **Email Notifications** - Optional email alerts for key activity
5. **Advanced Reporting** - Export to CSV/PDF, custom date ranges

## Test Credentials
- **Owner**: 5 logo taps → PIN `9988`
- **Demo**: Click "Try Demo" button
- **Admin/User**: Create via owner then login with dealership + PIN
