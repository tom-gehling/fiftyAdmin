import { Injectable } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL, listAll } from '@angular/fire/storage';

@Injectable({ providedIn: 'root' })
export class StorageService {
  constructor(private storage: Storage) {}

  async uploadQuizImage(file: File, quizId: string): Promise<string> {
    const filePath = `quiz-images/${quizId}/${Date.now()}_${file.name}`;
    const storageRef = ref(this.storage, filePath);

    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }

  async uploadVenueImage(file: File, venueId: string): Promise<string> {
    const filePath = `venue-images/${venueId}/${Date.now()}_${file.name}`;
    const storageRef = ref(this.storage, filePath);

    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }

  async getExistingImages(): Promise<string[]> {
    const baseRef = ref(this.storage, 'quiz-images');

    const result = await listAll(baseRef);

    const urls: string[] = [];
    for (const folder of result.prefixes) {
      const images = await listAll(folder);
      for (const item of images.items) {
        urls.push(await getDownloadURL(item));
      }
    }

    return urls;
  }
}
