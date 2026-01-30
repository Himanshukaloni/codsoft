const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        message: 'Access token required' 
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(403).json({ 
            message: 'Token has expired' 
          });
        }
        return res.status(403).json({ 
          message: 'Invalid token' 
        });
      }
      
      req.user = user;
      next();
    });

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      message: 'Authentication error',
      error: error.message 
    });
  }
};

module.exports = authenticateToken;
