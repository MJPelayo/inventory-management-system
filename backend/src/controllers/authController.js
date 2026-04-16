// backend/src/controllers/authController.js
const { User } = require('../models/User');

const authController = {
    async register(req, res) {
        try {
            const { name, email, password, role, department } = req.body;
            
            // Validate required fields
            if (!name || !email || !password || !role) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Name, email, password, and role are required' 
                });
            }
            
            // Check if email exists
            const existing = await User.findByEmail(email);
            if (existing) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Email already exists' 
                });
            }
            
            const user = new User({
                name,
                email,
                password_hash: password, // In production, hash this with bcrypt
                role,
                department
            });
            
            const saved = await user.save();
            res.status(201).json({ 
                success: true, 
                data: saved.toJSON(),
                message: 'User registered successfully'
            });
        } catch (error) {
            res.status(400).json({ 
                success: false, 
                error: error.message,
                message: 'Failed to register user'
            });
        }
    },

    async login(req, res) {
        try {
            const { email, password } = req.body;
            
            if (!email || !password) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Email and password are required' 
                });
            }
            
            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Invalid credentials' 
                });
            }
            
            if (!user.isActive()) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Account is deactivated' 
                });
            }
            
            // Simple password check (in production, use bcrypt.compare)
            if (user.getPasswordHash() !== password) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Invalid credentials' 
                });
            }
            
            user.updateLastLogin();
            await user.save();
            
            // Create a simple token (in production, use JWT)
            const token = Buffer.from(`${user.id}:${user.email}`).toString('base64');
            
            res.status(200).json({ 
                success: true, 
                data: {
                    user: user.toJSON(),
                    token
                },
                message: 'Login successful'
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                error: error.message,
                message: 'Failed to login'
            });
        }
    },

    async getMe(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Unauthorized' 
                });
            }
            
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'User not found' 
                });
            }
            
            res.status(200).json({ 
                success: true, 
                data: user.toJSON()
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                error: error.message,
                message: 'Failed to retrieve user'
            });
        }
    }
};

module.exports = authController;