// backend/src/controllers/settingsController.js
/**
 * System Settings Controller
 * Handles system configuration, tax rates, thresholds, etc.
 * 
 * @module controllers/settingsController
 */

const pool = require('../db/pool');

const settingsController = {
    /**
     * GET /api/settings/system
     * Get all system settings
     */
    async getSystemSettings(req, res) {
        try {
            const result = await pool.query(
                `SELECT setting_key, setting_value, setting_type, description 
                 FROM system_settings 
                 ORDER BY setting_key`
            );
            
            // Convert to object for easier consumption
            const settings = {};
            for (const row of result.rows) {
                let value = row.setting_value;
                // Parse based on type
                if (row.setting_type === 'boolean') {
                    value = value === 'true';
                } else if (row.setting_type === 'integer') {
                    value = parseInt(value);
                } else if (row.setting_type === 'decimal') {
                    value = parseFloat(value);
                }
                settings[row.setting_key] = value;
            }
            
            res.status(200).json({
                success: true,
                data: settings
            });
        } catch (error) {
            console.error('Failed to get system settings:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    /**
     * PUT /api/settings/system
     * Update system settings
     */
    async updateSystemSettings(req, res) {
        const { settings } = req.body;
        const adminId = req.user.id;
        
        try {
            await pool.query('BEGIN');
            
            for (const [key, value] of Object.entries(settings)) {
                // Determine type based on value
                let settingType = 'string';
                let settingValue = String(value);
                
                if (typeof value === 'boolean') {
                    settingType = 'boolean';
                    settingValue = value ? 'true' : 'false';
                } else if (typeof value === 'number') {
                    settingType = Number.isInteger(value) ? 'integer' : 'decimal';
                    settingValue = String(value);
                }
                
                await pool.query(
                    `INSERT INTO system_settings (setting_key, setting_value, setting_type, updated_at)
                     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                     ON CONFLICT (setting_key) 
                     DO UPDATE SET setting_value = EXCLUDED.setting_value, 
                                   setting_type = EXCLUDED.setting_type,
                                   updated_at = CURRENT_TIMESTAMP`,
                    [key, settingValue, settingType]
                );
            }
            
            // Log to audit
            await pool.query(
                `INSERT INTO audit_logs (user_id, action, entity_type, new_data)
                 VALUES ($1, $2, $3, $4)`,
                [adminId, 'update_system_settings', 'settings', JSON.stringify(settings)]
            );
            
            await pool.query('COMMIT');
            
            res.status(200).json({
                success: true,
                message: 'System settings updated successfully'
            });
        } catch (error) {
            await pool.query('ROLLBACK');
            console.error('Failed to update system settings:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    
    /**
     * GET /api/settings/system/:key
     * Get a single system setting
     */
    async getSystemSetting(req, res) {
        const { key } = req.params;
        
        try {
            const result = await pool.query(
                `SELECT setting_key, setting_value, setting_type, description 
                 FROM system_settings 
                 WHERE setting_key = $1`,
                [key]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Setting not found' });
            }
            
            let value = result.rows[0].setting_value;
            const type = result.rows[0].setting_type;
            
            if (type === 'boolean') {
                value = value === 'true';
            } else if (type === 'integer') {
                value = parseInt(value);
            } else if (type === 'decimal') {
                value = parseFloat(value);
            }
            
            res.status(200).json({
                success: true,
                data: { key, value, type }
            });
        } catch (error) {
            console.error('Failed to get system setting:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = settingsController;