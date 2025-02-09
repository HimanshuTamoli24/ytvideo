import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { Apiresponse } from "../utils/Api.response.js";
import asyncHandler from "../utils/asyncHandler.js";
import { isValidObjectId } from "mongoose";

// Get all comments for a video
const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params;
    const { page = 1, limit = 5 } = req.query;
    if (!isValidObjectId(videoId) || !videoId.toString()) {
        throw new ApiError(400, "Invalid video ID");
    }
    const firstPage = Number(page);
    const limitpage = Number(limit);
    const startIndex = (firstPage - 1) * limitpage;

    const getComments = await Comment.find({ video: videoId })
        .skip(startIndex)
        .limit(limitpage)
        .sort({ createdAt: -1 }) // Sort by newest comments first
        .populate("owner", "username profilePicture"); // Populate user details

    if (!getComments || getComments.length === 0) {
        throw new ApiError(404, "No comments found for this video");
    }

    res
        .status(200)
        .json(
            new Apiresponse(
                200,
                getComments,
                `Comments for video with ID: ${videoId}`
            )
        );
});

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { videoId } = req.params;
    const { comment } = req.body;

    if (!isValidObjectId(videoId) || !videoId.toString()) {
        throw new ApiError(400, "Invalid video ID");
    }

    if (!comment) throw new ApiError(400, "Comment content is required");

    const newComment = await Comment.create({
        video: videoId,
        content: comment,
        owner: req.user.id,
    });
    if (!newComment)
        throw new ApiError(500, "Failed to add comment to the video");

    res
        .status(201)
        .json(
            new Apiresponse(
                201,
                newComment,
                `Comment added to video with ID: ${videoId}`
            )
        );
});

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params;
    const { comment } = req.body;
    if (!isValidObjectId(commentId) || !commentId.toString()) {
        throw new ApiError(400, "Invalid comment ID");
    }
    if (!comment) throw new ApiError(400, "Comment content is required");

    const commentToUpdate = await Comment.findById(commentId)

    if (!commentToUpdate) throw new ApiError(404, "Comment not found");

    if (req.user._id.toString() !== commentToUpdate.owner._id.toString())
        throw new ApiError(403, "you are not allowed to update");

    commentToUpdate.content = comment;

    await commentToUpdate.save();
    res
        .status(200)
        .json(
            new Apiresponse(
                200,
                commentToUpdate,
                `Comment updated with ID: ${commentId}`
            )
        );


});

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params;
    if (!isValidObjectId(commentId) || !commentId.toString()) {
        throw new ApiError(400, "Invalid comment ID");
    }
    const commentToDelete = await Comment.findById(commentId);
    if (!commentToDelete) throw new ApiError(404, "Comment not found");
    if (req.user._id?.toString() !== commentToDelete.owner?._id.toString())
        throw new ApiError(403, "You are not allowed to delete");
    await commentToDelete.deleteOne()

    res.status(200).json(new Apiresponse(200, null, "Comment deleted successfully"))

});

export { getVideoComments, addComment, updateComment, deleteComment };
