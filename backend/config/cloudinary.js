// backend/cloudinary.js
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
) {
    console.error("❌ Cloudinary environment variables are missing!");
    throw new Error("Cloudinary environment variables are missing!");
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        return {
            folder: "world-studio/uploads",
            resource_type: "auto",
            public_id: `${Date.now()}-${cleanName}`,
        };
    },
});

const upload = multer({ storage });

module.exports = { cloudinary, storage, upload };
