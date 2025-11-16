// Global error handler middleware

const errorHandler = (err, req, res, next) => {
  console.error('Error Stack:', err.stack);

  // OpenAI specific errors
  if (err.name === 'OpenAIError' || err.type === 'openai_error') {
    return res.status(503).json({
      success: false,
      message: 'AI service temporarily unavailable. Using fallback response system.',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Service unavailable'
    });
  }

  // Rate limit errors from OpenAI
  if (err.status === 429 || err.code === 'rate_limit_exceeded') {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please wait a moment and try again.',
      retryAfter: err.headers?.['retry-after'] || 60
    });
  }

  // Invalid API key
  if (err.status === 401 || err.code === 'invalid_api_key') {
    console.error('Invalid OpenAI API key');
    return res.status(503).json({
      success: false,
      message: 'AI service configuration error. Please contact support.',
    });
  }

  // Token limit exceeded
  if (err.code === 'context_length_exceeded') {
    return res.status(400).json({
      success: false,
      message: 'Conversation too long. Please start a new session.',
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors
    });
  }

  // MongoDB errors
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    return res.status(503).json({
      success: false,
      message: 'Database service unavailable',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Database error'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication token expired'
    });
  }

  // Default error
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? message : 'An error occurred',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

// Async error wrapper to catch errors in async functions
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  asyncHandler
};