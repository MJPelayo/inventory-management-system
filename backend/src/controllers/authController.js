

const bcrypt = require('bcrypt');
const { User } = require('../models/User');
const { generateToken } = require('../middleware/auth');

const authController = {
    /**
     * Register a new user
     * POST /api/auth/register
     */
    async register(req, res) {
        try {
            const { name, email, password, role, department } = req.body;
            
            if (!name || !email || !password || !role) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields'
                });
            }
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid email format'
                });
            }
            
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'Email already registered'
                });
            }
            
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            
            const user = new User({
                name,
                email,
                password_hash: hashedPassword,
                role,
                department
            });
            
            const savedUser = await user.save();
            
            const token = generateToken(
                savedUser.getId(),
                savedUser.getEmail(),
                savedUser.getRole()
            );
            
            res.status(201).json({
                success: true,
                data: {
                    user: savedUser.toJSON(),
                    token
                },
                message: 'User registered successfully'
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Login existing user
     * POST /api/auth/login
     */
    async login(req, res) {
        try {
            const { email, password } = req.body;
            
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Email and password are required'
                });
            }
            
            // ✅ FIX: Use findByEmail which returns a User instance
            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }
            
            // ✅ FIX: Use isActive() method
            if (!user.isActive()) {
                return res.status(401).json({
                    success: false,
                    error: 'Account is deactivated. Please contact administrator.'
                });
            }
            
            // ✅ FIX: Use getPasswordHash() method
            const isPasswordValid = await bcrypt.compare(password, user.getPasswordHash());
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }
            
            // ✅ FIX: Use updateLastLogin() method
            user.updateLastLogin();
            await user.save();
            
            // ✅ FIX: Use getter methods
            const token = generateToken(
                user.getId(),
                user.getEmail(),
                user.getRole()
            );
            
            res.status(200).json({
                success: true,
                data: {
                    user: user.toJSON(),
                    token
                },
                message: 'Login successful'
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Get current logged-in user profile
     * GET /api/auth/me
     */
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
            console.error('GetMe error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
};

module.exports = authController;