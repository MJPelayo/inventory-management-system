/**
 * Authentication Controller
 * Handles user registration, login, and profile management
 * 
 * @module controllers/authController
 */

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
            
            // Input validation
            if (!name || !email || !password || !role) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    details: 'Name, email, password, and role are required'
                });
            }
            
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid email format'
                });
            }
            
            // Check if user already exists
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'Email already registered'
                });
            }
            
            // Hash password with bcrypt (10 rounds of salt)
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            
            // Create new user
            const user = new User({
                name,
                email,
                password_hash: hashedPassword,
                role,
                department
            });
            
            const savedUser = await user.save();
            
            // Generate JWT token for auto-login after registration
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
            
            // Input validation
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Email and password are required'
                });
            }
            
            // Find user by email
            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }
            
            // Check if account is active
            if (!user.isActive()) {
                return res.status(401).json({
                    success: false,
                    error: 'Account is deactivated. Please contact administrator.'
                });
            }
            
            // Verify password using bcrypt compare
            const isPasswordValid = await bcrypt.compare(password, user.getPasswordHash());
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }
            
            // Update last login timestamp
            user.updateLastLogin();
            await user.save();
            
            // Generate JWT token
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
            // Get user ID from authenticated request
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