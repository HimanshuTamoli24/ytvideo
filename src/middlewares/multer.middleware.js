import multer from "multer";

// Multer middleware for handling video uploads
const storage = multer.diskStorage({
    // destination where files will be stored temporarily. 
    destination: function (req, file, cb) {
        cb(null, './public/temp/');
    },
    // file name format.
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
})
const upload = multer({ storage })

export {
    upload
}