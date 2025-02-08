import jwt from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";

export const verifyJwt = asyncHandler(async (req, _, next) => {
    try {
        const token = req.cookies?.accessToken
        if (!token) {
            throw new ApiError(401, "Authentication token is missing");
        }

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decoded?._id).select("-password -refreshToken");
        if (!user) {
            throw new ApiError(401, "Not authenticated: Invalid access token.");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error.message || "Not authenticated")
    }
});
