import { Html5Qrcode } from 'html5-qrcode';

// Retry at smaller resolutions for large screenshots and camera photos.
export const decodeQrImage = async (reader: Html5Qrcode, file: File) => {
  try {
    return await reader.scanFile(file, false);
  } catch {
    const bitmap = await createImageBitmap(file);
    try {
      for (const maxSize of [1600, 1000, 640]) {
        const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
        if (scale === 1) continue;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext('2d');
        if (!context) continue;
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) continue;
        try {
          return await reader.scanFile(new File([blob], 'qr.png', { type: 'image/png' }), false);
        } catch { /* Try the next resolution. */ }
      }
      throw new Error('No QR code found');
    } finally {
      bitmap.close();
    }
  }
};

