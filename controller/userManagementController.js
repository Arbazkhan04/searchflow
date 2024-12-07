const CustomError =require('../utils/customError.js')
const responseHandler= require('../utils/responseHandler.js')
const User = require('../modals/userManagementModal');
const sendEmail = require("../utils/sendEmail.js");
const mongoose = require('mongoose'); // Ensure mongoose is imported
const crypto = require('crypto');

const createUser = async (req, res, next) => {
  try {
      const { userName, password, email, phone } = req.body;

      // Create new user
      const user = new User({ userName, password, email, phone });

      // Generate email verification token
      const verificationCode = user.generateEmailVerificationCode();

      // Save user to database
      await user.save();

      // Prepare email content
      const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; font-size: 16px; color: #333; }
            .header { background-color: #f8f8f8; padding: 20px 5px; text-align: center; }
            .content { padding: 20px 5px; }
            .footer { background-color: #f8f8f8; padding: 20px 5px; text-align: center; font-size: 14px; }
            .code { font-size: 24px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Email Verification</h1>
          </div>
          <div class="content">
            <p>Here is your new email verification code:</p>
            <p class="code">${verificationCode}</p>
            <p>This code will expire in 10 minutes.</p>
          </div>
          <div class="footer">
            <p>Ecofocus Team</p>
          </div>
        </body>
      </html>
    `;

      // Send verification email
      await sendEmail({
          to: user.email,
          subject: 'Email Verification',
          html: htmlContent,
      });

      // Send success response
      return responseHandler(res, 200, 'Regissssstration successful', {
          email: user.email,
          isEmailVerified: user.isEmailVerified,
      });
  } catch (error) {
      // Pass error to global error handler
      next(error instanceof CustomError ? error : new CustomError(error.message, 500));
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return responseHandler(res, 404, 'User not found', false);
    }

    // Check if the password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return responseHandler(res, 401, 'Invalid password', false); // 401 Unauthorized for incorrect credentials
    }

    // Check if the user's email is verified
    if (!user.isEmailVerified) {
      const verificationCode = user.generateEmailVerificationCode();
      await user.save();

      // Prepare verification email content
      const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; font-size: 16px; color: #333; }
            .header { background-color: #f8f8f8; padding: 20px 5px; text-align: center; }
            .content { padding: 20px 5px; }
            .footer { background-color: #f8f8f8; padding: 20px 5px; text-align: center; font-size: 14px; }
            .code { font-size: 24px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Email Verification</h1>
          </div>
          <div class="content">
            <p>Here is your new email verification code:</p>
            <p class="code">${verificationCode}</p>
            <p>This code will expire in 10 minutes.</p>
          </div>
          <div class="footer">
            <p>Ecofocus Team</p>
          </div>
        </body>
      </html>
      `;

      // Send verification email
      await sendEmail({
        to: user.email,
        subject: 'Email Verification',
        html: htmlContent,
      });

      // Return response asking user to verify email
      return responseHandler(
        res,
        400, // 400 Bad Request for incomplete verification
        'Email not verified. Verification code sent to your email.',
        {
          email: user.email,
          isEmailVerified: user.isEmailVerified,
        }
      );
    }

    // Generate JWT token
    const token = user.createJWT();

    // Send success response
    return responseHandler(res, 200, 'Login successful', {
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      token,
    });
  } catch (error) {
    // Pass error to global error handler
    next(error instanceof CustomError ? error : new CustomError(error.message, 500));
  }
};



const forgotPassword = async (req, res, next) => {
    try {
      const { email } = req.body;
  
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(200).json({ error: error.message, message:'Email not found', data: false });
      }
  
      // Generate and get reset password token
      const resetToken = user.getResetPasswordToken();
  
      // Save the user with the reset token and expiration time
      await user.save();
  
      // Create reset URL
      const resetUrl = `${process.env.RESET_PASSWORD_BASE_URL}/reset-password/${resetToken}`;
  
      // Define HTML content for the email
      const htmlContent = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; font-size: 16px; color: #333; }
          .header { background-color: #f8f8f8; padding: 20px 5px; text-align: center; }
          .content { padding: 20px 5px; }
          .footer { background-color: #f8f8f8; padding: 20px 5px; text-align: center; font-size: 14px; }
          .btn-reset { background-color: #4bcc5a; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
          .password-header { font-weight: 700; font-size: 30px; }
        </style>
      </head>
      <body>
        <div class="header">
          <p class="password-header">Reset your password</p>
        </div>
        <div class="content">
          <p>We heard you need a password reset. Click the link below to reset your password:</p>
          <p style="text-align: center; margin: 50px 0;">
            <a href="${resetUrl}" class="btn-reset" style="color: #fff;">Reset Password</a>
          </p>
          <p>If you did not request this password change, you can safely ignore this email. The link will expire in 10 minutes.</p>
        </div>
        <div class="footer">
          <p>Ecofocus Team</p>
        </div>
      </body>
    </html>
  `;
  
      // Send the email with the HTML content
      try {
        await sendEmail({
          to: user.email,
          subject: "Password Reset Request",
          html: htmlContent, // Send HTML content here
        });
        res.status(200).json({ message:'Email sent', data:true, resetToken:resetToken });
        // res.status(StatusCodes.OK).json({ success: true, data: "Email sent" });
      } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
  
        await user.save();
  
        return res.status(200).json({error:error.message, message: "Email could not be sent",data:false });
      }
    } catch (error) {
      return res.status(200).json({ error: error.message, message: "Email could not be sent",data:false });
    }
  };
  
  const resetPassword = async (req, res) => {
    try {
      const resetPasswordToken = crypto
        .createHash("sha256")
        .update(req.params.resetToken)
        .digest("hex");
  
      const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() },
      });
  
      if (!user) {
        return res.status(200).json({ message: 'Invalid or expired token', data: false });
      }
  
      // Set new password
      user.password = req.body.password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
  
      await user.save();
  
      res
        .status(200)
        .json({ data: true, message: "Password reset successful", email: user.email, isEmailVerified: user.isEmailVerified, token: user.createJWT() });
    } catch (err) {
      return res.status(200).json({ error: err.message, message: "Password reset failed", data: false });
    }
  };


  const verifyEmailCode = async (req, res) => {
    try {
        const { email, code } = req.body;

        // Find the user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(200).json({ message: 'User not found', data: false });
        }

        // Hash the code to compare with the stored hashed code
        const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

        // Check if the code matches and hasn't expired
        if (
            user.emailVerificationCode !== hashedCode ||
            user.emailVerificationExpire < Date.now()
        ) {
            return res.status(200).json({ message: 'Invalid or expired verification code', data: false });
        }

        // Mark the email as verified and clear the verification fields
        user.isEmailVerified = true;
        user.emailVerificationCode = undefined;
        user.emailVerificationExpire = undefined;

        await user.save();

        res.status(200).json({
            message: 'Email verified successfully!',
            email: user.email,
            isEmailVerified: user.isEmailVerified,
            token: user.createJWT(), //create jwt token for the verified user
            data: true
        });
    } catch (error) {
        res.status(200).json({ error: error.message, message: 'Email verification failed', data: false });
    }
};

const resendVerificationCode = async (req, res) => {
    try {
        const { email } = req.body;

        // Find the user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(200).json({ message: 'User not found', data: false });
        }

        if (user.isEmailVerified) {
            return res.status(200).json({ message: 'Email is already verified', data: false });
        }
        
        if (user.emailVerificationExpire && Date.now() < user.emailVerificationExpire) {
            return res.status(200).json({ message: 'You can request a new code only after 2 minutes.', data: false });
        }        

        // Generate a new verification code
        const newVerificationCode = user.generateEmailVerificationCode();

        // Save the updated user with the new code and expiration time
        await user.save();

        // Send the new verification code via email
        const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; font-size: 16px; color: #333; }
              .header { background-color: #f8f8f8; padding: 20px 5px; text-align: center; }
              .content { padding: 20px 5px; }
              .footer { background-color: #f8f8f8; padding: 20px 5px; text-align: center; font-size: 14px; }
              .code { font-size: 24px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Email Verification</h1>
            </div>
            <div class="content">
              <p>Here is your new email verification code:</p>
              <p class="code">${newVerificationCode}</p>
              <p>This code will expire in 10 minutes.</p>
            </div>
            <div class="footer">
              <p>Ecofocus Team</p>
            </div>
          </body>
        </html>
      `;

        await sendEmail({
            to: user.email,
            subject: 'New Email Verification Code',
            html: htmlContent
        });

        res.status(200).json({
            message: 'A new verification code has been sent to your email.',
            data: true
        });
    } catch (error) {
        res.status(200).json({ error: error.message, message: 'Failed to resend verification code', data: false });
    }
};



  module.exports = {
        createUser,
        login,
        forgotPassword,
        resetPassword,
        verifyEmailCode,
        resendVerificationCode
  }