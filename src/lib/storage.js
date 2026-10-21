import * as cloudinaryStorage from './cloudinaryStorage';
import { compressPhoto, compressBase64Photo } from './photoCompression';

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Não foi possível ler a foto local.'));
    };
    reader.onerror = () => reject(reader.error || new Error('Não foi possível ler a foto local.'));
    reader.readAsDataURL(file);
  });
}

async function uploadLocalPhoto(orderId, file, filename, alreadyCompressed = false) {
  const compressed = alreadyCompressed ? file : await compressPhoto(file);
  const name = filename || `os-${orderId}-${Date.now()}.jpg`;
  return {
    storagePath: `local/${orderId}/${name}`,
    downloadUrl: await toDataUrl(compressed),
    filename: name,
  };
}

/**
 * Upload de foto para armazenamento local no desenvolvimento e Cloudinary em produção.
 */
export async function uploadPhotoFile(companyId, orderId, file, filename) {
  if (import.meta.env.DEV || import.meta.env.MODE === 'offline') {
    return uploadLocalPhoto(orderId, file, filename);
  }
  return await cloudinaryStorage.uploadPhotoFile(companyId, orderId, file, filename);
}

/**
 * Upload de foto base64 para armazenamento local no desenvolvimento e Cloudinary em produção.
 */
export async function uploadPhotoBase64(companyId, orderId, base64String) {
  if (import.meta.env.DEV || import.meta.env.MODE === 'offline') {
    const compressed = await compressBase64Photo(base64String);
    return uploadLocalPhoto(orderId, compressed, `os-${orderId}-${Date.now()}.jpg`, true);
  }
  return await cloudinaryStorage.uploadPhotoBase64(companyId, orderId, base64String);
}
