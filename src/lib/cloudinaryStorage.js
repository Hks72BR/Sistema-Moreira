import { compressPhoto, compressBase64Photo } from './photoCompression';

const CLOUDINARY_AVAILABLE = !!import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY;

/**
 * Upload de foto para Cloudinary
 * @param {File} file - Arquivo da foto
 * @param {String} companyId - ID da empresa
 * @param {String} orderId - ID da ordem de serviço
 * @param {String} filename - Nome do arquivo (opcional)
 * @returns {Promise<{storagePath, downloadUrl, filename}>}
 */
export async function uploadPhotoFile(companyId, orderId, file, filename) {
  if (!CLOUDINARY_AVAILABLE) {
    console.warn('Cloudinary não está ativado. Fotos não serão enviadas.');
    return {
      storagePath: '',
      downloadUrl: '',
      filename: filename || `os-${orderId}-${Date.now()}.jpg`
    };
  }

  try {
    const compressed = await compressPhoto(file);
    const ts = Date.now();
    const name = filename || `os-${orderId}-${ts}.jpg`;

    // Preparar FormData para upload
    const formData = new FormData();
    formData.append('file', compressed);
    formData.append('public_id', `moreira-direcoes/${companyId}/${name}`);
    formData.append('folder', `moreira-direcoes/${companyId}/photos`);
    formData.append('resource_type', 'auto');
    formData.append('api_key', API_KEY);

    // Upload para Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );

    if (!response.ok) {
      throw new Error(`Cloudinary upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    const storagePath = data.public_id;
    const downloadUrl = data.secure_url;

    return { storagePath, downloadUrl, filename: name };
  } catch (error) {
    console.error('Erro ao fazer upload da foto:', error);
    throw error;
  }
}

/**
 * Upload de foto em base64 para Cloudinary
 * @param {String} base64String - String base64 da foto
 * @param {String} companyId - ID da empresa
 * @param {String} orderId - ID da ordem de serviço
 * @returns {Promise<{storagePath, downloadUrl, filename}>}
 */
export async function uploadPhotoBase64(companyId, orderId, base64String) {
  if (!CLOUDINARY_AVAILABLE) {
    console.warn('Cloudinary não está ativado. Fotos não serão enviadas.');
    return {
      storagePath: '',
      downloadUrl: '',
      filename: `os-${orderId}-${Date.now()}.jpg`
    };
  }

  try {
    const ts = Date.now();
    const name = `os-${orderId}-${ts}.jpg`;

    // Preparar FormData para upload
    const formData = new FormData();
    formData.append('file', base64String);
    formData.append('public_id', `moreira-direcoes/${companyId}/${name}`);
    formData.append('folder', `moreira-direcoes/${companyId}/photos`);
    formData.append('resource_type', 'auto');
    formData.append('api_key', API_KEY);

    // Upload para Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );

    if (!response.ok) {
      throw new Error(`Cloudinary upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    const storagePath = data.public_id;
    const downloadUrl = data.secure_url;

    return { storagePath, downloadUrl, filename: name };
  } catch (error) {
    console.error('Erro ao fazer upload da foto base64:', error);
    throw error;
  }
}

/**
 * Deletar foto do Cloudinary
 * @param {String} storagePath - public_id da foto no Cloudinary
 */
export async function deletePhotoFromStorage(storagePath) {
  if (!CLOUDINARY_AVAILABLE || !storagePath) return;

  // Nota: Cloudinary requer API Secret para deletar via API
  // Para V1, vamos apenas logar e não deletar (opção segura)
  console.log('Deleção de fotos no Cloudinary requer API Secret');
  // TODO: Implementar deleção via backend quando houver Cloud Function
}

/**
 * Obter URL da foto do Cloudinary
 * @param {String} storagePath - public_id da foto
 * @returns {Promise<String>} URL pública da foto
 */
export async function getPhotoURL(storagePath) {
  if (!CLOUDINARY_AVAILABLE || !storagePath) return '';

  // Cloudinary retorna URL segura no upload
  // Se precisar regenerar, usar: https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_1280,q_auto/${storagePath}`;
}
