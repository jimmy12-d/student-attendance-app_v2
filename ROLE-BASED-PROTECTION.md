# Role-Based Route Protection Implementation

## Overview
This implementation provides comprehensive role-based route protection for the student attendance app, preventing unauthorized access to admin, teacher, and student areas.

## Components Added

### 1. RouteGuard Component (`app/_components/RouteGuard.tsx`)
- Client-side route protection component
- Checks user authentication and role before allowing access
- Automatically redirects users to their appropriate dashboard if they try to access unauthorized routes
- Shows loading state while checking authentication
- Displays access denied message for unauthorized users

### 2. Authentication Utilities (`app/_lib/authUtils.ts`)
- Helper functions for role-based routing
- `getDefaultRouteForRole()` - Returns appropriate route for each role
- `isAuthorizedForRoute()` - Checks if user role matches required role
- `getRouteRequiredRole()` - Determines required role for a given route

### 3. useAuth Hook (`app/_hooks/useAuth.ts`)
- Centralized authentication state management
- Provides loading states and user information
- Handles Firebase auth state changes

## Route Protection Implementation

### Admin Routes (`/dashboard/*`, `/admin/*`)
- **Required Role**: `admin`
- **Protection**: 
  - Dashboard layout checks for admin authorization in Firebase `authorizedUsers` collection
  - RouteGuard prevents non-admin access to admin routes
- **Redirect**: Admin users go to `/dashboard`

### Teacher Routes (`/teacher/*`)
- **Required Role**: `teacher`
- **Protection**: Teacher pages wrapped with `RouteGuard` requiring teacher role
- **Redirect**: Teacher users go to `/teacher`

### Student Routes (`/student/*`)
- **Required Role**: `student`
- **Protection**: Student layout wrapped with `RouteGuard` requiring student role
- **Redirect**: Student users go to `/student`

## Middleware Updates (`middleware.ts`)
- Enhanced to add role requirement headers for protected routes
- Maintains PWA compatibility
- Sets `X-Required-Role` and `X-Protected-Route` headers for protected routes

## How It Works

1. **Authentication Flow**:
   - User logs in through `/login` (accessible to all)
   - Login component authenticates and sets user role in Redux store
   - User is redirected to their role-specific dashboard

2. **Route Protection**:
   - Each protected route is wrapped with `RouteGuard`
   - `RouteGuard` checks user authentication and role
   - If unauthorized, user is redirected to appropriate route or login

3. **Role-Based Redirection**:
   - Root path (`/`) automatically redirects based on user role
   - Unauthorized access attempts redirect to user's appropriate dashboard
   - Unauthenticated users always go to `/login`

## Usage Examples

### Protecting a Page
```tsx
import RouteGuard from '../_components/RouteGuard';

const ProtectedPage = () => {
  return (
    <RouteGuard requiredRole="admin">
      <YourPageContent />
    </RouteGuard>
  );
};
```

### Using Auth Hook
```tsx
import useAuth from '../_hooks/useAuth';

const MyComponent = () => {
  const { isLoading, isAuthenticated, user } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please login</div>;
  
  return <div>Welcome {user?.name}!</div>;
};
```

## Security Features

1. **Client-Side Protection**: Immediate UI protection with RouteGuard
2. **Server-Side Headers**: Middleware adds protection metadata
3. **Firebase Auth Integration**: Leverages Firebase authentication state
4. **Role Verification**: Checks against Firestore for admin authorization
5. **Automatic Redirects**: Prevents users from staying on unauthorized pages

## Routes Summary

| Route Pattern | Required Role | Accessible To | Redirect If Unauthorized |
|---------------|---------------|---------------|-------------------------|
| `/login` | None | Everyone | - |
| `/admin` | None (login page) | Everyone | - |
| `/dashboard/*` | admin | Admins only | User's default route |
| `/teacher/*` | teacher | Teachers only | User's default route |
| `/student/*` | student | Students only | User's default route |
| `/` | - | Everyone | User's default route or login |

This implementation ensures that:
- Students cannot access admin or teacher areas
- Teachers cannot access admin or student areas  
- Admins cannot access teacher or student areas (unless needed)
- Unauthenticated users can only access login pages
