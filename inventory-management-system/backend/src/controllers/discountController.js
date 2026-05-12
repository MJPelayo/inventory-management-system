// backend/src/controllers/discountController.js
const pool = require('../db/pool');
const { createAuditLog } = require('./auditController');

// GET /api/discounts - Get all discounts (with filters)
const getAllDiscounts = async (req, res) => {
    try {
        const { product_id, is_active, search } = req.query;
        
        const conditions = ['1=1'];
        const values = [];
        let i = 1;

        if (product_id) {
            conditions.push(`pd.product_id = $${i++}`);
            values.push(parseInt(product_id));
        }
        if (is_active !== undefined) {
            conditions.push(`pd.is_active = $${i++}`);
            values.push(is_active === 'true');
        }
        if (search) {
            conditions.push(`p.name ILIKE $${i} OR p.sku ILIKE $${i + 1}`);
            values.push(`%${search}%`, `%${search}%`);
            i += 2;
        }

        const result = await pool.query(
            `SELECT 
                pd.*,
                p.name AS product_name,
                p.sku,
                p.price AS original_price,
                c.name AS category_name,
                s.name AS supplier_name,
                u.name AS created_by_name,
                a.name AS approved_by_name,
                CASE 
                    WHEN pd.discount_type = 'percent' THEN 
                        ROUND(p.price * (1 - pd.discount_percentage / 100), 2)
                    ELSE 
                        p.price - pd.discount_amount
                END AS discounted_price
             FROM product_discounts pd
             JOIN products p ON pd.product_id = p.id
             LEFT JOIN categories c ON p.category_id = c.id
             LEFT JOIN suppliers s ON p.supplier_id = s.id
             LEFT JOIN users u ON pd.created_by = u.id
             LEFT JOIN users a ON pd.approved_by = a.id
             WHERE ${conditions.join(' AND ')}
             ORDER BY pd.created_at DESC`,
            values
        );

        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (err) {
        console.error('getAllDiscounts error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// GET /api/discounts/:id - Get single discount
const getDiscountById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT 
                pd.*,
                p.name AS product_name,
                p.sku,
                p.price AS original_price,
                p.description AS product_description,
                c.name AS category_name,
                s.name AS supplier_name,
                u.name AS created_by_name,
                a.name AS approved_by_name,
                CASE 
                    WHEN pd.discount_type = 'percent' THEN 
                        ROUND(p.price * (1 - pd.discount_percentage / 100), 2)
                    ELSE 
                        p.price - pd.discount_amount
                END AS discounted_price
             FROM product_discounts pd
             JOIN products p ON pd.product_id = p.id
             LEFT JOIN categories c ON p.category_id = c.id
             LEFT JOIN suppliers s ON p.supplier_id = s.id
             LEFT JOIN users u ON pd.created_by = u.id
             LEFT JOIN users a ON pd.approved_by = a.id
             WHERE pd.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Discount not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('getDiscountById error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// GET /api/discounts/product/:product_id/active - Get active discount for a product
const getActiveDiscountByProduct = async (req, res) => {
    try {
        const { product_id } = req.params;

        const result = await pool.query(
            `SELECT 
                pd.*,
                p.name AS product_name,
                p.sku,
                p.price AS original_price,
                CASE 
                    WHEN pd.discount_type = 'percent' THEN 
                        ROUND(p.price * (1 - pd.discount_percentage / 100), 2)
                    ELSE 
                        p.price - pd.discount_amount
                END AS discounted_price
             FROM product_discounts pd
             JOIN products p ON pd.product_id = p.id
             WHERE pd.product_id = $1 
               AND pd.is_active = TRUE 
               AND pd.end_date > NOW()
             ORDER BY pd.created_at DESC
             LIMIT 1`,
            [product_id]
        );

        if (result.rows.length === 0) {
            return res.json({ success: true, data: null, message: 'No active discount for this product' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('getActiveDiscountByProduct error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// POST /api/discounts - Create new discount
const createDiscount = async (req, res) => {
    try {
        const { 
            product_id, 
            discount_percentage, 
            discount_amount, 
            discount_type, 
            start_date, 
            end_date, 
            reason,
            approved_by 
        } = req.body;
        const user = req.user;

        // Validation
        if (!product_id || !discount_type || !start_date || !end_date) {
            return res.status(400).json({ 
                success: false, 
                error: 'Product ID, discount type, start date, and end date are required' 
            });
        }

        if (discount_type === 'percent' && (!discount_percentage || discount_percentage <= 0 || discount_percentage > 100)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Discount percentage must be between 0 and 100 for percent discounts' 
            });
        }

        if (discount_type === 'fixed' && (!discount_amount || discount_amount <= 0)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Discount amount must be positive for fixed discounts' 
            });
        }

        // Verify product exists
        const productCheck = await pool.query('SELECT id, name, price FROM products WHERE id = $1', [product_id]);
        if (productCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        // Check for existing active discount on same product
        const existingDiscount = await pool.query(
            `SELECT id FROM product_discounts 
             WHERE product_id = $1 AND is_active = TRUE AND end_date > NOW()`,
            [product_id]
        );
        if (existingDiscount.rows.length > 0) {
            return res.status(409).json({ 
                success: false, 
                error: 'An active discount already exists for this product' 
            });
        }

        const result = await pool.query(
            `INSERT INTO product_discounts 
             (product_id, discount_percentage, discount_amount, discount_type, start_date, end_date, reason, created_by, approved_by, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
             RETURNING *`,
            [
                product_id, 
                discount_type === 'percent' ? discount_percentage : null, 
                discount_type === 'fixed' ? discount_amount : null, 
                discount_type, 
                new Date(start_date), 
                new Date(end_date), 
                reason || null, 
                user.id, 
                approved_by || null
            ]
        );

        // Create audit log
        await createAuditLog({
            user_id: user.id,
            user_name: user.name,
            action: 'create',
            entity_type: 'product_discount',
            entity_id: result.rows[0].id,
            entity_name: productCheck.rows[0].name,
            new_values: { 
                product_id,
                product_name: productCheck.rows[0].name,
                discount_type,
                discount_percentage,
                discount_amount,
                start_date,
                end_date,
                reason: reason || null
            },
            ip_address: req.ip,
            user_agent: req.get('user-agent'),
            notes: `Discount created for product: ${productCheck.rows[0].name}`
        });

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('createDiscount error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// PUT /api/discounts/:id - Update discount
const updateDiscount = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            discount_percentage, 
            discount_amount, 
            discount_type, 
            start_date, 
            end_date, 
            reason,
            is_active 
        } = req.body;
        const user = req.user;

        // Get existing discount
        const existing = await pool.query('SELECT * FROM product_discounts WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Discount not found' });
        }

        const current = existing.rows[0];

        // Validation
        if (discount_type === 'percent' && discount_percentage !== undefined && (discount_percentage <= 0 || discount_percentage > 100)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Discount percentage must be between 0 and 100' 
            });
        }

        if (discount_type === 'fixed' && discount_amount !== undefined && discount_amount <= 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Discount amount must be positive' 
            });
        }

        if (start_date && end_date && new Date(end_date) <= new Date(start_date)) {
            return res.status(400).json({ 
                success: false, 
                error: 'End date must be after start date' 
            });
        }

        const result = await pool.query(
            `UPDATE product_discounts SET
                discount_percentage = COALESCE($1, discount_percentage),
                discount_amount = COALESCE($2, discount_amount),
                discount_type = COALESCE($3, discount_type),
                start_date = COALESCE($4, start_date),
                end_date = COALESCE($5, end_date),
                reason = COALESCE($6, reason),
                is_active = COALESCE($7, is_active),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $8
             RETURNING *`,
            [
                discount_percentage,
                discount_amount,
                discount_type,
                start_date ? new Date(start_date) : null,
                end_date ? new Date(end_date) : null,
                reason,
                is_active,
                id
            ]
        );

        // Create audit log
        await createAuditLog({
            user_id: user.id,
            user_name: user.name,
            action: 'update',
            entity_type: 'product_discount',
            entity_id: parseInt(id),
            entity_name: `Discount #${id}`,
            old_values: { 
                discount_percentage: current.discount_percentage,
                discount_amount: current.discount_amount,
                is_active: current.is_active 
            },
            new_values: { 
                discount_percentage,
                discount_amount,
                is_active: is_active !== undefined ? is_active : current.is_active
            },
            ip_address: req.ip,
            user_agent: req.get('user-agent'),
            notes: 'Discount updated'
        });

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('updateDiscount error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// DELETE /api/discounts/:id - Delete discount
const deleteDiscount = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const existing = await pool.query('SELECT * FROM product_discounts WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Discount not found' });
        }

        await pool.query('DELETE FROM product_discounts WHERE id = $1', [id]);

        await createAuditLog({
            user_id: user.id,
            user_name: user.name,
            action: 'delete',
            entity_type: 'product_discount',
            entity_id: parseInt(id),
            entity_name: `Discount #${id}`,
            old_values: { ...existing.rows[0] },
            ip_address: req.ip,
            user_agent: req.get('user-agent'),
            notes: 'Discount deleted'
        });

        res.json({ success: true, message: 'Discount deleted successfully' });
    } catch (err) {
        console.error('deleteDiscount error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// PATCH /api/discounts/:id/toggle - Toggle discount active status
const toggleDiscountStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE product_discounts 
             SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1 
             RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Discount not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('toggleDiscountStatus error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// GET /api/discounts/stats - Get discount statistics
const getDiscountStats = async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE is_active = TRUE) as active_count,
                COUNT(*) FILTER (WHERE is_active = FALSE) as inactive_count,
                COUNT(*) FILTER (WHERE end_date < NOW()) as expired_count,
                COUNT(*) FILTER (WHERE discount_type = 'percent') as percent_discounts,
                COUNT(*) FILTER (WHERE discount_type = 'fixed') as fixed_discounts,
                AVG(discount_percentage) FILTER (WHERE discount_type = 'percent') as avg_percent_discount,
                AVG(discount_amount) FILTER (WHERE discount_type = 'fixed') as avg_fixed_discount,
                COUNT(*) as total_count
            FROM product_discounts
        `);

        res.json({ success: true, data: stats.rows[0] });
    } catch (err) {
        console.error('getDiscountStats error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = {
    getAllDiscounts,
    getDiscountById,
    getActiveDiscountByProduct,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    toggleDiscountStatus,
    getDiscountStats
};