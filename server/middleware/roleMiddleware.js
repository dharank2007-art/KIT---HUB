const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Roles: super_admin, admin (HOD), staff (Faculty), student
    if (allowedRoles.includes(req.user.role)) {
      return next();
    }
    
    return res.status(403).json({ 
      message: `Access denied. Role '${req.user.role}' is not authorized for this resource.` 
    });
  };
};

module.exports = { requireRole };
