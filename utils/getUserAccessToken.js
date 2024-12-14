const CustomError = require("../utils/customError");

const User = require("../modals/userManagementModal");

const getUserAccessToken = async (userId) => {
  const findUser = await User.findById(userId);

  if (!findUser) {
    next(
      new CustomError("wrong userID or no user exist against this userId", 400)
    );
  }

  return findUser.webflowAccessToken;
};

module.exports = getUserAccessToken;