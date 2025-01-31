import express from 'express';
import {
    registerUser,
    loginUser,
    logoutUser,
    accessRefreshToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    deleteUser,
    deleteAllUser,
    getUserChannelProfile,
    getUserWatchHistory
} from '../controllers/user.controllers.js';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJwt } from '../middlewares/auth.middleware.js';

const router = express.Router()

// Register User
router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 }
    ]),
    registerUser
)

router.route("/login").post(loginUser)
// Secured routes
router.route("/logout").post(verifyJwt, logoutUser)
router.route("/refresh-token").post(accessRefreshToken)
router.route("/change-password").post(verifyJwt, changeCurrentPassword)
router.route("/current-user").get(verifyJwt, getCurrentUser)
router.route("/update-account-details").patch(verifyJwt, updateAccountDetails)
router.route("/update-avatar").patch(verifyJwt, upload.single("avatar"), updateUserAvatar)
router.route("/update-cover-image").patch(verifyJwt, upload.single("coverImage"), updateUserCoverImage)
router.route("/delete-user").delete(verifyJwt, deleteUser)
router.route("/delete-Alluser").delete(verifyJwt, deleteAllUser)
router.route("/c/:username").get(verifyJwt, getUserChannelProfile)
router.route("/history").get(verifyJwt, getUserWatchHistory)
export default router
