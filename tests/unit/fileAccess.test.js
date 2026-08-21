import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  canUseFileSystemAccess,
  verifyWritePermission,
  openJsonFileWithPicker,
  saveJsonToFileHandle,
  saveJsonWithPicker,
  JSON_FILE_PICKER_TYPES
} from '../../src/fileAccess.js';

describe('fileAccess adapter', () => {
  describe('canUseFileSystemAccess', () => {
    it('returns true when secureContext and picker functions exist', () => {
      const mockWin = {
        isSecureContext: true,
        showOpenFilePicker: vi.fn(),
        showSaveFilePicker: vi.fn()
      };
      expect(canUseFileSystemAccess(mockWin)).toBe(true);
    });

    it('returns false when not in secure context', () => {
      const mockWin = {
        isSecureContext: false,
        showOpenFilePicker: vi.fn(),
        showSaveFilePicker: vi.fn()
      };
      expect(canUseFileSystemAccess(mockWin)).toBe(false);
    });

    it('returns false when pickers are missing', () => {
      const mockWin = {
        isSecureContext: true
      };
      expect(canUseFileSystemAccess(mockWin)).toBe(false);
    });
  });

  describe('verifyWritePermission', () => {
    it('returns true if permission is already granted', async () => {
      const handle = {
        queryPermission: vi.fn().mockResolvedValue('granted')
      };
      const result = await verifyWritePermission(handle);
      expect(result).toBe(true);
      expect(handle.queryPermission).toHaveBeenCalledWith({ mode: 'readwrite' });
    });

    it('requests permission if prompt is returned and request is true', async () => {
      const handle = {
        queryPermission: vi.fn().mockResolvedValue('prompt'),
        requestPermission: vi.fn().mockResolvedValue('granted')
      };
      const result = await verifyWritePermission(handle, true);
      expect(result).toBe(true);
      expect(handle.requestPermission).toHaveBeenCalledWith({ mode: 'readwrite' });
    });

    it('returns false if permission is denied', async () => {
      const handle = {
        queryPermission: vi.fn().mockResolvedValue('prompt'),
        requestPermission: vi.fn().mockResolvedValue('denied')
      };
      const result = await verifyWritePermission(handle, true);
      expect(result).toBe(false);
    });
  });

  describe('openJsonFileWithPicker', () => {
    it('throws error if file system access is unavailable', async () => {
      const mockWin = { isSecureContext: false };
      await expect(openJsonFileWithPicker(mockWin)).rejects.toThrow('File System Access API não está disponível');
    });

    it('reads and returns file data from handle', async () => {
      const fakeFile = {
        name: 'custom_menu.json',
        text: vi.fn().mockResolvedValue('[{"titulo":"Teste"}]')
      };
      const fakeHandle = {
        name: 'custom_menu.json',
        getFile: vi.fn().mockResolvedValue(fakeFile)
      };
      const mockWin = {
        isSecureContext: true,
        showOpenFilePicker: vi.fn().mockResolvedValue([fakeHandle]),
        showSaveFilePicker: vi.fn()
      };

      const result = await openJsonFileWithPicker(mockWin);
      expect(result).toEqual({
        handle: fakeHandle,
        filename: 'custom_menu.json',
        content: '[{"titulo":"Teste"}]'
      });
      expect(mockWin.showOpenFilePicker).toHaveBeenCalledWith({
        multiple: false,
        types: JSON_FILE_PICKER_TYPES,
        excludeAcceptAllOption: false
      });
    });

    it('returns null on AbortError (user cancellation)', async () => {
      const abortError = new Error('The user aborted a request.');
      abortError.name = 'AbortError';

      const mockWin = {
        isSecureContext: true,
        showOpenFilePicker: vi.fn().mockRejectedValue(abortError),
        showSaveFilePicker: vi.fn()
      };

      const result = await openJsonFileWithPicker(mockWin);
      expect(result).toBeNull();
    });
  });

  describe('saveJsonToFileHandle', () => {
    it('writes content to stream and closes it', async () => {
      const mockWritable = {
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined)
      };
      const handle = {
        queryPermission: vi.fn().mockResolvedValue('granted'),
        createWritable: vi.fn().mockResolvedValue(mockWritable)
      };

      await saveJsonToFileHandle(handle, '{"foo":"bar"}');
      expect(handle.createWritable).toHaveBeenCalled();
      expect(mockWritable.write).toHaveBeenCalledWith('{"foo":"bar"}');
      expect(mockWritable.close).toHaveBeenCalled();
    });

    it('throws error if handle lacks write permissions', async () => {
      const handle = {
        queryPermission: vi.fn().mockResolvedValue('denied'),
        requestPermission: vi.fn().mockResolvedValue('denied'),
        createWritable: vi.fn()
      };

      await expect(saveJsonToFileHandle(handle, '{}')).rejects.toThrow('Permissão de gravação no arquivo não concedida');
    });
  });

  describe('saveJsonWithPicker', () => {
    it('prompts save picker, writes content, and returns handle', async () => {
      const mockWritable = {
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined)
      };
      const fakeHandle = {
        name: 'novo_menu.json',
        queryPermission: vi.fn().mockResolvedValue('granted'),
        createWritable: vi.fn().mockResolvedValue(mockWritable)
      };
      const mockWin = {
        isSecureContext: true,
        showOpenFilePicker: vi.fn(),
        showSaveFilePicker: vi.fn().mockResolvedValue(fakeHandle)
      };

      const result = await saveJsonWithPicker('novo_menu.json', '{"test":123}', mockWin);
      expect(result).toEqual({
        handle: fakeHandle,
        filename: 'novo_menu.json'
      });
      expect(mockWritable.write).toHaveBeenCalledWith('{"test":123}');
      expect(mockWritable.close).toHaveBeenCalled();
    });

    it('returns null on AbortError during save as', async () => {
      const abortError = new Error('The user aborted a request.');
      abortError.name = 'AbortError';

      const mockWin = {
        isSecureContext: true,
        showOpenFilePicker: vi.fn(),
        showSaveFilePicker: vi.fn().mockRejectedValue(abortError)
      };

      const result = await saveJsonWithPicker('menu.json', '{}', mockWin);
      expect(result).toBeNull();
    });
  });
});
