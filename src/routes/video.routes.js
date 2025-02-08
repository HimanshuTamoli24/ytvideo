import { Router } from "express";
import {
    deleteVideo,
    getAllVideos,
    getVideoById,
    publishAVideo,
    togglePublishStatus,
    updateVideo,
} from "../controllers/video.controller.js"
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js"

const router = Router();
router.use(verifyJwt)

router
    .route("/")
    .get(getAllVideos)
    .post(upload.fields([
        {
            name: "thumbnail",
            maxCount: 1
        },
        {
            name: "video",
            maxCount: 1
        }
    ]),
        publishAVideo,
    )
router
    .route("/:videoId")
    .get(getVideoById)
    .delete(deleteVideo)
    .patch(upload.single("thumbnail"), updateVideo)

router.route("/toggle/publish/:videoId").patch(togglePublishStatus);


export default router;