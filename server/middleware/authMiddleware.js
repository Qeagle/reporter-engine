import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    console.log('=== AUTH DEBUG ===');
    console.log('Path:', req.path);
    console.log('Token received:', !!token);
    console.log('Token length:', token?.length);
    
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      });
    }

    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    console.log('JWT Secret being used:', jwtSecret);
    console.log('Token format valid:', token.split('.').length === 3);
    
    const decoded = jwt.verify(token, jwtSecret);
    console.log('Token decoded successfully:', decoded);
    
    req.user = decoded;
    next();
  } catch (error) {
    console.log('JWT Error:', error.name, error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }
    
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

export default authMiddleware;