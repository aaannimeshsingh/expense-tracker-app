const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;
    let authHeader = req.headers.authorization;

    // 1. Check if the header exists and starts with 'Bearer'
    if (authHeader && authHeader.startsWith('Bearer')) {
        
        const parts = authHeader.split(' ');
        // CRITICAL CHECK 1: Ensure the header has two parts ("Bearer" and the token)
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            console.warn(`Authorization Header Warning: Malformed header format received for path: ${req.path}`);
            return res.status(401).json({ message: 'Not authorized, header format invalid' });
        }
        
        token = parts[1];

        // CRITICAL CHECK 2: Ensure the token value itself is not empty or a string representation of null/undefined
        if (!token || token === 'null' || token === 'undefined') {
            console.warn(`Authorization Header Warning: Token value is empty/null for path: ${req.path}`);
            return res.status(401).json({ message: 'Not authorized, empty token value' });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Fetch user
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            next();
        } catch (error) {
            // This catches 'jwt malformed' or 'jwt expired' errors gracefully.
            if (error.name === 'JsonWebTokenError' && error.message === 'jwt malformed') {
                 console.warn(`Token Malformed Warning: Request to ${req.path} failed with malformed JWT.`);
            } else {
                 console.error('Authorization Token Verification Failed:', error.message);
            }
            res.status(401).json({ message: 'Not authorized, token failed or malformed' });
        }
    } else {
        // If no Authorization header is present
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protect };
