// backend/src/middleware/auth.js

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        // For testing/development - allow requests without token
        req.user = { id: 1, role: 'admin' };
        return next();
    }
    
    try {
        // Decode the base64 token
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [userId, email] = decoded.split(':');
        
        req.user = { 
            id: parseInt(userId), 
            email,
            role: 'admin' // Default role for testing
        };
        next();
    } catch (error) {
        return res.status(403).json({ 
            success: false, 
            error: 'Invalid or expired token' 
        });
    }
};

module.exports = { authenticateToken };