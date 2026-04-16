// backend/src/controllers/categoryController.js
const { Category } = require('../models/Category');

const categoryController = {
    async getAllCategories(req, res) {
        try {
            const categories = await Category.findAll();
            res.status(200).json({
                success: true,
                data: categories.map(c => c.toJSON()),
                count: categories.length
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    async getCategoryTree(req, res) {
        try {
            const tree = await Category.getTree();
            res.status(200).json({ success: true, data: tree });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    async getCategoryById(req, res) {
        try {
            const category = await Category.findById(parseInt(req.params.id));
            if (!category) {
                return res.status(404).json({ success: false, error: 'Category not found' });
            }
            res.status(200).json({ success: true, data: category.toJSON() });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    async createCategory(req, res) {
        try {
            const { name, parent_id, description } = req.body;
            
            if (!name) {
                return res.status(400).json({ success: false, error: 'Category name is required' });
            }
            
            const category = new Category({ name, parent_id, description });
            const saved = await category.save();
            res.status(201).json({ success: true, data: saved.toJSON() });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    },
    
    async updateCategory(req, res) {
        try {
            const category = await Category.findById(parseInt(req.params.id));
            if (!category) {
                return res.status(404).json({ success: false, error: 'Category not found' });
            }
            
            const { name, parent_id, description } = req.body;
            if (name) category.setName(name);
            if (parent_id !== undefined) category.parent_id = parent_id;
            if (description !== undefined) category.description = description;
            
            const updated = await category.save();
            res.status(200).json({ success: true, data: updated.toJSON() });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    },
    
    async deleteCategory(req, res) {
        try {
            const category = await Category.findById(parseInt(req.params.id));
            if (!category) {
                return res.status(404).json({ success: false, error: 'Category not found' });
            }
            
            await category.delete();
            res.status(200).json({ success: true, message: 'Category deleted successfully' });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    }
};

module.exports = categoryController;