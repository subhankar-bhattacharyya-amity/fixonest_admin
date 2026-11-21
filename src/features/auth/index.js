// Public API of the auth feature. Import from "@/features/auth/index.js",
// never reach into components/, hooks/, store/, or definitions/ from outside this folder.
export { default as AuthBootstrap } from "./components/AuthBootstrap.jsx";
export { useAuth } from "./hooks/useAuth.js";
export { ROLES } from "./definitions/roles.js";
export { loginValidationSchema } from "./definitions/loginValidation.js";
export { updateProfileValidationSchema } from "./definitions/updateProfileValidation.js";
export { changePasswordValidationSchema } from "./definitions/changePasswordValidation.js";
export {
  RESET_OTP_LENGTH,
  RESET_OTP_RESEND_COOLDOWN_SECONDS,
  forgotPasswordEmailSchema,
  resetOtpSchema,
  resetPasswordSchema,
} from "./definitions/forgotPasswordValidation.js";
export {
  buildProfileImageUrl,
  hasCustomProfileImage,
  PROFILE_IMAGE_TYPES,
  PROFILE_IMAGE_MAX_BYTES,
} from "./definitions/profileImage.js";
export {
  default as authReducer,
  loginUser,
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetForgottenPassword,
  fetchProfile,
  updateProfile,
  updateProfilePhoto,
  changePassword,
  logoutUser,
} from "./store/authSlice.js";
