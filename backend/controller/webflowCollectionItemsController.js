const { fetchAndSaveSiteItems,countItemDocuments } = require("../services/WFLiveItemsManagementService.js");
const getUserAccessToken = require("../utils/getUserAccessToken.js");
const responseHandler = require("../utils/responseHandler.js");
const CustomError = require("../utils/customError.js");

/**
 * Controller to fetch and save items from Webflow
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const fetchItemsFromWebflow = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const siteId = req.query.siteId;

    if (!siteId) {
      throw new CustomError("Site ID is required in the query string.", 400);
    }

    // Fetch user's access token
    const accessToken = await getUserAccessToken(userId);
    if (!accessToken) {
      throw new CustomError("User does not have a Webflow access token.", 401);
    }

    // Fetch and save items
    const result = await fetchAndSaveSiteItems(userId, siteId, accessToken);

    responseHandler(res, 200, result.message, result.data);
  } catch (error) {
    console.error("Error in fetchItemsFromWebflow Controller:", error.message);
    next(error instanceof CustomError ? error : new CustomError(error.message, 500));
  }
};

const getItemCount = async (req, res, next) => {
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
    const collectionCount = await countItemDocuments(filter);

    // Return response
    return responseHandler(res, 200, "Items count fetched successfully", {
      collectionCount,
    });
  } catch (error) {
    console.error("Error in getItemCount Controller:", error.message);

    next(
      error instanceof CustomError
        ? error
        : new CustomError("Failed to fetch items count", 500)
    );
  }
};

module.exports = { fetchItemsFromWebflow, getItemCount};
