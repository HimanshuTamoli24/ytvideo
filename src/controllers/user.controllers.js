import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import uploadCloudinary from "../utils/cloudinary.js";
import { Apiresponse } from "../utils/Api.response.js";

const registerUser = asyncHandler(async (req, res) => {
    // Extract data from request
    const { username, fullname, email, password } = req.body;

    // Validate required fields
    if (!username || !email || !password || !fullname) {
        throw new ApiError(400, "All fields are required");
    }

    // Check if the user already exists
    const existingUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existingUser) {
        throw new ApiError(400, "User already exists");
    }
    // Validate uploaded files
    const avatarPath = req.files?.avatar?.[0]?.path;
    const coverImagePath = req.files?.coverImage?.[0]?.path;
    if (!avatarPath || !coverImagePath) {
        throw new ApiError(400, "Avatar and cover image are required");
    }
    // Upload files to Cloudinary
    const avatar = await uploadCloudinary(avatarPath);
    const coverImage = await uploadCloudinary(coverImagePath);

    // Validate Cloudinary uploads
    if (!avatar) {
        throw new ApiError(500, "Failed to upload files to Cloudinary");
    }

    // Create user in the database
    const user = await User.create({
        username: username.toLowerCase(),
        fullname,
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage.url || "",
    });

    // Remove sensitive fields before returning user data
    const alreadyUser = await User.findById(user.id).select("-password -generateRefreshToken");
    if (!alreadyUser) {
        throw new ApiError(500, "Error creating user");
    }
    // Return success response
    return res.status(201).json(new Apiresponse(201, alreadyUser, "User created successfully"));
});

export default registerUser;