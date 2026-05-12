# Role-Based Access Control (RBAC) Implementation

## Overview

This document describes the RBAC implementation for the Inventory Management System. The system provides role-based authentication and authorization for both backend API and frontend UI.

## Roles

The system defines four roles, each with specific permissions:

### 1. Admin
- **Level:** 4 (highest)
- **Description:** Full system access
- **Permissions:**
  - User management: `user:create`, `user:read`, `user:update`, `user:delete`
  - Product management: `product:create`, `product:read`, `product:update`, `product:delete`
  - Warehouse management: `warehouse:create`, `warehouse:read`, `warehouse:update`, `warehouse:delete`
  - Order management: `order:create`, `order:read`, `order:update`, `order:delete`, `order:approve_discount`, `order:cancel`
  - Supply management: `supply:create`, `supply:read`, `supply:update`, `supply:delete`
  - Reports: `report:view_all`, `report:export`
  - System: `system:settings`, `system:logs`

### 2. Sales
- **Level:** 2
- **Description:** Sales operations and order management
- **Permissions:**
  - Products: `product:read`
  - Orders: `order:create`, `order:read`, `order:update`, `order:request_discount`
  - Customers: `customer:create`, `customer:read`, `customer:update`
  - Reports: `report:view_own`

### 3. Warehouse
- **Level:** 2
- **Description:** Warehouse and inventory management
- **Permissions:**
  - Products: `product:read`, `product:update_stock`
  - Warehouse: `warehouse:read`, `warehouse:update_stock`
  - Stock: `stock:receive`, `stock:transfer`, `stock:adjust`, `stock:read`
  - Inventory: `inventory:read`, `inventory:update`
  - Reports: `report:view_warehouse`

### 4. Supply
- **Level:** 2
- **Description:** Procurement and supplier management
- **Permissions:**
  - Suppliers: `supplier:create`, `supplier:read`, `supplier:update`
  - Supply orders: `supply:create`, `supply:read`, `supply:update`
  - Products: `product:read`
  - Reports: `report:view_supply`

## Backend Implementation

### File Structure

```
backend/src/
├── middleware/
│   └── authMiddleware.js    # Authentication & Authorization middleware
├── controllers/
│   ├── authController.js    # Login, logout, user info endpoints
│   └── ...
└── routes/
    ├── authRoutes.js        # Auth route definitions
    ├── userRoutes.js        # Protected user routes
    ├── productroutes.js     # Protected product routes
    └── Warehouseroutes.js   # Protected warehouse routes
```

### Middleware (`authMiddleware.js`)

The middleware provides three main functions:

1. **`authenticate`** - Verifies user token and attaches user to request
2. **`authorize(...permissions)`** - Checks if user has required permissions
3. **`restrictToRoutes(...prefixes)`** - Limits access to specific route prefixes

### Usage Example

```javascript
const { authenticate, authorize } = require('./middleware/authMiddleware');

// Protect a route with authentication
router.get('/products', authenticate, getAllProducts);

// Require specific permission
router.post('/products', authenticate, authorize('product:create'), createProduct);

// Multiple permissions (any one grants access)
router.delete('/products/:id', 
    authenticate, 
    authorize('product:delete', 'admin:override'), 
    deleteProduct
);
```

### API Endpoints

| Endpoint | Method | Auth Required | Permissions | Description |
|----------|--------|---------------|-------------|-------------|
| `/api/auth/login` | POST | No | - | User login |
| `/api/auth/logout` | POST | Yes | - | User logout |
| `/api/auth/me` | GET | Yes | - | Get current user |
| `/api/auth/roles` | GET | No | - | List available roles |
| `/api/auth/change-password` | PUT | Yes | - | Change password |
| `/api/users/*` | ALL | Yes | Admin only | User management |
| `/api/products/*` | ALL | Yes | Varies | Product operations |
| `/api/warehouses/*` | ALL | Yes | Varies | Warehouse operations |

## Frontend Implementation

### File Structure

