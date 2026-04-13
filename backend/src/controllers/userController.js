// backend/src/controllers/userController.js
const { User } = require('../../dist/models/User');

const userController = {
    // Get all users
    async getAllUsers(req, res) {
        try {
            const filters = {};
            if (req.query.role) filters.role = req.query.role;
            if (req.query.is_active) filters.is_active = req.query.is_active === 'true';
            
            const users = await User.findAll(filters);
            res.status(200).json({
                success: true,
                data: users.map(u => u.toJSON()),
                count: users.length,
                message: 'Users retrieved successfully'
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                error: error.message,
                message: 'Failed to retrieve users'
            });
        }
    },

    // Get user by ID
    async getUserById(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Invalid user ID' 
                });
            }
            
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'User not found' 
                });
            }
            res.status(200).json({ 
                success: true, 
                data: user.toJSON(),
                message: 'User retrieved successfully'
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                error: error.message,
                message: 'Failed to retrieve user'
            });
        }
    },

    // Create new user
    async createUser(req, res) {
        try {
            const { name, email, password, role, department, sales_target, warehouse_id } = req.body;
            
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
                department,
                sales_target: sales_target || null,
                warehouse_id: warehouse_id || null
            });
            
            const saved = await user.save();
            res.status(201).json({ 
                success: true, 
                data: saved.toJSON(),
                message: 'User created successfully'
            });
        } catch (error) {
            res.status(400).json({ 
                success: false, 
                error: error.message,
                message: 'Failed to create user'
            });
        }
    },

    // Update user
    async updateUser(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Invalid user ID' 
                });
            }
            
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'User not found' 
                });
            }
            
            const { name, email, role, is_active, department, sales_target } = req.body;
            
            if (name) user.setName(name);
            if (email) user.setEmail(email);
            if (role) user.setRole(role);
            if (is_active !== undefined) {
                is_active ? user.activate() : user.deactivate();
            }
            if (department !== undefined) user.department = department;
            if (sales_target !== undefined) user.sales_target = sales_target;
            
            const updated = await user.save();
            res.status(200).json({ 
                success: true, 
                data: updated.toJSON(),
                message: 'User updated successfully'
            });
        } catch (error) {
            res.status(400).json({ 
                success: false, 
                error: error.message,
                message: 'Failed to update user'
            });
        }
    },

    // Delete user
    async deleteUser(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Invalid user ID' 
                });
            }
            
            const deleted = await User.deleteById(id);
            if (!deleted) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'User not found' 
                });
            }
            res.status(200).json({ 
                success: true, 
                message: 'User deleted successfully' 
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                error: error.message,
                message: 'Failed to delete user'
            });
        }
    }
};

module.exports = userController;