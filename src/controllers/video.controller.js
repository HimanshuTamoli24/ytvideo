import mongoose, { isValidObjectId } from "mongoose"
import Video from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { Apiresponse } from "../utils/Api.response.js"
import asyncHandler from "../utils/asyncHandler.js"
import { deleteCloudinaryFile, uploadCloudinary, uploadVideoOnCloudinary, deleteVideoOnCloudinary } from "../utils/cloudinary.js"


// will work after sometime
const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 5, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    // pagination
    let firstPages = Number(page)
    let limitpages = Number(limit)
    let skip = Number((firstPages - 1) * limit)
    const allVideos = await Video.find({}).skip(skip).limit(limitpages)
    // const pagination = allVideos

    console.log("allVideos", allVideos)

    res.status(200).json(new Apiresponse(200, allVideos, "all videos fetched successfully"))
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if (!title || !description) throw new ApiError(400, "Title and description are required");

    const thumbnails = req.files?.thumbnail?.[0]?.path || null;
    const videos = req.files?.video?.[0]?.path || null;

    if (!videos || !thumbnails) throw new ApiError(400, "No video and thumbnail files found");

    const [thumbnailUpload, videoUpload] = await Promise.all([
        uploadCloudinary(thumbnails),
        uploadVideoOnCloudinary(videos)
    ])

    if (!thumbnailUpload || !videoUpload) throw new ApiError(500, "Failed to upload video. Please try again.");

    const videoPost = await Video.create({
        videoFile: videoUpload,
        thumbnail: thumbnailUpload.url,
        title,
        description,
        user: req.user._id,
    });

    res.status(201).json(new Apiresponse(201, "Video published successfully", videoPost));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(400, " video Id is required");
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id format");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "No video found with the provided videoId");
    }

    res.status(200).json(new Apiresponse(200, video, `Video with ID: ${videoId} retrieved successfully`));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video ID format");
    }

    // Find the existing video details
    const videoDetails = await Video.findById(videoId);
    if (!videoDetails) {
        throw new ApiError(404, "Video not found.");
    }

    let updatedThumbnailUrl = videoDetails.thumbnail;

    if (req.file) {
        // Upload new thumbnail to Cloudinary
        updatedThumbnailUrl = await uploadCloudinary(req.file?.path);

        // Delete old thumbnail from Cloudinary
        if (videoDetails.thumbnail) {
            const thumbnailPublicId = videoDetails.thumbnail.split("/").pop().split(".")[0];
            await deleteCloudinaryFile(thumbnailPublicId);
        }
    }

    // Update video details
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: updatedThumbnailUrl, // Save new thumbnail URL if updated
            },
        },
        { new: true }
    );

    res.status(200).json(new Apiresponse(200, updatedVideo, "Video details updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    if (!videoId) {
        throw new ApiError(400, " video Id is required");
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id format");
    }

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, "Video not found or already deleted");

    const videoPublicId = video.videoFile.split("/").slice(-2).join("/").split(".")[0];
    const thumbnailPublicId = video.thumbnail.split("/").pop().split(".")[0];

    await Promise.all([
        deleteCloudinaryFile(thumbnailPublicId),
        deleteVideoOnCloudinary(videoPublicId),
    ]);

    await video.deleteOne()
    res.status(200).json(new Apiresponse(200, null, `Video with ID: ${videoId} deleted successfully`));
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    // Find the video by ID
    const video = await Video.findById(videoId);

    if (!video) {
        return res.status(404).json({ message: "Video not found" });
    }

    // Toggle the isActive status
    video.isPublished = !video.isPublished;

    // Save the updated video
    await video.save();

    res.status(200).json({
        message: `Video isActive status updated to ${video.isPublished}`,
        video,
    });
});




export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}