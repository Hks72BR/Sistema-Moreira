import imageCompression from 'browser-image-compression';

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.08,
  maxWidthOrHeight: 1280,
  useWebWorker: import.meta.env.MODE !== 'offline',
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
  // Remover prefixo data:image/jpeg;base64, se existir
  const base64Data = base64String.includes('base64,')
    ? base64String.split('base64,')[1]
    : base64String;

  // Converter base64 para Blob
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/jpeg' });

  const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
  return compressPhoto(file);
}
