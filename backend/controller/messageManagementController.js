const CustomError = require("../utils/customError.js");
const responseHandler = require("../utils/responseHandler.js");
const Message = require("../modals/messageManagementModel.js");
const Chat = require("../modals/chatManagementModel.js");


const User = require("../modals/userManagementModal");
const mongoose = require("mongoose");

// const newMessage = async (req, res, next) => {
//   try {
//     const { chatId, senderId, receiverId, messageType, content } = req.body;

//     if (messageType === "media") {
//       if (!req.files || req.files.length === 0) {
//         return responseHandler(
//           res,
//           400,
//           "Media files are required for media messages"
//         );
//       }

//       const filesMetadata = req.files.map((file) => {
//         let fileType;

//         if (file.mimetype.startsWith("image/")) fileType = "image";
//         else if (file.mimetype.startsWith("audio/")) fileType = "audio";
//         else if (file.mimetype.startsWith("video/")) fileType = "video";
//         else fileType = "document";

//         return {
//           fileType: fileType,
//           fileName: file.filename,
//           fileUrl: `http://localhost:3003/uploads/${
//             file.destination.split("uploads/")[1]
//           }/${file.filename}`,
//           fileSize: file.size,
//           duration: file.mimetype.startsWith("audio/")
//             ? file.duration
//             : undefined,
//         };
//       });

//       const newMessage = new Message({
//         chatId,
//         senderId,
//         receiverId,
//         messageType: "media",
//         content: content || null,
//         files: filesMetadata,
//         timestamp: Date.now(),
//       });

//       await newMessage.save();

//       // Update the chat's last message
//       await Chat.findByIdAndUpdate(chatId, {
//         lastMessage: newMessage._id,
//         updatedAt: Date.now(),
//       });

//       return responseHandler(
//         res,
//         200,
//         "Message with media and text added successfully",
//         newMessage
//       );
//     }

//     if (messageType === "text") {
//       if (!content) {
//         return responseHandler(
//           res,
//           400,
//           "Text content is required for text messages"
//         );
//       }

//       const newMessage = new Message({
//         chatId,
//         senderId,
//         receiverId,
//         messageType: "text",
//         content,
//         timestamp: Date.now(),
//       });

//       await newMessage.save();

//       // Update the chat's last message
//       await Chat.findByIdAndUpdate(chatId, {
//         lastMessage: newMessage._id,
//         updatedAt: Date.now(),
//       });

//       return responseHandler(
//         res,
//         200,
//         "Text message added successfully",
//         newMessage
//       );
//     }

//     return responseHandler(
//       res,
//       400,
//       "Invalid message type or missing required fields"
//     );
//   } catch (error) {
//     next(
//       error instanceof CustomError ? error : new CustomError(error.message, 500)
//     );
//   }
// };


const newMessage = async (req, res, next) => {
  try {
    const { chatId, senderId, receiverId, messageType, content } = req.body;

    // Validate that chatId exists and senderId, receiverId are in the participants
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return responseHandler(res, 404, "Chat not found.");
    }

    // Check if senderId and receiverId exist in chat participants
    const participants = chat.participants.map((id) => id.toString());
    if (!participants.includes(senderId) || !participants.includes(receiverId)) {
      return responseHandler(
        res,
        400,
        "Sender or receiver is not part of this chat."
      );
    }

    if (messageType === "media") {
      if (!req.files || req.files.length === 0) {
        return responseHandler(
          res,
          400,
          "Media files are required for media messages."
        );
      }

      const filesMetadata = req.files.map((file) => {
        let fileType;

        if (file.mimetype.startsWith("image/")) fileType = "image";
        else if (file.mimetype.startsWith("audio/")) fileType = "audio";
        else if (file.mimetype.startsWith("video/")) fileType = "video";
        else fileType = "document";

        return {
          fileType: fileType,
          fileName: file.filename,
          fileUrl: `http://localhost:3003/uploads/${
            file.destination.split("uploads/")[1]
          }/${file.filename}`,
          fileSize: file.size,
          duration: file.mimetype.startsWith("audio/")
            ? file.duration
            : undefined,
        };
      });

      const newMessage = new Message({
        chatId,
        senderId,
        receiverId,
        messageType: "media",
        content: content || null,
        files: filesMetadata,
        timestamp: Date.now(),
      });

      await newMessage.save();

      // Update the chat's last message
      await Chat.findByIdAndUpdate(chatId, {
        lastMessage: newMessage._id,
        updatedAt: Date.now(),
      });

      return responseHandler(
        res,
        200,
        "Message with media and text added successfully.",
        newMessage
      );
    }

    if (messageType === "text") {
      if (!content) {
        return responseHandler(
          res,
          400,
          "Text content is required for text messages."
        );
      }

      const newMessage = new Message({
        chatId,
        senderId,
        receiverId,
        messageType: "text",
        content,
        timestamp: Date.now(),
      });

      await newMessage.save();

      // Update the chat's last message
      await Chat.findByIdAndUpdate(chatId, {
        lastMessage: newMessage._id,
        updatedAt: Date.now(),
      });

      return responseHandler(
        res,
        200,
        "Text message added successfully.",
        newMessage
      );
    }

    return responseHandler(
      res,
      400,
      "Invalid message type or missing required fields."
    );
  } catch (error) {
    next(
      error instanceof CustomError ? error : new CustomError(error.message, 500)
    );
  }
};


module.exports = {
    newMessage
}
