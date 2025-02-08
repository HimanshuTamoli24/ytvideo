import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { Apiresponse } from "../utils/Api.response.js";
import asyncHandler from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    const { content } = req.body;

    if (!userId || !content?.trim()) {
        throw new ApiError(400, "User ID and content are required.");
    }
    if (content.trim().length === 0) {
        throw new ApiError(400, "Content cannot be empty.");
    }

    // Create and populate tweet
    const tweet = await Tweet.create({ owner: userId, content });
    const populatedTweet = await Tweet.findById(tweet._id).populate("owner", "username");

    res.status(201).json(new Apiresponse(201, populatedTweet, "Tweet created successfully."));
});

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    const tweets = await Tweet.find({ owner: userId }).populate("owner", "username");
    res.status(200).json(new Apiresponse(200, tweets, "User tweets retrieved successfully."));
});

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const userId = req?.user?._id;
    const { content } = req.body;

    if (!isValidObjectId(tweetId) || !userId) {
        throw new ApiError(400, "Invalid tweet ID or user ID");
    }
    if (content.trim().length === 0) {
        throw new ApiError(400, "Content cannot be empty.");
    }

    // Fetch tweet first
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found.");
    }

    // Ensure only the owner can update
    if (String(tweet.owner) !== String(userId)) {
        throw new ApiError(403, "Unauthorized: You cannot update someone else's tweet.");
    }

    // Update and populate
    tweet.content = content;
    const updatedTweet = await tweet.save();
    await updatedTweet.populate("owner", "username");

    res.status(200).json(new Apiresponse(200, updatedTweet, "Tweet updated successfully."));
});

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const userId = req?.user?._id;

    if (!isValidObjectId(tweetId) || !userId) {
        throw new ApiError(400, "Invalid tweet ID or user ID");
    }

    // Fetch tweet first
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found.");
    }

    // Ensure only the owner can delete
    if (String(tweet.owner) !== String(userId)) {
        throw new ApiError(403, "Unauthorized: You cannot delete someone else's tweet.");
    }

    // Now delete
    await tweet.deleteOne();

    res.status(200).json(new Apiresponse(200, null, "Tweet deleted successfully."));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
