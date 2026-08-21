/**
 * File System Access API Adapter for Chromium / Edge browsers.
 * Provides direct file opening and saving capabilities with progressive fallback support.
 */

/**
 * Checks whether the current runtime environment supports direct File System Access.
 * Requires a secure context (HTTPS / localhost) and native picker APIs.
 *
 * @param {Window} [win=window]
 * @returns {boolean}
 */
export function canUseFileSystemAccess(win = window) {
  return Boolean(
    win &&
    win.isSecureContext &&
    typeof win.showOpenFilePicker === 'function' &&
    typeof win.showSaveFilePicker === 'function'
  );
}

/**
 * Common JSON file picker type configuration.
 */
export const JSON_FILE_PICKER_TYPES = [
  {
    description: 'Arquivo JSON de Menu (*.json)',
    accept: {
      'application/json': ['.json']
    }
  }
];

/**
 * Verifies or requests write permissions for a given FileSystemFileHandle.
 *
 * @param {FileSystemFileHandle} handle
 * @param {boolean} [request=true]
 * @returns {Promise<boolean>}
 */
export async function verifyWritePermission(handle, request = true) {
  if (!handle || typeof handle.queryPermission !== 'function') {
    return false;
  }

  const descriptor = { mode: 'readwrite' };
  try {
    const currentPermission = await handle.queryPermission(descriptor);
    if (currentPermission === 'granted') {
      return true;
    }

    if (!request || typeof handle.requestPermission !== 'function') {
      return false;
    }

    const requestedPermission = await handle.requestPermission(descriptor);
    return requestedPermission === 'granted';
  } catch (error) {
    console.warn('Falha ao verificar permissão de escrita:', error);
    return false;
  }
}

/**
 * Opens a JSON file via showOpenFilePicker.
 *
 * @param {Window} [win=window]
 * @returns {Promise<{ handle: FileSystemFileHandle, filename: string, content: string } | null>}
 */
export async function openJsonFileWithPicker(win = window) {
  if (!canUseFileSystemAccess(win)) {
    throw new Error('File System Access API não está disponível neste navegador ou contexto.');
  }

  try {
    const [handle] = await win.showOpenFilePicker({
      multiple: false,
      types: JSON_FILE_PICKER_TYPES,
      excludeAcceptAllOption: false
    });

    if (!handle) {
      return null;
    }

    const file = await handle.getFile();
    const content = await file.text();

    return {
      handle,
      filename: file.name || handle.name || 'menu.json',
      content
    };
  } catch (error) {
    if (error && error.name === 'AbortError') {
      return null;
    }
    throw error;
  }
}

/**
 * Saves JSON string content directly to an existing FileSystemFileHandle.
 *
 * @param {FileSystemFileHandle} handle
 * @param {string} jsonContent
 * @returns {Promise<void>}
 */
export async function saveJsonToFileHandle(handle, jsonContent) {
  if (!handle || typeof handle.createWritable !== 'function') {
    throw new Error('Handle de arquivo inválido ou não gravável.');
  }

  const hasPermission = await verifyWritePermission(handle, true);
  if (!hasPermission) {
    throw new Error('Permissão de gravação no arquivo não concedida.');
  }

  const writable = await handle.createWritable();
  try {
    await writable.write(jsonContent);
  } finally {
    await writable.close();
  }
}

/**
 * Prompts the user with showSaveFilePicker and writes JSON content to the selected file.
 *
 * @param {string} [suggestedName='menu.json']
 * @param {string} jsonContent
 * @param {Window} [win=window]
 * @returns {Promise<{ handle: FileSystemFileHandle, filename: string } | null>}
 */
export async function saveJsonWithPicker(suggestedName = 'menu.json', jsonContent, win = window) {
  if (!canUseFileSystemAccess(win)) {
    throw new Error('File System Access API não está disponível neste navegador ou contexto.');
  }

  try {
    const handle = await win.showSaveFilePicker({
      suggestedName: suggestedName || 'menu.json',
      types: JSON_FILE_PICKER_TYPES,
      excludeAcceptAllOption: false
    });

    if (!handle) {
      return null;
    }

    await saveJsonToFileHandle(handle, jsonContent);

    return {
      handle,
      filename: handle.name || suggestedName
    };
  } catch (error) {
    if (error && error.name === 'AbortError') {
      return null;
    }
    throw error;
  }
}
