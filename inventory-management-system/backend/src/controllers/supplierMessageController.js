// backend/src/controllers/supplierMessageController.js
const pool = require('../db/pool');
const { createAuditLog } = require('./auditController');

// GET /api/supplier-messages - Get all messages (with filters)
const getAllMessages = async (req, res) => {
    try {
        const { supplier_id, status, message_type, priority, search } = req.query;
        
        const conditions = ['1=1'];
        const values = [];
        let i = 1;

        if (supplier_id) {
            conditions.push(`sm.supplier_id = $${i++}`);
            values.push(parseInt(supplier_id));
        }
        if (status) {
            conditions.push(`sm.status = $${i++}`);
            values.push(status);
        }
        if (message_type) {
            conditions.push(`sm.message_type = $${i++}`);
            values.push(message_type);
        }
        if (priority) {
            conditions.push(`sm.priority = $${i++}`);
            values.push(priority);
        }
        if (search) {
            conditions.push(`(sm.subject ILIKE $${i} OR sm.message ILIKE $${i + 1})`);
            values.push(`%${search}%`, `%${search}%`);
            i += 2;
        }

        const result = await pool.query(
            `SELECT 
                sm.*,
                s.name AS supplier_name,
                s.contact_person,
                s.email AS supplier_email,
                u.name AS sender_name,
                u.email AS sender_email
             FROM supplier_messages sm
             JOIN suppliers s ON sm.supplier_id = s.id
             JOIN users u ON sm.sender_id = u.id
             WHERE ${conditions.join(' AND ')}
             ORDER BY sm.created_at DESC`,
            values
        );

        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (err) {
        console.error('getAllMessages error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// GET /api/supplier-messages/:id - Get single message
const getMessageById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT 
                sm.*,
                s.name AS supplier_name,
                s.contact_person,
                s.email AS supplier_email,
                s.phone AS supplier_phone,
                u.name AS sender_name,
                u.email AS sender_email
             FROM supplier_messages sm
             JOIN suppliers s ON sm.supplier_id = s.id
             JOIN users u ON sm.sender_id = u.id
             WHERE sm.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Message not found' });
        }

        // Mark as read if it's a new message
        if (result.rows[0].status === 'sent') {
            await pool.query(
                `UPDATE supplier_messages SET status = 'read' WHERE id = $1`,
                [id]
            );
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('getMessageById error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// POST /api/supplier-messages - Send new message
const sendMessage = async (req, res) => {
    try {
        const { supplier_id, subject, message, message_type, priority } = req.body;
        const user = req.user;

        if (!supplier_id || !subject || !message || !message_type) {
            return res.status(400).json({ 
                success: false, 
                error: 'Supplier ID, subject, message, and message type are required' 
            });
        }

        // Verify supplier exists
        const supplierCheck = await pool.query('SELECT id, name FROM suppliers WHERE id = $1', [supplier_id]);
        if (supplierCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Supplier not found' });
        }

        const result = await pool.query(
            `INSERT INTO supplier_messages 
             (supplier_id, sender_id, subject, message, message_type, priority)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [supplier_id, user.id, subject.trim(), message.trim(), message_type, priority || 'normal']
        );

        // Create audit log
        await createAuditLog({
            user_id: user.id,
            user_name: user.name,
            action: 'create',
            entity_type: 'supplier_message',
            entity_id: result.rows[0].id,
            entity_name: subject.trim(),
            new_values: { 
                supplier_id, 
                supplier_name: supplierCheck.rows[0].name,
                message_type,
                priority: priority || 'normal'
            },
            ip_address: req.ip,
            user_agent: req.get('user-agent'),
            notes: `Message sent to supplier: ${subject.trim()}`
        });

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('sendMessage error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// PUT /api/supplier-messages/:id/reply - Reply to a message
const replyToMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { subject, message, message_type, priority } = req.body;
        const user = req.user;

        // Get original message
        const originalMsg = await pool.query('SELECT * FROM supplier_messages WHERE id = $1', [id]);
        if (originalMsg.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Message not found' });
        }

        // Create reply as new message linked to same supplier
        const result = await pool.query(
            `INSERT INTO supplier_messages 
             (supplier_id, sender_id, subject, message, message_type, priority, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'sent')
             RETURNING *`,
            [
                originalMsg.rows[0].supplier_id, 
                user.id, 
                subject || `Re: ${originalMsg.rows[0].subject}`, 
                message.trim(), 
                message_type || 'response', 
                priority || originalMsg.rows[0].priority
            ]
        );

        // Update original message status to replied
        await pool.query(
            `UPDATE supplier_messages SET status = 'replied', replied_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [id]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('replyToMessage error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// PATCH /api/supplier-messages/:id/status - Update message status
const updateMessageStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['sent', 'read', 'replied', 'archived'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status value' });
        }

        const result = await pool.query(
            `UPDATE supplier_messages SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Message not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('updateMessageStatus error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// DELETE /api/supplier-messages/:id - Delete message
const deleteMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const existing = await pool.query('SELECT * FROM supplier_messages WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Message not found' });
        }

        await pool.query('DELETE FROM supplier_messages WHERE id = $1', [id]);

        await createAuditLog({
            user_id: user.id,
            user_name: user.name,
            action: 'delete',
            entity_type: 'supplier_message',
            entity_id: parseInt(id),
            entity_name: existing.rows[0].subject,
            old_values: { subject: existing.rows[0].subject },
            ip_address: req.ip,
            user_agent: req.get('user-agent'),
            notes: 'Supplier message deleted'
        });

        res.json({ success: true, message: 'Message deleted successfully' });
    } catch (err) {
        console.error('deleteMessage error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// GET /api/supplier-messages/stats - Get message statistics
const getMessageStats = async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
                COUNT(*) FILTER (WHERE status = 'read') as read_count,
                COUNT(*) FILTER (WHERE status = 'replied') as replied_count,
                COUNT(*) FILTER (WHERE status = 'archived') as archived_count,
                COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_count,
                COUNT(*) FILTER (WHERE priority = 'high') as high_priority_count,
                COUNT(*) as total_count
            FROM supplier_messages
        `);

        res.json({ success: true, data: stats.rows[0] });
    } catch (err) {
        console.error('getMessageStats error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = {
    getAllMessages,
    getMessageById,
    sendMessage,
    replyToMessage,
    updateMessageStatus,
    deleteMessage,
    getMessageStats
};