import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import uploadCloudinary from "../utils/cloudinary.js";
import { Apiresponse } from "../utils/Api.response.js";
import jwt from "jsonwebtoken";


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
            throw new ApiError(404, "User not found. Please check the provided user ID.");
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
        throw new ApiError(500, "An unexpected error occurred while generating authentication tokens.");
    }
};

// Register new user
const registerUser = asyncHandler(async (req, res) => {
    const { username, fullname, email, password } = req.body;

    if (!username || !email || !password || !fullname) {
        throw new ApiError(400, "All fields (username, fullname, email, password) are required.");
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });

    if (existingUser) {
        throw new ApiError(400, "A user with this email or username already exists. Please try logging in.");
    }

    // Validate uploaded files
    const avatarPath = req.files?.avatar?.[0]?.path;
    const coverImagePath = req.files?.coverImage?.[0]?.path;

    if (!avatarPath || !coverImagePath) {
        throw new ApiError(400, "Both avatar and cover image are required for registration.");
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

    const savedUser = await User.findById(user.id).select("-password -generateRefreshToken");
    if (!savedUser) {
        throw new ApiError(500, "User registration failed. Please try again.");
    }

    return res.status(201).json(new Apiresponse(201, savedUser, "User registered successfully!"));
});

// Login user
const loginUser = asyncHandler(async (req, res) => {
    const { password, email, username } = req.body;

    if (!username || !email || !password) {
        throw new ApiError(400, "Please provide all required fields (username, email, password).");
    }

    const existUser = await User.findOne({ $or: [{ username }, { email }] });

    if (!existUser) {
        throw new ApiError(401, "No user found with these credentials. Please check your details and try again.");
    }

    const isPasswordCorrect = await existUser.isPasswordCorrect(password);
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Incorrect password. Please try again.");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(existUser._id);

    const loggedUser = await User.findById(existUser._id).select("-password -refreshToken");
    if (!loggedUser) {
        throw new ApiError(500, "Error retrieving user information. Please try again.");
    }

    const options = {
        httpOnly: true,
        secure: true,
        maxAge: 3600000,
        SameSite: "None",
    };

    return res
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new Apiresponse(200, { user: loggedUser, refreshToken, accessToken }, "Login successful!"));
});

// Logout user
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id,
        { $unset: { refreshToken: "" } },
        { new: true, runValidators: true });



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
        const decodedToken = jwt.verify(incomingToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token. Please log in again.");
        }

        if (incomingToken !== user.refreshToken) {
            throw new ApiError(403, "Token mismatch detected. Please log in again.");
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

        return res
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(new Apiresponse(200, { user, refreshToken, accessToken }, "Access token refreshed successfully!"));
    } catch (error) {
        console.error("Token refresh error:", error);
        throw new ApiError(500, "Error refreshing access token. Please log in again.");
    }
});

export { registerUser, loginUser, logoutUser, accessRefreshToken };
