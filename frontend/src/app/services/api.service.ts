import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) { }

  getLocations(): Observable<any> {
    return this.http.get(`${this.apiUrl}/locations`);
  }

  getMeasures(locationId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/measures/${locationId}`);
  }

  simulate(location: string, intervention: string, intensity: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/simulate`, {
      location,
      intervention,
      intensity
    });
  }
}
