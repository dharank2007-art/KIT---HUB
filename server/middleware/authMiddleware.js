const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kit_college_app_super_secret_jwt_key_2026');
      req.user = await User.findById(decoded.id).select('-password').populate('department');
      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }
      if (req.user.role === 'student' && req.user.status && req.user.status !== 'approved') {
        return res.status(403).json({ message: 'Student account is not approved' });
      }
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

module.exports = { protect };
