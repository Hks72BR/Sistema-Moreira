import imageCompression from 'browser-image-compression';

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.08,
  maxWidthOrHeight: 1280,
  useWebWorker: true,
  fileType: 'image/jpeg',
  initialQuality: 0.6,
};

export async function compressPhoto(file) {
  if (!file) throw new Error('Nenhum arquivo fornecido');

  // Se já for menor que 80KB, retornar como está
  if (file.size <= 80 * 1024) return file;

  const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
  return compressed;
}

export async function compressBase64Photo(base64String) {
  // Converter base64 para File
  const res = await fetch(base64String);
  const blob = await res.blob();
  const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
  return compressPhoto(file);
}
