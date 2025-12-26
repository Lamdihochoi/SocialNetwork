// multer is a middleware for handling multipart/form-data, which is primarily used for file uploads

import multer from "multer";

const storage = multer.memoryStorage();

// File filter for posts (images only)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

// File filter for messages (images, PDFs, Word docs)
const messageFileFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/", // All image types
    "application/pdf", // PDF
    "application/msword", // .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  ];

  const isAllowed = allowedMimes.some((mime) =>
    file.mimetype.startsWith(mime) || file.mimetype === mime
  );

  if (isAllowed) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only image, PDF, and Word documents are allowed for messages"
      ),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Upload middleware for messages (supports more file types, larger size)
export const uploadMessage = multer({
  storage: storage,
  fileFilter: messageFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for messages
});

// Upload middleware for profile updates (profile picture + banner image)
export const uploadProfile = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
}).fields([
  { name: "profilePicture", maxCount: 1 },
  { name: "bannerImage", maxCount: 1 },
]);

export default upload;