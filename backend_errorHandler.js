/**
 * Global error handling middleware.
 * Catches all errors passed via next(err) and returns a consistent JSON response.
 */
const errorHandler = (err, req, res, next) => {
    console.error('[ERROR]', err.message || err);

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        return res.status(409).json({
            success: false,
            message: `Duplicate value: ${field} already exists`,
        });
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map((e) => e.message);
        return res.status(422).json({
            success: false,
            message: 'Validation error',
            errors: messages,
        });
    }

    // Default 500
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
    });
};

module.exports = errorHandler;
