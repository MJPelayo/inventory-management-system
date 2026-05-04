/**
 * Security Middleware
 * Detects and blocks SQL injection attempts
 */

const suspiciousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|EXEC|UNION|MERGE|REPLACE)\b)/i,
    /(--|;|'|"|\/\*|\*\/|xp_|sp_)/,
    /(\bOR\b.*=.*\bOR\b)/i,
    /(\bAND\b.*=.*\bAND\b)/i,
    /(\bWHERE\b.*=.*\bWHERE\b)/i,
    /(\bSLEEP\s*\(|BENCHMARK\s*\()/i,
    /(\bWAITFOR\s+DELAY\b)/i
];

function detectSQLInjection(input) {
    if (typeof input !== 'string') return false;
    
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(input)) {
            return true;
        }
    }
    return false;
}

function sqlInjectionProtection(req, res, next) {
    // Check query parameters
    for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string' && detectSQLInjection(value)) {
            console.warn(`SQL injection attempt detected in query param "${key}": ${value.substring(0, 100)}`);
            return res.status(400).json({
                success: false,
                error: 'Invalid request parameters'
            });
        }
    }
    
    // Check body (except password)
    if (req.body && typeof req.body === 'object') {
        for (const [key, value] of Object.entries(req.body)) {
            if (key !== 'password' && typeof value === 'string' && detectSQLInjection(value)) {
                console.warn(`SQL injection attempt detected in body field "${key}": ${value.substring(0, 100)}`);
                return res.status(400).json({
                    success: false,
                    error: 'Invalid request data'
                });
            }
        }
    }
    
    next();
}

module.exports = { detectSQLInjection, sqlInjectionProtection };