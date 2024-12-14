
const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500; // Default to Internal Server Error
    const message = err.message || 'Internal Server Error';
    
    // Log error (optional)
    console.error(`[ERROR] ${err.stack || err.message}`);

    // Send structured error response
    res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' ? err.stack : null, // Show stack only in development
    });
};

module.exports = errorHandler;
