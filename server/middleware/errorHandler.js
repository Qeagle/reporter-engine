const errorHandler = (error, req, res, next) => {
  console.error('Error:', error);

  // Multer error handling
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File too large'
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'Invalid file field'
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: error.message || 'Internal server error'
  });
};

export default errorHandler;