// Authentication utility functions for role-based routing

export const getDefaultRouteForRole = (role: 'admin' | 'teacher' | 'student' | null): string => {
  switch (role) {
    case 'admin':
      return '/dashboard';
    case 'teacher':
      return '/teacher';
    case 'student':
      return '/student';
    default:
      return '/login';
  }
};

export const isAuthorizedForRoute = (userRole: string | null, requiredRole: string): boolean => {
  if (!userRole || !requiredRole) return false;
  return userRole === requiredRole;
};

export const getRouteRequiredRole = (pathname: string): 'admin' | 'teacher' | 'student' | null => {
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    return 'admin';
  }
  if (pathname.startsWith('/teacher')) {
    return 'teacher';
  }
  if (pathname.startsWith('/student')) {
    return 'student';
  }
  return null;
};
