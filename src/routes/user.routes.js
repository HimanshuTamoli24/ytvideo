import express from 'express';
import { registerUser, loginUser, logoutUser, accessRefreshToken } from '../controllers/user.controllers.js';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJwt } from '../middlewares/auth.middleware.js';
const router = express.Router()

// Register User
router.
    route("/register").post(
        upload.fields([
            {
                name: "avatar",
                maxCount: 1
            }, {
                name: "coverImage",
                maxCount: 1
            }
        ])
        , registerUser)

router.route("/login").post(loginUser)
// secured routes
router.route("/logout").post(verifyJwt, logoutUser)
router.route("/refresh-token").post(accessRefreshToken)
export default router