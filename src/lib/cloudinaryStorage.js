import { compressPhoto, compressBase64Photo } from "./photoCompression";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'fzqgvehn';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'moreira_direcoes';

/**
 * Upload de foto para Cloudinary
 * @param {File} file - Arquivo da foto
 * @param {String} companyId - ID da empresa
 * @param {String} orderId - ID da ordem de serviço
 * @param {String} filename - Nome do arquivo (opcional)
 * @returns {Promise<{storagePath, downloadUrl, filename, deleteToken}>}
 */
export async function uploadPhotoFile(companyId, orderId, file, filename) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary não está configurado para enviar fotos.");
  }

  try {
    const compressed = await compressPhoto(file);
    const ts = Date.now();
    const name = filename || `os-${orderId}-${ts}.jpg`;

    // Preparar FormData para upload
    const formData = new FormData();
    formData.append("file", compressed);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", `moreira-direcoes/photos`);
    formData.append("public_id", name.replace(/\.[^/.]+$/, ""));

    // Upload para Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData },
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Cloudinary error response:", errorData);
      throw new Error(`Cloudinary upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    const storagePath = data.public_id;
    const downloadUrl = data.secure_url;
    const deleteToken = data.delete_token || '';

    return { storagePath, downloadUrl, filename: name, deleteToken };
  } catch (error) {
    console.error("Erro ao fazer upload da foto:", error);
    throw error;
  }
}

/**
 * Upload de foto em base64 para Cloudinary
 * @param {String} base64String - String base64 da foto
 * @param {String} companyId - ID da empresa
 * @param {String} orderId - ID da ordem de serviço
 * @returns {Promise<{storagePath, downloadUrl, filename, deleteToken}>}
 */
export async function uploadPhotoBase64(companyId, orderId, base64String) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary não está configurado para enviar fotos.");
  }

  try {
    // Comprimir base64 (converte para File também)
    const compressedFile = await compressBase64Photo(base64String);
    const ts = Date.now();
    const name = `os-${orderId}-${ts}.jpg`;

    // Preparar FormData para upload
    const formData = new FormData();
    formData.append("file", compressedFile);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", `moreira-direcoes/photos`);
    formData.append("public_id", name.replace(/\.[^/.]+$/, ""));

    // Upload para Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData },
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Cloudinary error response:", errorData);
      throw new Error(`Cloudinary upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    const storagePath = data.public_id;
    const downloadUrl = data.secure_url;
    const deleteToken = data.delete_token || '';

    return { storagePath, downloadUrl, filename: name, deleteToken };
  } catch (error) {
    console.error("Erro ao fazer upload da foto base64:", error);
    throw error;
  }
}

/**
 * Excluir foto do Cloudinary caso possua delete_token
 */
export async function deleteCloudinaryPhoto(deleteToken) {
  if (!CLOUD_NAME || !deleteToken) return false;
  try {
    const formData = new FormData();
    formData.append("token", deleteToken);
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/delete_by_token`,
      { method: "POST", body: formData },
    );
    return response.ok;
  } catch (err) {
    console.warn("Aviso ao excluir foto no Cloudinary:", err);
    return false;
  }
}
