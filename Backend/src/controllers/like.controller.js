import  { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { Apiresponse } from "../utils/Api.response.js"
import asyncHandler from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: toggle like on video
    if (!videoId) throw new ApiError(400, "Invalid video id")
    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video id format")
    const like = await Like.findOne({
        video: videoId,
        likedBy: req.user._id
    })
    if (like) {
        await Like.findByIdAndDelete(like._id)
        return res.status(200).json(new Apiresponse(200, null, "Like removed successfully"))
    }
    const likevideo = await Like.create({
        video: videoId,
        likedBy: req.user._id
    })
    res.status(200).json(new Apiresponse(200, likevideo, "Like added successfully"))
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    //TODO: toggle like on comment
    if (!commentId) throw new ApiError(400, "please provide a commentId")
    if (!isValidObjectId(commentId)) throw new ApiError(400, "Invalid commentId format")
    const comment = await Like.findOne(
        {
            likedBy: req.user._id,
            comment: commentId
        }
    )
    if (comment) {
        await Like.findByIdAndDelete(comment._id)
        return res.status(200).json(new Apiresponse(200, null, "Like removed successfully"))
    }
    const likeComment = await Like.create({
        likedBy: req.user._id,
        comment: commentId
    })
    res.status(200).json(new Apiresponse(200, likeComment, "Like added successfully"))
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    //TODO: toggle like on tweet
    if (!tweetId) throw new ApiError(400, "please provide twwetId")
    if (!isValidObjectId(tweetId)) throw new ApiError(400, "invalid tweet ID")
    const likeTweet = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user._id
    })
    if (likeTweet) {
        await Like.findByIdAndDelete(likeTweet._id)
        return res.status(200).json(new Apiresponse(200, null, "Like removed successfully"))
    }
    const like = await Like.create({
        tweet: tweetId,
        likedBy: req.user._id
    })
    res.status(200).json(new Apiresponse(200, like, "Like added successfully"))
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: req.user._id,
                video: { $exists: true }
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoDetails"
            }
        },
        {
            $unwind: "$videoDetails"
        },
        {
            $project: {
                _id: 0,
                videoId: "$videoDetails._id",
                title: "$videoDetails.title",
                owner: "$videoDetails.owner",
                likeId: "$_id"
            }
        }
    ]);

    res.status(200).json(new Apiresponse(200, likedVideos, "Liked videos fetched successfully"));
});

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}