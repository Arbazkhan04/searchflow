const { fetchAndSaveUserCollections ,countCollectionDocuments} = require("../services/WFCollectionManagementService.js");
const getUserAccessToken = require("../utils/getUserAccessToken.js");
const User = require("../modals/userManagementModal.js")
const responseHandler = require("../utils/responseHandler.js");
const CustomError = require("../utils/customError.js");

/**
 * Controller to fetch and save user Webflow collections
 */
const fetchUserCollectionsFromWebflow = async (req, res, next) => {
  try {
    const userId = req.params.userId; // User ID from route parameter
    const siteId = req.query.siteId; // Site ID from query string
    
     // check if user exist or not 
     const isUserExist = await User.findById(userId)
     if (!isUserExist) {
       throw new CustomError("User does not exist", 401);
     }


    // Fetch user's access token
    const accessToken = await getUserAccessToken(isUserExist?._id);
    if (!accessToken) {
      throw new CustomError("User does not have a Webflow access token.", 401);
    }
    

    
    // Fetch and save collections
    const result = await fetchAndSaveUserCollections(userId, siteId, accessToken);

    // Respond with success
    responseHandler(res, 200, result.message, result.data);
  } catch (error) {
    console.error("Error in fetchUserCollectionsFromWebflow Controller:", error.message);
    next(error instanceof CustomError ? error : new CustomError(error.message, 500));
  }
};




/**
 * Controller to get the count of collections for a specific user and site
 * @route GET /api/collections/count/:userId
 * @queryParam {string} siteId - The ID of the site
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getCollectionCount = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { siteId } = req.query;

    // Validate required parameters
    if (!userId || !siteId) {
      throw new CustomError("User ID and Site ID are required", 400);
    }

    // Create the filter
    const filter = { userId, webflowsiteId: siteId };

    // Fetch the collection count using the service
    const collectionCount = await countCollectionDocuments(filter);

    // Return response
    return responseHandler(res, 200, "Collection count fetched successfully", {
      collectionCount,
    });
  } catch (error) {
    console.error("Error in getCollectionCount Controller:", error.message);

    next(
      error instanceof CustomError
        ? error
        : new CustomError("Failed to fetch collection count", 500)
    );
  }
};

module.exports = { fetchUserCollectionsFromWebflow ,getCollectionCount};
