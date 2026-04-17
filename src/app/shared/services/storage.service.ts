import { Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL, listAll } from '@angular/fire/storage';

@Injectable({ providedIn: 'root' })
export class StorageService {
  constructor(private storage: Storage, private injector: Injector) {}

  async uploadQuizImage(file: File, quizId: string): Promise<string> {
    const filePath = `quizLogos/${quizId}/${Date.now()}_${file.name}`;
    const storageRef = ref(this.storage, filePath);
    await uploadBytes(storageRef, file);
    return runInInjectionContext(this.injector, () => getDownloadURL(storageRef));
  }

  async uploadVenueImage(file: File, venueId: string): Promise<string> {
    const filePath = `venue-images/${venueId}/${Date.now()}_${file.name}`;
    const storageRef = ref(this.storage, filePath);
    await uploadBytes(storageRef, file);
    return runInInjectionContext(this.injector, () => getDownloadURL(storageRef));
  }

  async getVenueLogoImages(): Promise<string[]> {
    const folderRef = ref(this.storage, 'venue-logos');
    const result = await runInInjectionContext(this.injector, () => listAll(folderRef));
    return Promise.all(result.items.map(item =>
      runInInjectionContext(this.injector, () => getDownloadURL(item))
    ));
  }

  async getExistingImages(): Promise<string[]> {
    const baseRef = ref(this.storage, 'quizLogos');
    const result = await runInInjectionContext(this.injector, () => listAll(baseRef));

    const urls: string[] = [];
    for (const folder of result.prefixes) {
      const images = await runInInjectionContext(this.injector, () => listAll(folder));
      for (const item of images.items) {
        urls.push(await runInInjectionContext(this.injector, () => getDownloadURL(item)));
      }
    }

    return urls;
  }
}
