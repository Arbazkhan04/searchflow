const User = require("../modals/userManagementModal");

// Example function to update 'sites' status after fetching
const updateFetchedStatus = async (userId, field) => {
  const updateField = {};
  updateField[`webflowDataFetchedAndSaved.${field}`] = true;

  await User.findByIdAndUpdate(userId, { $set: updateField }, { new: true });
};

module.exports = { updateFetchedStatus };
