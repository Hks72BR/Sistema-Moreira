import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';
import { compressPhoto, compressBase64Photo } from './photoCompression';
import * as cloudinaryStorage from './cloudinaryStorage';

const STORAGE_AVAILABLE = !!storage;
const USE_CLOUDINARY = !!import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

/**
 * Upload de foto com prioridade: Cloudinary > Firebase
 */
export async function uploadPhotoFile(companyId, orderId, file, filename) {
  // Tentar Cloudinary primeiro (V1 Testing)
  if (USE_CLOUDINARY) {
    try {
      return await cloudinaryStorage.uploadPhotoFile(companyId, orderId, file, filename);
    } catch (error) {
      console.error('Cloudinary upload falhou, tentando Firebase:', error);
    }
  }

  // Fallback: Firebase
  if (!STORAGE_AVAILABLE) {
    console.warn('Nenhum storage disponível (Cloudinary + Firebase desativados)');
    return { storagePath: '', downloadUrl: '', filename: filename || `os-${orderId}-${Date.now()}.jpg` };
  }

  const compressed = await compressPhoto(file);
  const ts = Date.now();
  const name = filename || `os-${orderId}-${ts}.jpg`;
  const storagePath = `companies/${companyId}/photos/${name}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, compressed, { contentType: 'image/jpeg' });
  const downloadUrl = await getDownloadURL(storageRef);

  return { storagePath, downloadUrl, filename: name };
}

/**
 * Upload de foto base64 com prioridade: Cloudinary > Firebase
 */
export async function uploadPhotoBase64(companyId, orderId, base64String) {
  // Tentar Cloudinary primeiro (V1 Testing)
  if (USE_CLOUDINARY) {
    try {
      return await cloudinaryStorage.uploadPhotoBase64(companyId, orderId, base64String);
    } catch (error) {
      console.error('Cloudinary upload falhou, tentando Firebase:', error);
    }
  }

  // Fallback: Firebase
  if (!STORAGE_AVAILABLE) {
    console.warn('Nenhum storage disponível (Cloudinary + Firebase desativados)');
    return { storagePath: '', downloadUrl: '', filename: `os-${orderId}-${Date.now()}.jpg` };
  }

  const compressed = await compressBase64Photo(base64String);
  const ts = Date.now();
  const name = `os-${orderId}-${ts}.jpg`;
  const storagePath = `companies/${companyId}/photos/${name}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, compressed, { contentType: 'image/jpeg' });
  const downloadUrl = await getDownloadURL(storageRef);

  return { storagePath, downloadUrl, filename: name };
}

/**
 * Deletar foto (Cloudinary + Firebase)
 */
export async function deletePhotoFromStorage(storagePath) {
  if (!storagePath) return;

  // Tentar Cloudinary
  if (USE_CLOUDINARY) {
    try {
      await cloudinaryStorage.deletePhotoFromStorage(storagePath);
      return;
    } catch (error) {
      console.error('Cloudinary delete falhou:', error);
    }
  }

  // Fallback: Firebase
  if (STORAGE_AVAILABLE) {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  }
}

/**
 * Obter URL da foto (Cloudinary + Firebase)
 */
export async function getPhotoURL(storagePath) {
  if (!storagePath) return '';

  // Tentar Cloudinary
  if (USE_CLOUDINARY) {
    try {
      return await cloudinaryStorage.getPhotoURL(storagePath);
    } catch (error) {
      console.error('Cloudinary URL falhou:', error);
    }
  }

  // Fallback: Firebase
  if (STORAGE_AVAILABLE) {
    const storageRef = ref(storage, storagePath);
    return getDownloadURL(storageRef);
  }

  return '';
}
