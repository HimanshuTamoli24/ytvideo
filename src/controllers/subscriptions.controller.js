import mongoose, { isValidObjectId } from "mongoose";
import Subscription from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { Apiresponse } from "../utils/Api.response.js";
import asyncHandler from "../utils/asyncHandler.js";

// Toggle subscription between subscribing and unsubscribing to a channel.
const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    const userId = req.user._id;

    if (!isValidObjectId(channelId) || !isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid channel or user ID");
    }

    if (userId.toString() === channelId) {
        throw new ApiError(400, "You cannot subscribe to your own channel");
    }

    // Check if user is already subscribed to the channel
    const subscription = await Subscription.findOne({ channel: channelId, subscriber: userId });

    if (subscription) {
        // Unsubscribe
        await subscription.deleteOne();
        return res.status(200).json(new Apiresponse(200, null, `You have successfully unsubscribed from channel with ID: ${channelId}`));
    }

    // Subscribe
    const newSubscription = await Subscription.create({ channel: channelId, subscriber: userId });

    return res.status(200).json(new Apiresponse(200, newSubscription, `You have successfully subscribed to channel with ID: ${channelId}`));
});

// ye hain aam jindagi     -- using populate method

// user followers list
// const getUserFollowers = asyncHandler(async (req, res) => {
//     const { userAccountId } = req.params
//     if (!isValidObjectId(userAccountId)) {
//         throw new ApiError(404, "Invalid user ID");
//     }
//     const followers = await Subscription.find({
//         channel: userAccountId
//     }).populate("subscriber", "username email");

//     if (!followers || followers.length === 0) {
//         return res.status(200).json(new Apiresponse(200, [], `No followers found for user with ID: ${userAccountId}`));
//     }

//     res.status(200).json(new Apiresponse(200, followers, `Followers of user with ID: ${userAccountId}`));
// })

// user following list
// const getUserFollowing = asyncHandler(async (req, res) => {
//     const { channelId } = req.params
//     if (!isValidObjectId(channelId)) {
//         throw new ApiError(404, "Invalid user ID");
//     }
//     const following = await Subscription.find({
//         subscriber: channelId
//     }).populate("channel", "username email");

//     if (!following || following.length === 0) {
//         return res.status(200).json(new Apiresponse(200, [], `No users found that ${channelId} is following`));
//     }

//     res.status(200).json(new Apiresponse(200, following, `Users followed by user with ID: ${channelId}`));
// })


// ye hain mentos zindagi! -- using aggreration pipleline

// user followers list
const getUserFollowers = asyncHandler(async (req, res) => {
    const { userAccountId } = req.params
    if (!isValidObjectId(userAccountId)) {
        throw new ApiError(404, "Invalid user ID");
    }

    const followers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(userAccountId)
            }
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "subscriber",
                as: "followerDetails"
            }
        },
        {
            $unwind: "$followerDetails",
        },
        {
            $project: {
                _id: 0,
                followerId: "$followerDetails._id",
                name: "$followerDetails.username",
                email: "$followerDetails.email"
            }
        }
    ])
    // Check if any following users were found
    if (followers.length === 0) {
        return res.status(404).json(new Apiresponse(404, null, `No followers found for user with ID: ${userAccountId}`));
    }
    res.status(200).json(new Apiresponse(200, followers, `Followers for user with ID: ${userAccountId}`));
})

// user following list
const getUserFollowing = asyncHandler(async (req, res) => {

    const { channelId } = req.params
    if (!isValidObjectId(channelId)) {
        throw new ApiError(404, "Invalid user ID");
    }

    const following = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "userFollowing"
            }

        },
        {
            $unwind: "$userFollowing",
        },
        {
            $project: {
                _id: 0,
                followerId: "$userFollowing._id",
                name: "$userFollowing.username",
                email: "$userFollowing.email"
            }
        }
    ])
    // Check if any following users were found
    if (following.length === 0) {
        return res.status(404).json(new Apiresponse(404, null, `No following users found for ID: ${channelId}`));
    }
    res.status(200).json(new Apiresponse(200, following, `Following users with ID: ${channelId}`));


})
export {
    toggleSubscription,
    getUserFollowers,
    getUserFollowing
};
