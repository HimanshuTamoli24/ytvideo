import { Router } from 'express';
import {
    toggleSubscription,
    getUserFollowers,
    getUserFollowing
} from "../controllers/subscriptions.controller.js"
import { verifyJwt } from "../middlewares/auth.middleware.js"

const router = Router();
router.use(verifyJwt); // Apply verifyJWT middleware to all routes in this file

router
    .route("/c/:channelId")
    .get(getUserFollowing)
    .post(toggleSubscription);

router.route("/u/:userAccountId").get(getUserFollowers);

export default router