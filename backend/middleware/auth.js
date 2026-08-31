import jwt from 'jsonwebtoken';

/**
 * JWT Verification Middleware
 * Reads Bearer token from Authorization header, verifies it,
 * and attaches decoded payload to req.user.
 */
const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request for downstream route handlers
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export default auth;
