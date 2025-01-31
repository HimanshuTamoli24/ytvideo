import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import dotenv from 'dotenv';
import { ApiError } from './ApiError.js';

dotenv.config({
    path: '.env'
});

// Set up cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload video to Cloudinary
const uploadCloudinary = async (localfilepath) => {
    try {
        if (!localfilepath) throw new ApiError(404, "File not found");

        // Upload file on Cloudinary
        const file = await cloudinary.uploader.upload(localfilepath, {
            resource_type: "auto",
            folder: "ytbackend"
        });

        // File uploaded successfully
        console.log("File uploaded successfully", file.url);

        // Remove temporary file
        try {
            await fs.promises.unlink(localfilepath);
        } catch (err) {
            console.error("Error removing temporary file:", err);
        }

        return file; // Full response including public ID
    } catch (error) {
        try {
            await fs.promises.unlink(localfilepath); // Remove temporary file on error
        } catch (err) {
            console.error("Error removing temporary file:", err);
        }
        console.error("Error uploading to Cloudinary:", error);
        return null;
    }
};
const deleteCloudinaryFile = async (filepath) => {
    try {
        // Delete file from Cloudinary
        await cloudinary.uploader.destroy(`ytbackend/${filepath}`)
        console.log("File deleted successfully", filepath);
    } catch (error) {
        console.error("Error deleting file from Cloudinary:", error);
        throw new ApiError(500, "An unexpected error occurred while deleting the file.");

    }
}
const deleteAllCloudinaryFiles = async (filepaths) => {
    try {
        // Delete all files from Cloudinary
        console.log("filepath", filepaths);
        const filedeleted = await cloudinary.api.delete_resources(filepaths);
        console.log("All files deleted successfully", filedeleted);
        // used for deleteing entire folder
        
        // const folderName = 'ytbackend'; // Replace with your folder name
        // cloudinary.api.delete_resources_by_prefix(folderName, function (error, result) {
        //     if (error) {
        //         console.error('Error deleting resources:', error);
        //     } else {
        //         console.log('All files deleted:', result);
        //     }
        // });
    } catch (error) {
        console.error("Error deleting all files from Cloudinary:", error);
        throw new ApiError(500, "An unexpected error occurred while deleting all files.");
    }
}




export { uploadCloudinary, deleteCloudinaryFile, deleteAllCloudinaryFiles };
