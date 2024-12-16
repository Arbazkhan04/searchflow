/**
 * Extract a user-friendly message from MongoDB duplicate key error
 * @param {Object} error - MongoDB error object
 * @returns {string} - User-friendly error message
 */
const getDuplicateKeyErrorMessage = (error) => {
    if (error.code === 11000 && error.keyValue) {
      // Extract the field and value causing the error
      const field = Object.keys(error.keyValue)[0];
      const value = error.keyValue[field];
  
      // Generalized error message
      return `Duplicate entry detected: ${field} '${value}' already exists.`;
    }
    return "An unexpected error occurred.";
  };
  
  module.exports = getDuplicateKeyErrorMessage;
  