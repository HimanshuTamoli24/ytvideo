
import mongoose from "mongoose"
import Video from "../models/video.model.js"
import Subscription from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { Apiresponse } from "../utils/Api.response.js";

import asyncHandler from "../utils/asyncHandler.js"


const getChannelStats = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    console.log("userId", userId);

    // Get total videos
    const TotalVideo = await Video.countDocuments({ owner: userId });
    if (TotalVideo == null || TotalVideo == undefined)
        throw new ApiError(400, "Something went wrong while fetching total videos");

    console.log("Total Videos:", TotalVideo);

    // Get total subscribers
    const totalSubscriber = await Subscription.countDocuments({ channel: userId });
    if (totalSubscriber == null || totalSubscriber == undefined)
        throw new ApiError(400, "Something went wrong while fetching total subscribers");

    console.log("Total Subscribers:", totalSubscriber);
    
    const userVideos = await Video.find({ owner: userId });
    console.log("User Videos:", userVideos);

    // Get total views and total hours of content
    const totalViewsData = await Video.aggregate([
        { $match: { owner: userId } },
        {
            $group: {
                _id: null,
                totalViews: { $sum: "$views" },
                totalHourContent: { $sum: "$duration" }
            }
        }
    ]);

    console.log("Total Views Data:", totalViewsData);

    // Extract values from aggregation result
    const totalViews = totalViewsData[0]?.totalViews || 0;
    const totalHourContent = totalViewsData[0]?.totalHourContent || 0;

    // Send response
    res.status(200).json(
        new Apiresponse(200, {
            totalVideos: TotalVideo,
            totalSubscribers: totalSubscriber,
            totalViews: totalViews,
            totalHourContent: totalHourContent
        }, "Channel stats fetched successfully")
    );
});


const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
})

export {
    getChannelStats,
    getChannelVideos
}
