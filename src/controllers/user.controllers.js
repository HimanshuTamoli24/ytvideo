import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import {
    uploadCloudinary,
    deleteCloudinaryFile,
    deleteAllCloudinaryFiles,
} from "../utils/cloudinary.js";
import { Apiresponse } from "../utils/Api.response.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Subscription from "../models/subscription.model.js";

// options for cookie
const options = {
    httpOnly: true,
    secure: true,
    // maxAge: 3600000,
    SameSite: "None",
};

// Generate access and refresh tokens
const generateAccessAndRefreshToken = async (userid) => {
    try {
        const user = await User.findById(userid);
        if (!user) {
            throw new ApiError(
                404,
                "User not found. Please check the provided user ID."
            );
        }

        // Generate tokens
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();
        user.refreshToken = refreshToken;

        // Save tokens in the database
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        console.error("Error generating tokens:", error);
        throw new ApiError(
            500,
            "An unexpected error occurred while generating authentication tokens."
        );
    }
};

// delete Cloudinary user files
const deleteCloudinaryUserFiles = async (id) => {
    try {
        const { avatar, coverImage } = await User.findById(id);
        if (!avatar || !coverImage) {
            return new ApiError(200, "User avatar or coverImage does not exist");
        }
        const avatarPublicId = avatar.split("/").pop().split(".")[0];
        const coverImagePublicId = coverImage.split("/").pop().split(".")[0];
        await deleteCloudinaryFile(avatarPublicId);
        await deleteCloudinaryFile(coverImagePublicId);
        return;
    } catch (error) {
        console.error("Error deleting Cloudinary user files:", error);
        throw new ApiError(
            500,
            "An unexpected error occurred while deleting user files from Cloudinary."
        );
    }
};

// delete All CloudinaryFiles
const deleteAllCloudinaryUserFiles = async () => {
    try {
        const users = await User.find({});
        //url array
        const userImageUrls = [];
        users.forEach((user) => {
            userImageUrls.push(user.avatar);
            userImageUrls.push(user.coverImage);
        });
        const publicIds = userImageUrls
            .map((url) => {
                // Match the public ID part of the Cloudinary URL using a regular expression
                const matches = url.match(/\/([^/]+\/[^/]+)\./); // This captures everything before the file extension
                return matches ? matches[1] : null; // Return the public ID (without the file extension)
            })
            .filter((id) => id);
        console.log(publicIds);
        await deleteAllCloudinaryFiles(publicIds);
    } catch (error) {
        console.error("Error deleting all Cloudinary files:", error);
        throw new ApiError(
            500,
            "An unexpected error occurred while deleting all user files from Cloudinary."
        );
    }
};

// Register new user
const registerUser = asyncHandler(async (req, res) => {
    const { username, fullname, email, password } = req.body;

    if (!username || !email || !password || !fullname) {
        throw new ApiError(
            400,
            "All fields (username, fullname, email, password) are required."
        );
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });

    if (existingUser) {
        throw new ApiError(
            400,
            "A user with this email or username already exists. Please try logging in."
        );
    }

    // Validate uploaded files
    const avatarPath = req.files?.avatar?.[0]?.path;
    const coverImagePath = req.files?.coverImage?.[0]?.path;

    if (!avatarPath || !coverImagePath) {
        throw new ApiError(
            400,
            "Both avatar and cover image are required for registration."
        );
    }

    // Upload to Cloudinary
    const avatar = await uploadCloudinary(avatarPath);
    const coverImage = await uploadCloudinary(coverImagePath);

    if (!avatar) {
        throw new ApiError(500, "Failed to upload user avatar. Please try again.");
    }

    // Create user
    const user = await User.create({
        username: username.toLowerCase(),
        fullname,
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage.url || "",
    });

    const savedUser = await User.findById(user.id).select(
        "-password -generateRefreshToken"
    );
    if (!savedUser) {
        throw new ApiError(500, "User registration failed. Please try again.");
    }

    return res
        .status(201)
        .json(new Apiresponse(201, savedUser, "User registered successfully!"));
});

// Login user
const loginUser = asyncHandler(async (req, res) => {
    const { password, email, username } = req.body;

    if (!username || !email || !password) {
        throw new ApiError(
            400,
            "Please provide all required fields (username, email, password)."
        );
    }

    const existUser = await User.findOne({ $or: [{ username }, { email }] });

    if (!existUser) {
        throw new ApiError(
            401,
            "No user found with these credentials. Please check your details and try again."
        );
    }

    const isPasswordCorrect = await existUser.isPasswordCorrect(password);
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Incorrect password. Please try again.");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        existUser._id
    );

    const loggedUser = await User.findById(existUser._id).select(
        "-password -refreshToken"
    );
    if (!loggedUser) {
        throw new ApiError(
            500,
            "Error retrieving user information. Please try again."
        );
    }
    return res
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new Apiresponse(
                200,
                { user: loggedUser, refreshToken, accessToken },
                "Login successful!"
            )
        );
});

// Logout user
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        { $unset: { refreshToken: "" } },
        { new: true, runValidators: true }
    );

    return res
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new Apiresponse(200, null, "User logged out successfully!"));
});

