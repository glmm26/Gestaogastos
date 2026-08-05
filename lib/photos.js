const fs = require('fs');
const path = require('path');
const { DIRETORIO_UPLOADS } = require('./config');

function ensureUploadsDir() {
  if (!fs.existsSync(DIRETORIO_UPLOADS)) {
    fs.mkdirSync(DIRETORIO_UPLOADS, { recursive: true });
  }
}

function buildPhotoUrl(photoPath, updatedAt) {
  if (!photoPath) return '/avatar-default.svg';
  const version = encodeURIComponent(updatedAt || Date.now());
  return `${photoPath}?v=${version}`;
}

function removeStoredPhoto(photoPath) {
  if (!photoPath || !photoPath.startsWith('/uploads/')) return;
  const targetPath = path.join(DIRETORIO_UPLOADS, path.basename(photoPath));
  if (targetPath.startsWith(DIRETORIO_UPLOADS) && fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
  }
}

module.exports = {
  ensureUploadsDir,
  buildPhotoUrl,
  removeStoredPhoto,
};
