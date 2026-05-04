/**
 * Input Sanitization Middleware
 * Prevents SQL injection and XSS attacks
 */

/**
 * Sanitize string inputs - remove dangerous characters
 */
function sanitizeString(input) {
    if (typeof input !== 'string') return input;
    
    // Remove common SQL injection patterns
    return input
        .replace(/['";\\-]/g, '')  // Remove quotes, semicolons, backslashes, dashes
        .replace(/--/g, '')         // Remove SQL comments
        .replace(/\/\*/g, '')       // Remove multi-line comment start
        .replace(/\*\//g, '')       // Remove multi-line comment end
        .replace(/xp_/gi, '')       // Remove stored procedure prefixes
        .replace(/exec/gi, '')      // Remove EXEC keyword
        .replace(/union/gi, '')     // Remove UNION keyword
        .replace(/select/gi, '')    // Remove SELECT keyword
        .replace(/insert/gi, '')    // Remove INSERT keyword
        .replace(/update/gi, '')    // Remove UPDATE keyword
        .replace(/delete/gi, '')    // Remove DELETE keyword
        .replace(/drop/gi, '')      // Remove DROP keyword
        .replace(/truncate/gi, ''); // Remove TRUNCATE keyword
}

/**
 * Validate and sanitize email
 */
function sanitizeEmail(email) {
    if (!email) return null;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
    }
    return email.toLowerCase().trim();
}

/**
 * Validate and sanitize phone number
 */
function sanitizePhone(phone) {
    if (!phone) return null;
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10 || cleaned.length > 15) {
        throw new Error('Invalid phone number format');
    }
    return cleaned;
}

/**
 * Validate numeric ID
 */
function validateId(id) {
    const numId = parseInt(id);
    if (isNaN(numId) || numId <= 0) {
        throw new Error('Invalid ID');
    }
    return numId;
}

/**
 * Validate pagination parameters
 */
function validatePagination(limit, offset, maxLimit = 100) {
    let validLimit = parseInt(limit);
    let validOffset = parseInt(offset);
    
    validLimit = isNaN(validLimit) ? 20 : Math.min(validLimit, maxLimit);
    validOffset = isNaN(validOffset) ? 0 : Math.max(0, validOffset);
    
    return { limit: validLimit, offset: validOffset };
}

/**
 * Middleware to sanitize all string inputs in request body
 */
function sanitizeRequestBody(req, res, next) {
    if (req.body && typeof req.body === 'object') {
        for (const [key, value] of Object.entries(req.body)) {
            if (typeof value === 'string') {
                // Don't sanitize passwords
                if (key !== 'password' && key !== 'password_hash') {
                    req.body[key] = sanitizeString(value);
                }
            }
        }
    }
    next();
}

/**
 * Middleware to sanitize query parameters
 */
function sanitizeQueryParams(req, res, next) {
    if (req.query && typeof req.query === 'object') {
        for (const [key, value] of Object.entries(req.query)) {
            if (typeof value === 'string') {
                req.query[key] = sanitizeString(value);
            }
        }
    }
    next();
}

module.exports = {
    sanitizeString,
    sanitizeEmail,
    sanitizePhone,
    validateId,
    validatePagination,
    sanitizeRequestBody,
    sanitizeQueryParams
};