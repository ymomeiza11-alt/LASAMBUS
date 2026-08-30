const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');
const ALLOWED_MIME  = /^image\/(jpeg|png|gif|webp)$/;

// destDir: (req) => absolute directory the uploaded files should land in
function makeUploader(destDir) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = destDir(req);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, `${crypto.randomUUID()}-${file.originalname}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!ALLOWED_MIME.test(file.mimetype)) return cb(new Error('Only image files are allowed'));
      cb(null, true);
    },
  });
}

module.exports = { makeUploader, UPLOADS_ROOT };
