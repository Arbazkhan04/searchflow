const { fetchAndSaveProducts,countProductDocuments } = require("../services/WFProductsManagementService.js");
const getUserAccessToken = require("../utils/getUserAccessToken.js");
const responseHandler = require("../utils/responseHandler.js");
const CustomError = require("../utils/customError.js");

/**
 * Controller to fetch and save products from Webflow
 */
const fetchProductsFromWebflow = async (req, res, next) => {
  try {
    console.log("Next middleware function:", next);
    const { userId } = req.params;
    const { siteId } = req.query;

    if (!siteId) {
      throw new CustomError("Site ID is required in the query string.", 400);
    }

    // Fetch user's Webflow access token
    const accessToken = await getUserAccessToken(userId);
    if (!accessToken) {
      throw new CustomError("User does not have a Webflow access token.", 401);
    }

    // Fetch and save products
    const result = await fetchAndSaveProducts(userId, siteId, accessToken);

    return responseHandler(res, 200, result.message, result.data);
  } catch (error) {
    console.error("Error in fetchProductsFromWebflow Controller:", error.message);

    // Pass the error to the global error handler
    next(
      error instanceof CustomError
        ? error
        : new CustomError("Failed to fetch products", 500)
    );
    
  }
};


const getProductCount = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { siteId } = req.query;

    // Validate required parameters
    if (!userId || !siteId) {
      throw new CustomError("User ID and Site ID are required", 400);
    }

    // Create the filter
    const filter = { userId,siteId };

    // Fetch the collection count using the service
    const collectionCount = await countProductDocuments(filter);

    // Return response
    return responseHandler(res, 200, "Product count fetched successfully", {
      collectionCount,
    });
  } catch (error) {
    console.error("Error in getProductCount Controller:", error.message);

    next(
      error instanceof CustomError
        ? error
        : new CustomError("Failed to fetch product count", 500)
    );
  }
};

module.exports = { fetchProductsFromWebflow,getProductCount };
