import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import uploadCloudinary from "../utils/cloudinary.js";
import { Apiresponse } from "../utils/Api.response.js";

// genrate access tokens
const genrateAccessAndRefreshToken = async (userid) => {
    try {
        const user = await User.findById(userid)
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        // Generate access and refresh tokens
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();
        // Save tokens in database
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false })
        return new Apiresponse(200, "suceessfully set tokens", { accessToken, refreshToken });

    } catch (error) {
        console.error("Failed to generate access and refresh tokens", error);
        throw new ApiError(500, "Failed to generate access and refresh tokens");

    }
}
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
const loginUser = asyncHandler(async (req, res) => {
    // Implement login logic here
    const { password, email, username } = req.body
    // Validate required fields
    if (!username || !email || !password) throw new ApiError(500, "All fields are required");
    // Check if the user exists
    const existUser = await User.findOne({ $or: [{ username }, { email }] });
    if (!existUser) throw new ApiError(401, "no user find with this credentials");

    // Validate password
    const isPasswordCorrect = await existUser.isPasswordCorrect(password);
    if (!isPasswordCorrect) throw new ApiError(401, "Invalid credentials");
    // Return success response with JWT token
    const { accessToken, refreshToken } = await genrateAccessAndRefreshToken(existUser._id)
    //logger user info 
    const loggedUser = await User.findById(existUser._id).select("-password -refreshToken")
    if (!loggedUser) throw new ApiError(500, "Failed to find user info");
    //cookies
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
        .cookie("AccessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new Apiresponse(200, loggedUser, "User logged in successfully"));
})
const logoutUser = asyncHandler(async (req, res) => {
    // Implement logout logic here
    await User.findByIdAndUpdate(req.user._id, {
        $set: { refreshToken: undefined }
    }, {
        new: true,
        runValidators: true
    })
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new Apiresponse(200, null, "User logged out successfully"));
})

export {
    registerUser, existUser,
    loginUser, logoutUser,
}