```
frontend/
├── login.html           # Login page
├── auth.js              # Authentication utility
├── dashboard.html       # Role-based dashboard
├── Products.html        # Products page (RBAC-enabled)
└── products.js          # Products logic (RBAC-aware)
```

### Auth Utility (`auth.js`)

Key functions:

```javascript
// Login and store user data
Auth.login(authData);

// Logout and redirect to login
Auth.logout();

// Check if user is authenticated
Auth.isAuthenticated();

// Get current user
Auth.getUser();

// Get auth token for API requests
Auth.getToken();

// Check if user has specific permission
Auth.hasPermission('product:create');

// Check if user has specific role
Auth.isRole('admin');

// Make authenticated fetch request
const response = await Auth.fetch('/api/products');

// Require authentication (redirects if not logged in)
Auth.requireAuth();

// Require specific role
Auth.requireRole('admin', 'sales');

// Render navigation based on role
RBAC.renderNavigation('#sidebar-nav');

// Show/hide elements based on permission
RBAC.showIfPermission('product:create', '.create-btn');
RBAC.showIfRole(['admin', 'warehouse'], '.warehouse-link');
```

### Login Flow

1. User enters credentials on `login.html`
2. Frontend sends POST to `/api/auth/login`
3. On success, server returns user data + token
4. Frontend stores auth data in localStorage
5. User is redirected to role-appropriate dashboard

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ims.com | admin123 |
| Sales | sales@ims.com | sales123 |
| Warehouse | warehouse@ims.com | warehouse123 |
| Supply | supply@ims.com | supply123 |

## Security Considerations

### Current Implementation (Demo)

- Tokens are simple email strings (for demo purposes)
- Passwords are stored in plain text in database
- Session expires after 8 hours

### Production Recommendations

1. **Use JWT tokens** with proper signing
2. **Hash passwords** using bcrypt or argon2
3. **Implement refresh tokens** for session renewal
4. **Add rate limiting** on login endpoint
5. **Use HTTPS** for all communications
6. **Implement CSRF protection** for state-changing operations
7. **Add audit logging** for sensitive operations

## Database Schema

The `users` table includes:

```sql
CREATE TYPE user_role AS ENUM ('admin', 'sales', 'warehouse', 'supply');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    -- ... other fields
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Testing

### Test Authentication

```bash
# Login as admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ims.com","password":"admin123"}'

# Access protected endpoint
curl http://localhost:3000/api/users \
  -H "Authorization: admin@ims.com"

# Should fail without auth
curl http://localhost:3000/api/users
```

### Test Authorization

```bash
# Sales user trying to access user management (should fail)
curl http://localhost:3000/api/users \
  -H "Authorization: sales@ims.com"

# Admin accessing user management (should succeed)
curl http://localhost:3000/api/users \
  -H "Authorization: admin@ims.com"
```

## Future Enhancements

1. **Permission Groups** - Allow custom permission sets
2. **Resource-based access** - Limit access to specific warehouses/products
3. **Time-based restrictions** - Limit access by time of day
4. **Two-factor authentication** - Add 2FA support
5. **SSO integration** - Support OAuth providers
6. **Password policies** - Enforce complexity requirements
7. **Account lockout** - Lock after failed attempts

## Files Modified/Created

### Backend
- `backend/src/middleware/authMiddleware.js` (new)
- `backend/src/controllers/authController.js` (new)
- `backend/src/routes/authRoutes.js` (new)
- `backend/src/routes/userRoutes.js` (modified)
- `backend/src/routes/productroutes.js` (modified)
- `backend/src/routes/Warehouseroutes.js` (modified)
- `backend/src/app.js` (modified)

### Frontend
- `frontend/login.html` (new)
- `frontend/auth.js` (new)
- `frontend/dashboard.html` (new)
- `frontend/Products.html` (modified)
- `frontend/products.js` (modified)

## Quick Start

1. Ensure database is set up with schema from `database/schema.sql`
2. Install dependencies: `cd backend && npm install`
3. Start backend: `npm start` or `node src/app.js`
4. Open frontend: `frontend/login.html` in browser
5. Login with demo credentials

---

*Document created: April 2026*
*Version: 1.0.0*