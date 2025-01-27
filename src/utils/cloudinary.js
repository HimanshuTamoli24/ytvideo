import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'
import dotenv from 'dotenv'
import { ApiError } from './ApiError.js';

dotenv.config({
    path: '.env'
})
// Set up cloudinary
cloudinary.config({
    // cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Upload video to cloudinary
const uploadCloudinary = async (localfilepath) => {

    try {
        if (!localfilepath) throw new ApiError(404, "file not found")
        // upload file on cloudinary
        const file = await cloudinary.uploader.upload(localfilepath, {
            resource_type: "auto",
        })
        // file has been uploaded succesfuly
        console.log("file uploaded successfully", file.url);
        // remove temporary file
        fs.promises.unlink(localfilepath)
        return file
    }
    catch (error) {
        fs.promises.unlink(localfilepath)//remove temporary file
        console.error("Error uploading to cloudinary", error)
        return null
    }
}
export default uploadCloudinary

