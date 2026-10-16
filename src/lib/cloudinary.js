// Cloudinary helpers: unsigned uploads from the admin panel, and on-the-fly
// image optimisation (auto format/quality, right-sized) for fast loads on mobile data.

let runtime = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '',
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '',
};

/** Settings saved in Admin → Settings override build-time env values. */
export const configureCloudinary = (cfg = {}) => {
  if (cfg.cloudName) runtime.cloudName = cfg.cloudName.trim();
  if (cfg.uploadPreset) runtime.uploadPreset = cfg.uploadPreset.trim();
};

export const cloudinaryReady = () => Boolean(runtime.cloudName && runtime.uploadPreset);

/**
 * Upload a file with progress. Returns { url, publicId, width, height }.
 */
export const uploadImage = (file, { folder = 'gadgets-hub', onProgress } = {}) =>
  new Promise((resolve, reject) => {
    if (!cloudinaryReady()) {
      reject(new Error('Cloudinary is not configured. Add your cloud name and unsigned upload preset in Admin → Settings → Integrations.'));
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', runtime.uploadPreset);
    fd.append('folder', folder);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${runtime.cloudName}/image/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ url: res.secure_url, publicId: res.public_id, width: res.width, height: res.height });
        } else reject(new Error(res?.error?.message || 'Upload failed'));
      } catch (err) {
        reject(err);
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload. Check your connection and try again.'));
    xhr.send(fd);
  });

/**
 * Return an optimised URL. Works with Cloudinary URLs (inserts transformations),
 * Unsplash URLs (uses their params) and passes anything else through.
 */
export const img = (url, { w, h, crop = 'fill', q = 'auto' } = {}) => {
  if (!url) return '';
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    const t = ['f_auto', `q_${q}`, 'dpr_auto'];
    if (w) t.push(`w_${w}`);
    if (h) t.push(`h_${h}`, `c_${crop}`);
    else if (w) t.push('c_limit');
    return url.replace('/upload/', `/upload/${t.join(',')}/`);
  }
  if (url.includes('images.unsplash.com')) {
    const u = new URL(url);
    u.searchParams.set('auto', 'format');
    u.searchParams.set('q', '70');
    if (w) u.searchParams.set('w', String(w));
    if (h) { u.searchParams.set('h', String(h)); u.searchParams.set('fit', 'crop'); }
    return u.toString();
  }
  return url;
};
