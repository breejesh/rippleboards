import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) { }

  getStates(): Observable<any> {
    return this.http.get(`${this.apiUrl}/states`);
  }

  getStateMeasures(stateName: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/state-measures/${encodeURIComponent(stateName)}`);
  }

  getAllMeasures(): Observable<any> {
    return this.http.get(`${this.apiUrl}/measures`);
  }

  simulate(state: string, intervention: string, intensity: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/simulate`, {
      state,
      intervention,
      intensity
    });
  }

  runSimulation(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/simulate`, data);
  }
}
