import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ImageUploadService {
  // TODO: Replace with your actual Cloudinary details
  
  private readonly cloudName = 'Your_Cloud_Name';
  private readonly uploadPreset = 'Your_Upload_Preset';





  constructor(private http: HttpClient) {}

  /**
   * Upload a room image file to Cloudinary and return the hosted image URL.
   */
  uploadRoomImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);

    const url = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;

    return this.http.post<any>(url, formData).pipe(
      map((res) => res.secure_url || res.url)
    );
  }
}
