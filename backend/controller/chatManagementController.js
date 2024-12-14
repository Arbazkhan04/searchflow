const CustomError = require("../utils/customError.js");
const responseHandler = require("../utils/responseHandler.js");
const Chat = require("../modals/chatManagementModel.js");

const createChat = async (req, res, next) => {
  try {
    const participants = req.body?.participants;
    const userAId = participants[0];
    const userBId = participants[1];

    // Validation: Ensure two unique participants
    if (userAId === userBId) {
      return responseHandler(res, 400, "A user cannot chat with themselves.");
    }

    // Check if chat already exists
    const existingChat = await Chat.findOne({
      participants: { $all: [userAId, userBId] },
    });

    if (existingChat) {
      return responseHandler(
        res,
        200,
        "Chat found successfully.",
        existingChat
      );
    }

    // Create a new chat instance
    const newChat = new Chat({
      participants: [userAId, userBId],
    });

    // Save the new chat to the database
    await newChat.save();

    return responseHandler(res, 201, "Chat created successfully.", newChat);
  } catch (error) {
    next(error instanceof CustomError ? error : new CustomError(error.message, 500));
  }
};

module.exports = {
  createChat,
};
