const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const createStorage = (folder) => {
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `emptytruck/${folder}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'webp'],
      resource_type: 'auto',
      transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }]
    }
  });
};

// For local storage (fallback when Cloudinary not configured)
const localStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP and PDF are allowed.'), false);
  }
};

const getStorage = (folder) => {
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
    return createStorage(folder);
  }
  return localStorage;
};

exports.uploadDocuments = multer({
  storage: getStorage('documents'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter
});

exports.uploadAvatar = multer({
  storage: getStorage('avatars'),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Images only'), false);
  }
});

exports.uploadChat = multer({
  storage: getStorage('chat'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter
});

exports.cloudinary = cloudinary;
