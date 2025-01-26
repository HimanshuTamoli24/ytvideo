import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'

// Set up cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload video to cloudinary
const uploadCloudnary = async (localfilepath) => {
    try {
        if (!localfilepath) return null
        // upload file on cloudinary
        const file = await cloudinary.uploader.upload(localfilepath, {
            resource_type: 'auto',
        })
        // file has been uploaded succesfuly
        console.log("file uploaded successfully", file.url);
        return file
    } catch (error) {
        fs.promises.unlink(localfilepath)//remove temporary file
        console.error("Error uploading to cloudinary", error)
        return null
    }
}


export {
    uploadCloudnary,
}