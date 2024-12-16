const { fetchAndSaveUserCollections } = require("../services/WFCollectionManagementService.js");
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

module.exports = { fetchUserCollectionsFromWebflow };
