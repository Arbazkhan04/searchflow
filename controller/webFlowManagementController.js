const CustomError = require("../utils/customError.js");
const responseHandler = require("../utils/responseHandler.js");
const User = require("../modals/userManagementModal");
const he = require("he");
const axios = require("axios");
const qs = require("qs"); // For URL-encoding the request body

const connectWebFlowAccount = async (req, res, next) => {
  try {
    const userId = req.params.userId; // Assuming userId comes in request params
    console.log("user id in connectwebflowaccount", userId);
    const ClientId = process.env.WEBFLOW_CLIENT_ID;
    const redirectURI = process.env.REDIRECT_URI;

    // Encode userId in the state parameter
    const state = encodeURIComponent(JSON.stringify({ userId }));
    console.log("state at first place", state);
    const url = `https://webflow.com/oauth/authorize?client_id=${ClientId}&response_type=code&redirect_uri=${redirectURI}&state=${state}`;
    res.redirect(302, url);
  } catch (error) {
    next(
      error instanceof CustomError ? error : new CustomError(error.message, 500)
    );
  }
};

const getWebFlowAccessToken = async (req, res, next) => {
  try {
    const code = req.query?.code; // Get authorization code from query
    const state = req.query?.state; // Get state parameter from query
    console.log("State received:", state);

    // Decode HTML entities in the state parameter
    const htmlDecodedState = he.decode(state);
    console.log("HTML Decoded State:", htmlDecodedState);

    // Parse the JSON string after decoding
    const { userId } = JSON.parse(htmlDecodedState);
    console.log("User ID:", userId);

    const url = "https://api.webflow.com/oauth/access_token";
    const ClientId = process.env.WEBFLOW_CLIENT_ID;
    const redirectURI = process.env.REDIRECT_URI;
    const clientSecret = process.env.WEBFLOW_CLIENT_SECRET;

    const data = qs.stringify({
      client_id: ClientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectURI,
      grant_type: "authorization_code",
    });

    const response = await axios.post(url, data, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const accessToken = response?.data?.access_token;

    if (accessToken) {
      // Save the access token to the database for the user
      const user = await User.findById(userId);
      user.webflowAccessToken = accessToken;
      await user.save();
    }

    console.log("Access Token:", accessToken);
    res.redirect(302, process.env.USERDASHBOARD_URL);
  } catch (error) {
    next(
      error instanceof CustomError ? error : new CustomError(error.message, 500)
    );
  }
};

module.exports = {
  connectWebFlowAccount,
  getWebFlowAccessToken,
};