// Refresh access token
const accessRefreshToken = asyncHandler(async (req, res) => {
    const incomingToken = req.cookies.refreshToken;

    if (!incomingToken) {
        throw new ApiError(401, "Refresh token is missing. Please log in again.");
    }

    try {
        const decodedToken = jwt.verify(
            incomingToken,
            process.env.REFRESH_TOKEN_SECRET
        );
        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token. Please log in again.");
        }

        if (incomingToken !== user.refreshToken) {
            throw new ApiError(403, "Token mismatch detected. Please log in again.");
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
            user._id
        );

        return res
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new Apiresponse(
                    200,
                    { user, refreshToken, accessToken },
                    "Access token refreshed successfully!"
                )
            );
    } catch (error) {
        console.error("Token refresh error:", error);
        throw new ApiError(
            500,
            "Error refreshing access token. Please log in again."
        );
    }
});

// Update user password
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        throw new ApiError(400, "All fields are required");
    }
    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Incorrect current password");
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
    return res
        .status(200)
        .json(
            new Apiresponse(200, { user: req.user }, "passpwrd change  successfully!")
        );
});

// Get current user details
const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new Apiresponse(200, { user: req.user }, "User retrieved successfully!")
        );
});

// Update user account details
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { username, email, fullname } = req.body;
    if (!username && !email && !fullname) {
        throw new ApiError(
            400,
            "Add at least one update detail (username, email, or full name)."
        );
    }
    const updateUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                username,
                email,
            },
        },
        { new: true }
    ).select("-password -refreshToken");
    if (!updateUser) {
        throw new ApiError(404, "User not found.");
    }
    return res.json(
        new Apiresponse(200, updateUser, "User details updated successfully!")
    );
});

// Update user profile picture
const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarPath = req.file?.path;
    if (!avatarPath) {
        throw new ApiError(400, "Please provide an avatar image.");
    }
    const avatar = await uploadCloudinary(avatarPath);
    if (!avatar.url) {
        throw new ApiError(500, "Failed to upload user avatar. Please try again.");
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { avatar: avatar.url } },
        { new: true }
    ).select("-password -refreshToken");
    return res.json(
        new Apiresponse(200, user, "User avatar updated successfully!")
    );
});

// Update user cover picture
const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImagePath = req.file?.path;
    if (!coverImagePath) {
        throw new ApiError(400, "Please provide an cover image.");
    }
    const coverImage = await uploadCloudinary(coverImagePath);
    if (!coverImage.url) {
        throw new ApiError(
            500,
            "Failed to upload user cover image. Please try again."
        );
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { coverImage: coverImage.url } },
        { new: true }
    ).select("-password -refreshToken");
    return res.json(
        new Apiresponse(200, user, "User cover image updated successfully!")
    );
});

// Delete user account
const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        return res.status(404).json(new Apiresponse(404, null, "User not found"));
    }
    await deleteCloudinaryUserFiles(user._id);
    await User.findByIdAndDelete(user._id);
    return res.json(
        new Apiresponse(200, user.username, "User deleted successfully!")
    );
});

//only for cleanup db of user and cloudinary - admin things
const deleteAllUser = asyncHandler(async (req, res) => {
    // Delete cloudinary user files
    await deleteAllCloudinaryUserFiles();

    // Delete all users from the database
    await User.deleteMany({});
    return res.json(
        new Apiresponse(200, null, "All users deleted successfully!")
    );
});

// get user Profile 
const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;
    if (!username?.trim()) throw new ApiError(404, "Profile link is invalid!");

    const channel = await User.aggregate([
        // simple fn like find in mongodb
        {
            $match: { username: username.trim() }
        },
        // find subscriber and join them
        {
            $lookup: {
                from: 'subscriptions',
                localField: '_id',
                foreignField: 'channel',
                as: 'subscribers'
            }
        },
        // find subscriber and join them
        {
            $lookup: {
                from: 'subscriptions',
                localField: '_id',
                foreignField: 'subscriber',
                as: 'subscribedTo'
            }
        },
        // Count Subscribers & Check Subscription Status
        {
            $addFields: {
                subscribersCount: { $size: { $setUnion: ["$subscribers._id"] } }, // Remove duplicates
                subscribedToCount: { $size: { $setUnion: ["$subscribedTo._id"] } }, // Remove duplicates
                isSubscribed: {
                    $in: [
                        req.user?._id,
                        { $map: { input: "$subscribedTo", as: "s", in: "$$s.subscriber" } }
                    ]
                }
            }
        },
        // Select only required fields
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                subscribedToCount: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                isSubscribed: 1,
                createdAt: 1,
                updatedAt: 1
            }
        }
    ]);
    
    if (!channel.length) throw new ApiError(404, "Channel not found!");


    return res.status(200).json(
        new Apiresponse(200, channel[0], "User profile retrieved successfully!")
    );
});


// get user watchHistory
const getUserWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(req.user?._id) }
        },
        {
            $lookup: {
                from: 'videos',
                localField: 'watchHistory',
                foreignField: '_ids',
                as: 'watchHistory',
                pipeline: [{
                    $lookup: {
                        from: 'users',
                        localField: 'owner',
                        foreignField: '_id',
                        as: 'owner',
                        pipeline: [{
                            $project: {
                                fullname: 1,
                                username: 1,
                                avatar: 1,
                                createdAt: 1
                            }
                        }]
                    }
                },
                {
                    $addFields: {}
                }]
            }
        },
        {
            $addFields: {
                owner: {
                    $arrayElemAt: ["$owner", 0]  // Fix: Use $arrayElemAt instead of $First
                }
            }
        }])
    if (!user.length) throw new ApiError(404, "User not found!");
    return res.status(200).json(
        new Apiresponse(200, user[0].watchHistory, "User watch history retrieved successfully!")
    );
});


export {
    registerUser,
    loginUser,
    logoutUser,
    accessRefreshToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    deleteUser,
    deleteAllUser,
    getUserChannelProfile,
    getUserWatchHistory,

};