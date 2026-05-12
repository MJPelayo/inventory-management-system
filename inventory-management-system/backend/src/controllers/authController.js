// backend/src/controllers/authController.js
const { User } = require('../models/User');
const { ROLE_PERMISSIONS, getAccessibleRoutes } = require('../middleware/authMiddleware');

const authController = {
    // Login - authenticate user and return token + permissions
    async login(req, res) {
        try {
            const { email, password } = req.body;

            // Validate input
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
                    error: 'Invalid credentials',
                    message: 'User not found'
                });
            }

            // Check password (in production, use bcrypt.compare)
            if (user.getPasswordHash() !== password) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials',
                    message: 'Incorrect password'
                });
            }

            // Check if user is active
            if (!user.isActive()) {
                return res.status(403).json({
                    success: false,
                    error: 'Account deactivated',
                    message: 'Your account has been deactivated. Contact admin.'
                });
            }

            // Update last login
            user.updateLastLogin();
            await user.save();

            // Get role permissions
            const role = user.getRole();
            const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.sales;

            // Return user data (excluding sensitive info) and permissions
            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    user: user.toJSON(),
                    token: email, // For demo, token is email. In production, use JWT
                    permissions: permissions.permissions,
                    accessibleRoutes: permissions.routes,
                    roleLevel: permissions.level
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                error: 'Login failed',
                message: error.message
            });
        }
    },

    // Logout - for session-based auth, clear session here
    async logout(req, res) {
        // For token-based auth, logout is handled client-side by removing token
        res.json({
            success: true,
            message: 'Logout successful'
        });
    },

    // Get current user info
    async me(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Not authenticated'
                });
            }

            const role = req.user.getRole();
            const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.sales;

            res.json({
                success: true,
                data: {
                    user: req.user.toJSON(),
                    permissions: permissions.permissions,
                    accessibleRoutes: permissions.routes,
                    roleLevel: permissions.level
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Failed to get user info',
                message: error.message
            });
        }
    },

    // Get available roles (for admin to assign)
    getAvailableRoles(req, res) {
        const roles = Object.keys(ROLE_PERMISSIONS).map(role => ({
            role,
            level: ROLE_PERMISSIONS[role].level,
            permissions: ROLE_PERMISSIONS[role].permissions,
            routes: ROLE_PERMISSIONS[role].routes
        }));

        res.json({
            success: true,
            data: roles
        });
    },

    // Change password
    async changePassword(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Not authenticated'
                });
            }

            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    error: 'Current password and new password are required'
                });
            }

            // Verify current password
            if (req.user.getPasswordHash() !== currentPassword) {
                return res.status(401).json({
                    success: false,
                    error: 'Current password is incorrect'
                });
            }

            // Validate new password
            if (newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    error: 'New password must be at least 6 characters'
                });
            }

            // Update password
            await req.user.updatePassword(newPassword);

            res.json({
                success: true,
                message: 'Password changed successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Failed to change password',
                message: error.message
            });
        }
    }
};

module.exports = authController;