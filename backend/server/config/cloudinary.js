const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        let folder = 'world-studio/other';
        let resourceType = 'auto';

        if (file.mimetype.startsWith('image/')) {
            folder = 'world-studio/images';
            resourceType = 'image';
        } else if (file.mimetype.startsWith('video/')) {
            folder = 'world-studio/videos';
            resourceType = 'video';
        } else if (file.mimetype.startsWith('audio/')) {
            folder = 'world-studio/audio';
            resourceType = 'video';
        }

        return {
            folder: folder,
            resource_type: resourceType,
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi', 'mp3', 'wav'],
            transformation: file.mimetype.startsWith('image/') ? [
                { width: 1920, height: 1080, crop: 'limit' }
            ] : undefined
        };
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') ||
            file.mimetype.startsWith('video/') ||
            file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'), false);
        }
    }
});

module.exports = { cloudinary, upload };