import { Injectable } from '@angular/core';
import { getDownloadURL, getStorage, ref, uploadBytes } from "@angular/fire/storage";
import { StorageReference } from "@firebase/storage"

@Injectable({
  providedIn: 'root'
})
export default class StorageService {

  private storage = getStorage();
  private arcUrlCache?: Promise<string>;

  constructor() {}

  async uploadFile(file: File, path: string, filename: string): Promise<StorageReference> {
    const fileExtension = file.name.split('.').pop() || '';
    const fullFilePath = `${path}/${filename.split('.')[0]}.${fileExtension}`;
    const storageRef = ref(this.storage, fullFilePath);
    const metadata = {
      contentType: file.type,
    };

    const result = await uploadBytes(storageRef, file, metadata)
    return result.ref

  }

  async uploadFileContentDisposition(file: File, path: string, filename: string): Promise<StorageReference> {
    const fileExtension = file.name.split('.').pop() || '';
    const fullFilePath = `${path}/${filename.split('.')[0]}.${fileExtension}`;
    const storageRef = ref(this.storage, fullFilePath);
    const metadata = {
      contentType: file.type,
      contentDisposition: 'attachment',
    };

    const result = await uploadBytes(storageRef, file, metadata)
    return result.ref

  }

  async uploadUrl(url: string, path: string, filename: string): Promise<StorageReference> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();

      if (!response.ok) {
        throw new Error(`Failed to fetch image. HTTP status: ${response.status}`);
      }

      const fileExtension = blob.type.split('/').pop() || '';
      const fullFilePath = `${path}/${filename}.${fileExtension}`;
      const storageRef = ref(this.storage, fullFilePath);

      const result = await uploadBytes(storageRef, blob, { contentType: blob.type });
      return result.ref

    } catch (error) {
      console.error('Error storing Google image in Firebase Storage:', error);
      throw error;
    }
  }

  getDownloadUrl(filePath: string): Promise<string> {
    const reference: StorageReference = ref(this.storage, filePath);
    return getDownloadURL(reference)
  }

  getArcUrl(): Promise<string> {
    if (!this.arcUrlCache) {
      this.arcUrlCache = this.getDownloadUrl('wrokspace_arc.png');
    }
    return this.arcUrlCache;
  }

}
