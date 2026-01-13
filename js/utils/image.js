/**
 * Image processing utilities
 */

/**
 * Compresses an image file to reduce size
 * @param {File} file - The image file to compress
 * @param {number} maxSize - Maximum dimension (default: 1536px)
 * @param {number} quality - JPEG quality (default: 0.85)
 * @returns {Promise<{base64: string, mimeType: string, preview: string}>}
 */
export function compressImage(file, maxSize = 1536, quality = 0.85) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                let w = img.width, h = img.height, max = maxSize;

                // If image is small enough and not too large, skip compression
                if (file.size < 1024 * 1024 && w < max && h < max) {
                    resolve({
                        base64: e.target.result.split(',')[1],
                        mimeType: file.type,
                        preview: e.target.result
                    });
                    return;
                }

                // Scale down if needed
                if (w > h) {
                    if (w > max) { h *= max / w; w = max; }
                } else {
                    if (h > max) { w *= max / h; h = max; }
                }

                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                const dataUrl = canvas.toDataURL('image/jpeg', quality);

                resolve({
                    base64: dataUrl.split(',')[1],
                    mimeType: 'image/jpeg',
                    preview: dataUrl
                });
            };
        };
    });
}

/**
 * Converts base64 data to a Blob URL
 * @param {string} base64Data - Base64 data (with or without data URI prefix)
 * @returns {string} Blob URL
 */
export function base64ToBlobUrl(base64Data) {
    try {
        const arr = base64Data.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        return URL.createObjectURL(blob);
    } catch (e) {
        console.error('[ImageUtils] base64ToBlobUrl error:', e);
        return '';
    }
}

/**
 * Downloads an image from base64 data
 * @param {string} base64Data - Base64 data URI
 * @param {string} filename - Filename for download (default: 'image.jpg')
 */
export function downloadImage(base64Data, filename = 'image.jpg') {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isLocalFile = window.location.protocol === 'file:';

    if (isIOS || isSafari || isLocalFile) {
        // For iOS/Safari or local files, open in new window
        const newWindow = window.open();
        if (newWindow) {
            newWindow.document.write(`<img src="${base64Data}" style="max-width:100%">`);
        }
    } else {
        // For other browsers, trigger download
        const link = document.createElement('a');
        link.href = base64Data;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

/**
 * Converts base64 string to ensure it has data URI prefix
 * @param {string} base64 - Base64 string
 * @param {string} mimeType - MIME type (default: 'image/jpeg')
 * @returns {string} Base64 with data URI prefix
 */
export function ensureDataUri(base64, mimeType = 'image/jpeg') {
    if (base64.startsWith('data:')) {
        return base64;
    }
    return `data:${mimeType};base64,${base64}`;
}

/**
 * Strips data URI prefix from base64 string
 * @param {string} dataUri - Data URI string
 * @returns {string} Raw base64 string
 */
export function stripDataUri(dataUri) {
    if (!dataUri.startsWith('data:')) {
        return dataUri;
    }
    return dataUri.split(',')[1];
}
