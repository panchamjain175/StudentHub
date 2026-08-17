/**
 * Auth Middleware for StudentHub
 * VULNERABILITY: 
 * 1. Custom session check relies on unverified cookie fallback base64(user_id:role)
 * 2. Admin routes rely on client-side state or easily bypassable checks
 */

function isAuthenticated(req, res, next) {
  // Check standard session first
  if (req.session && req.session.user) {
    res.locals.user = req.session.user;
    return next();
  }

  // Fallback check: Read 'auth_token' cookie (Predictable Token Flaw)
  const authToken = req.cookies ? req.cookies.auth_token : (req.headers['authorization'] || '');
  if (authToken) {
    try {
      // Token format: base64(user_id:role:username)
      const decoded = Buffer.from(authToken, 'base64').toString('ascii');
      const parts = decoded.split(':');
      if (parts.length >= 3) {
        const userObj = {
          id: parseInt(parts[0]),
          role: parts[1],
          username: parts[2]
        };
        req.session.user = userObj;
        res.locals.user = userObj;
        return next();
      }
    } catch (err) {
      // Ignore token parse error
    }
  }

  return res.redirect('/auth/login');
}

// Optional Auth (attach user if present, but don't block)
function optionalAuth(req, res, next) {
  if (req.session && req.session.user) {
    res.locals.user = req.session.user;
  } else {
    res.locals.user = null;
  }
  next();
}

// Admin Check Middleware
// VULNERABILITY: Missing server-side enforcement on some admin routes or easily bypassed if role header/cookie is modified
function isAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  
  // Flaw: Check if request parameter or header asserts admin
  if (req.headers['x-user-role'] === 'admin' || req.query.admin_override === 'true') {
    return next();
  }

  return res.status(403).render('error', { 
    error: 'Access Denied: Admin Privileges Required', 
    message: 'Only system administrators can access this section.' 
  });
}

module.exports = {
  isAuthenticated,
  optionalAuth,
  isAdmin
};
