// backend/config/cloudinary.js
"use strict";

const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// -------------- ENV VALIDATION --------------
const missingVars = [];

if (!process.env.CLOUDINARY_CLOUD_NAME) missingVars.push("CLOUDINARY_CLOUD_NAME");
if (!process.env.CLOUDINARY_API_KEY) missingVars.push("CLOUDINARY_API_KEY");
if (!process.env.CLOUDINARY_API_SECRET) missingVars.push("CLOUDINARY_API_SECRET");

if (missingVars.length > 0) {
    throw new Error(
        `❌ Missing Cloudinary ENV variables: ${missingVars.join(", ")}`
    );
}

// -------------- CLOUDINARY CONFIG --------------
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// -------------- MULTER STORAGE CONFIG --------------
const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        return {
            folder: "world-studio",
            resource_type: "auto",
            allowed_formats: ["jpg", "jpeg", "png", "webp", "mp4", "mp3"],
            public_id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
        };
    },
});

// -------------- MULTER UPLOADER --------------
const upload = multer({
    storage,
    limits: {
        fileSize: 200 * 1024 * 1024, // 200MB limit
    },
});

// -------------- EXPORTS --------------
module.exports = {
    cloudinary,
    upload,
    storage,
};
