const CustomError = require("../utils/customError.js");
const getDuplicateKeyErrorMessage = require("../utils/duplicateKeyError.js");
const responseHandler = require("../utils/responseHandler.js");
const User = require("../modals/userManagementModal");
const sendEmail = require("../utils/sendEmail.js");
const crypto = require("crypto");

const createUser = async (req, res, next) => {
  try {
    const { password, email } = req.body;

    if (!password || !email) {
      throw new CustomError("Email and Password are required", 401);
    }

    const user = new User({ password, email });
    const verificationCode = user.generateEmailVerificationCode();
    await user.save();

    const htmlContent = `
      <html>
        <body>
          <h1>Email Verification</h1>
          <p>Your verification code is: <b>${verificationCode}</b></p>
          <p>This code expires in 10 minutes.</p>
        </body>
      </html>
    `;

    await sendEmail({
      to: user.email,
      subject: "Email Verification",
      html: htmlContent,
    });

    return responseHandler(res, 200, "Registration successful.", {
      email: user.email,
      isEmailVerified: user.isEmailVerified,
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      const errorMessage = getDuplicateKeyErrorMessage(error);
      return next(new CustomError(errorMessage, 400));
    }

    // Pass other errors to the global error handler
    next(error instanceof CustomError ? error : new CustomError(error.message, 500));
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new CustomError("Email and Password are required", 401);
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new CustomError("Wrong email or Password", 404);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new CustomError("Wrong email or Password", 401);
    }

    if (!user.isEmailVerified) {
      const verificationCode = user.generateEmailVerificationCode();
      await user.save();

      const htmlContent = `
        <html>
          <body>
            <h1>Email Verification</h1>
            <p>Your new verification code is: <b>${verificationCode}</b></p>
            <p>This code expires in 10 minutes.</p>
          </body>
        </html>
      `;

      await sendEmail({
        to: user.email,
        subject: "Email Verification",
        html: htmlContent,
      });

      return responseHandler(res, 400, "Email not verified. Verification code sent.", {
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      });
    }

    const token = user.createJWT();

    return responseHandler(res, 200, "Login successful", {
      email: user.email,
      webflowAccessToken: user?.webflowAccessToken || null,
      isEmailVerified: user.isEmailVerified,
      token,
    });
  } catch (error) {
    next(error instanceof CustomError ? error : new CustomError(error.message, 500));
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new CustomError("Email is required", 401);
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new CustomError("Email not found", 404);
    }

    const resetToken = user.getResetPasswordToken();
    await user.save();

    const resetUrl = `${process.env.RESET_PASSWORD_BASE_URL}/reset-password/${resetToken}`;

    const htmlContent = `
      <html>
        <body>
          <h1>Reset Your Password</h1>
          <p><a href="${resetUrl}">Click here to reset your password</a></p>
          <p>This link expires in 10 minutes.</p>
        </body>
      </html>
    `;

    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      html: htmlContent,
    });

    return responseHandler(res, 200, "Password reset email sent", { resetToken });
  } catch (error) {
    next(error instanceof CustomError ? error : new CustomError(error.message, 500));
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const newPassword=req.body.password;
    if(!newPassword){
      throw new CustomError("password is required", 401);

    }
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.resetToken)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      throw new CustomError("Invalid or expired reset token", 400);
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return responseHandler(res, 200, "Password reset successful", {
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      token: user.createJWT(),
    });
  } catch (error) {
    next(error instanceof CustomError ? error : new CustomError(error.message, 500));
  }
};

const verifyEmailCode = async (req, res, next) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      throw new CustomError("Email and code is required", 401);
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new CustomError("User not found", 404);
    }

    const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
    if (user.emailVerificationCode !== hashedCode || user.emailVerificationExpire < Date.now()) {
      throw new CustomError("Invalid or expired verification code", 400);
    }

    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    return responseHandler(res, 200, "Email verified successfully", {
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      webflowAccessToken:user?.webflowAccessToken || null,
      token: user.createJWT(),
    });
  } catch (error) {
    next(error instanceof CustomError ? error : new CustomError(error.message, 500));
  }
};

const resendVerificationCode = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      throw new CustomError("Email is required", 401);
    }
    const user = await User.findOne({ email });
    if (!user) {
      throw new CustomError("User not found", 404);
    }

    if (user.isEmailVerified) {
      throw new CustomError("Email is already verified", 400);
    }

    const newVerificationCode = user.generateEmailVerificationCode();
    await user.save();

    const htmlContent = `
      <html>
        <body>
          <h1>Email Verification</h1>
          <p>Your new verification code is: <b>${newVerificationCode}</b></p>
          <p>This code expires in 10 minutes.</p>
        </body>
      </html>
    `;

    await sendEmail({
      to: user.email,
      subject: "New Email Verification Code",
      html: htmlContent,
    });

    return responseHandler(res, 200, "Verification code resent successfully", true);
  } catch (error) {
    next(error instanceof CustomError ? error : new CustomError(error.message, 500));
  }
};

module.exports = {
  createUser,
  login,
  forgotPassword,
  resetPassword,
  verifyEmailCode,
  resendVerificationCode,
};
