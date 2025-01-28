import jwt from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/user.model.js";

export const verifyJwt = asyncHandler(async (err, req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("bearer ", "")
        if (!token) {
            throw new Error("Not authenticated")
        }
        // Verify JWT
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(decoded?._id).select("-password -refreshToken")
        if (!user) {
            // will discuss
            throw new Error("Not authenticated,invaild AceessToken")
        }
        req.user = user
        next()
    } catch (error) {
        console.error(error)
        res.status(401).json({ message: "Not authenticated" })

    }
})