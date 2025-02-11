import mongoose, { isValidObjectId } from "mongoose";
import Video from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { Apiresponse } from "../utils/Api.response.js";
import asyncHandler from "../utils/asyncHandler.js";
import { Playlist } from "../models/playlist.model.js";

// Create a playlist
const createPlaylist = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { name, description } = req.body;

    if (!name?.trim() || !description?.trim()) {
        throw new ApiError(400, "Title and description are required");
    }

    const newPlaylist = await Playlist.create({ owner: userId, name: name.trim(), description: description.trim() });
    res.status(201).json(new Apiresponse(201, newPlaylist, "Playlist created successfully."));
});

// Get a playlist by ID
const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    if (!isValidObjectId(playlistId)) throw new ApiError(400, "Invalid Playlist ID format");

    const playlist = await Playlist.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(playlistId) } },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "allPlaylistVideo"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        { $unwind: { path: "$ownerDetails", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                videos: "$allPlaylistVideo",
                owner: {
                    _id: "$ownerDetails._id",
                    username: "$ownerDetails.username",
                    email: "$ownerDetails.email"
                }
            }
        }
    ]);

    if (!playlist.length) throw new ApiError(404, "Playlist not found");
    res.status(200).json(new Apiresponse(200, playlist[0], "Playlist fetched successfully"));
});

// Update a playlist
const updatePlaylist = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { playlistId } = req.params;
    let { name, description } = req.body;

    if (!name?.trim() || !description?.trim()) {
        throw new ApiError(400, "Title and description are required");
    }
    if (!isValidObjectId(playlistId)) throw new ApiError(400, "Invalid playlist ID format");

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(404, "Playlist not found");

    if (!playlist.owner.equals(userId)) throw new ApiError(403, "You are not authorized to update this playlist");

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $set: { name: name.trim(), description: description.trim() } },
        { new: true }
    );

    res.status(200).json(new Apiresponse(200, updatedPlaylist, "Successfully updated the playlist details"));
});

// Delete a playlist
const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(playlistId)) throw new ApiError(400, "Invalid Playlist ID format");

    const playlist = await Playlist.findOneAndDelete({ _id: playlistId, owner: userId });
    if (!playlist) throw new ApiError(404, "Playlist not found or already deleted");

    res.status(200).json(new Apiresponse(200, null, "Playlist deleted successfully."));
});

// Add a video to a playlist
const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { videoId, playlistId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(videoId) || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid video or playlist ID format");
    }

    const videoExists = await Video.findById(videoId);
    if (!videoExists) throw new ApiError(404, "Video not found");

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(404, "Playlist not found");

    if (!playlist.owner.equals(userId)) throw new ApiError(403, "You are not allowed to modify this playlist");

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $addToSet: { videos: videoId } },
        { new: true }
    );

    res.status(201).json(new Apiresponse(201, updatedPlaylist, "Video added to playlist successfully."));
});

// Remove a video from a playlist
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { videoId, playlistId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Playlist or Video ID format");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(404, "Playlist not found");

    if (!playlist.owner.equals(userId)) throw new ApiError(403, "You are not authorized to remove videos from this playlist");

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $pull: { videos: videoId } },
        { new: true }
    );

    res.status(200).json(new Apiresponse(200, updatedPlaylist, "Video removed from playlist successfully"));
});

// Get all playlists for a user
const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!isValidObjectId(userId)) throw new ApiError(400, "Invalid user ID format");

    const playlists = await Playlist.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(userId) } },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        { $unwind: "$ownerDetails" },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                owner: {
                    _id: "$ownerDetails._id",
                    username: "$ownerDetails.username",
                    email: "$ownerDetails.email"
                }
            }
        },
        { $sort: { _id: -1 } }, // Sort by creation date
        { $skip: (parseInt(page) - 1) * parseInt(limit) },
        { $limit: parseInt(limit) }
    ]);

    const totalPlaylists = await Playlist.countDocuments({ owner: userId });

    if (!playlists.length) throw new ApiError(404, "No playlists found for this user");

    res.status(200).json(new Apiresponse(200, { playlists, totalPlaylists, page, limit }, "User playlists fetched successfully"));
});

export {
    addVideoToPlaylist,
    createPlaylist,
    deletePlaylist,
    getPlaylistById,
    getUserPlaylists,
    removeVideoFromPlaylist,
    updatePlaylist,
};
