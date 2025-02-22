
import { ApiError } from "../utils/ApiError.js"
import { Apiresponse } from "../utils/Api.response.js"
import asyncHandler from "../utils/asyncHandler.js"


const healthcheck = asyncHandler(async (req, res) => {
    //TODO: build a healthcheck response that simply returns the OK status as json with a message
    try {
        res.status(200).json(new Apiresponse(200, "Server is running", "Health check successful"))

    } catch (error) {
        console.error("error", error)
        throw new ApiError(500, "An error occurred while performing the health check")
    }
})

export {
    healthcheck
}

