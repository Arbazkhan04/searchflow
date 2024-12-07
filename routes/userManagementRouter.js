const express = require('express');
const router = express.Router();


const { createUser, login, forgotPassword, resetPassword, verifyEmailCode, resendVerificationCode } = require('../controller/userManagementController');
const { auth, authorizeRoles } = require('../middleware/authentication');


router.post('/createUser', createUser);
router.post('/login', login);
router.post('/forgotPassword', forgotPassword);
router.put('/resetPassword/:resetToken', resetPassword);
router.post('/verifyEmailCode', verifyEmailCode);
router.post('/resendVerificationCode', resendVerificationCode);

module.exports = router;