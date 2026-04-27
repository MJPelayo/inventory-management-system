// backend/src/controllers/userController.js
const { User } = require('../models/User');

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
            const {
                name,
                email,
                password,
                role,
                department,
                sales_target,
                commission_rate,
                warehouse_id,
                shift,
                purchase_budget,
                is_active
            } = req.body;
            
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
                commission_rate: commission_rate || 5.0,
                warehouse_id: warehouse_id || null,
                shift: shift || null,
                purchase_budget: purchase_budget || null,
                is_active: is_active !== undefined ? is_active : true 
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
            
            const {
                name,
                email,
                role,
                is_active,
                department,
                sales_target,
                commission_rate,
                warehouse_id,
                shift,
                purchase_budget,
                status
            } = req.body;
            
            if (name) user.setName(name);
            if (email) user.setEmail(email);
            if (role) user.setRole(role);
            if (is_active !== undefined) {
                is_active === true ? user.activate() : user.deactivate();
            } else if (status !== undefined) {
                status === true || status === "true" ? user.activate() : user.deactivate();
            }
            if (department !== undefined) user.department = department;
            if (sales_target !== undefined) user.sales_target = sales_target;
            if (commission_rate !== undefined) user.commission_rate = commission_rate;
            if (warehouse_id !== undefined) user.warehouse_id = warehouse_id;
            if (shift !== undefined) user.shift = shift;
            if (purchase_budget !== undefined) user.purchase_budget = purchase_budget;
            
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