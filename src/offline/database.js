const DATABASE_NAME = 'moreira-offline-demo-v1';
let connection;

export function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function openDatabase() {
  if (!connection) {
    connection = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('documents', { keyPath: 'path' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Feche as outras janelas da demonstracao para abrir o banco local.'));
    });
  }
  return connection;
}

export async function withStore(mode, callback) {
  const database = await openDatabase();
  const transaction = database.transaction('documents', mode);
  const completed = new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onabort = () => reject(transaction.error || new Error('Operacao local cancelada.'));
    transaction.onerror = () => reject(transaction.error);
  });
  try {
    const result = await callback(transaction.objectStore('documents'));
    await completed;
    return result;
  } catch (error) {
    try {
      transaction.abort();
    } catch (abortError) {
      if (abortError.name !== 'InvalidStateError') console.error('Falha ao cancelar transacao local:', abortError);
    }
    await completed.catch(() => {});
    throw error;
  }
}
