import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:5000/api';
  // If `firebaseDatabaseUrl` is configured in environment, use Realtime DB REST endpoints
  private firebaseDb = environment.firebaseDatabaseUrl || '';
  // Firestore project id (optional)
  private firestoreProject = environment.firestoreProjectId || '';
  // Optional Cloud Functions base URL
  private firebaseFunctions = environment.firebaseFunctionsUrl || '';

  constructor(private http: HttpClient) { }

  getStates(): Observable<any> {
    if (this.firestoreProject) {
      const url = `https://firestore.googleapis.com/v1/projects/${this.firestoreProject}/databases/(default)/documents/states`;
      return this.http.get<any>(url).pipe(
        map(res => {
          const docs = res.documents || [];
          return docs.map((d: any) => {
            const id = d.name ? d.name.split('/').pop() : undefined;
            const obj: any = { id };
            if (d.fields) {
              for (const k of Object.keys(d.fields)) {
                const v = d.fields[k];
                obj[k] = v.stringValue ?? (v.integerValue !== undefined ? Number(v.integerValue) : (v.doubleValue !== undefined ? Number(v.doubleValue) : (v.booleanValue !== undefined ? v.booleanValue : null)));
              }
            }
            return obj;
          });
        })
      );
    }
    if (this.firebaseDb) {
      return this.http.get(`${this.firebaseDb}/states.json`);
    }

    return this.http.get(`${this.apiUrl}/states`);
  }

  getStateMeasures(stateName: string): Observable<any> {
    if (this.firestoreProject) {
      const key = encodeURIComponent(stateName);
      const url = `https://firestore.googleapis.com/v1/projects/${this.firestoreProject}/databases/(default)/documents/state_measures/${key}`;
      return this.http.get<any>(url).pipe(
        map(res => {
          const outArr: any[] = [];
          if (res && res.fields) {
            for (const k of Object.keys(res.fields)) {
              const v = res.fields[k];

              // Firestore REST returns nested mapValue for each measure (mapValue.fields...)
              const mv = v && v.mapValue && v.mapValue.fields ? v.mapValue.fields : null;

              const obj: any = { key: k, name: k };

              const getString = (p: any) => (p && p.stringValue !== undefined) ? p.stringValue : undefined;
              const getNumber = (p: any) => {
                if (!p) return null;
                if (p.doubleValue !== undefined) return Number(p.doubleValue);
                if (p.integerValue !== undefined) return Number(p.integerValue);
                if (p.stringValue !== undefined && !isNaN(Number(p.stringValue))) return Number(p.stringValue);
                return null;
              };

              if (mv) {
                obj.name = getString(mv.shortQuestion) || getString(mv.measure) || k;
                obj.measure = getString(mv.measure) || undefined;
                obj.unit = getString(mv.unit) || undefined;
                obj.valueType = getString(mv.valueType) || getString(mv.dataValueType) || getString(mv.data_value_type) || undefined;
                obj.value = getNumber(mv.value) ?? getNumber(mv.data_value) ?? 0;
                obj.moe = getNumber(mv.moe) ?? null;
                obj.totalPopulation = getNumber(mv.totalPopulation) ?? getNumber(mv.totalpopulation) ?? null;
                obj.measureId = getString(mv.measureId) || getString(mv.measureid) || undefined;
                obj.category = getString(mv.category) || undefined;
                obj.dataSource = getString(mv.dataSource) || getString(mv.data_source) || undefined;
                obj.year = getString(mv.year) || undefined;
                obj.originalMeasureText = getString(mv.originalMeasureText) || undefined;
              } else {
                // Older/primitive shape fallback
                const val = v.stringValue ?? (v.integerValue !== undefined ? Number(v.integerValue) : (v.doubleValue !== undefined ? Number(v.doubleValue) : (v.booleanValue !== undefined ? v.booleanValue : null)));
                obj.value = val;
              }

              outArr.push(obj);
            }
          }
          return outArr;
        })
      );
    }
    if (this.firebaseDb) {
      const key = encodeURIComponent(stateName);
      return this.http.get(`${this.firebaseDb}/state_measures/${key}.json`);
    }
    return this.http.get(`${this.apiUrl}/state-measures/${encodeURIComponent(stateName)}`);
  }

  getAllMeasures(): Observable<any> {
    if (this.firestoreProject) {
      const url = `https://firestore.googleapis.com/v1/projects/${this.firestoreProject}/databases/(default)/documents/measures`;
      return this.http.get<any>(url).pipe(
        map(res => {
          const docs = res.documents || [];
          const out: any = {};
          for (const d of docs) {
            const id = d.name ? d.name.split('/').pop() : undefined;
            const obj: any = {};
            if (d.fields) {
              for (const k of Object.keys(d.fields)) {
                const v = d.fields[k];
                obj[k] = v.stringValue ?? (v.integerValue !== undefined ? Number(v.integerValue) : (v.doubleValue !== undefined ? Number(v.doubleValue) : (v.booleanValue !== undefined ? v.booleanValue : null)));
              }
            }
            if (id) out[id] = obj;
          }
          return out;
        })
      );
    }
    if (this.firebaseDb) {
      return this.http.get(`${this.firebaseDb}/measures.json`);
    }
    return this.http.get(`${this.apiUrl}/measures`);
  }

  simulate(state: string, intervention: string, intensity: number): Observable<any> {
    // If firebaseFunctions is configured, call the cloud function. Otherwise, push a simulation
    if (this.firebaseFunctions) {
      return this.http.post(`${this.firebaseFunctions}/simulate`, { state, intervention, intensity });
    }

    if (this.firestoreProject) {
      const url = `https://firestore.googleapis.com/v1/projects/${this.firestoreProject}/databases/(default)/documents/simulation_requests`;
      const body = {
        fields: {
          state: { stringValue: state },
          intervention: { stringValue: intervention },
          intensity: { doubleValue: intensity }
        }
      };
      return this.http.post(url, body);
    }
    if (this.firebaseDb) {
      // Push a simulation request to the Realtime DB (consumer functions can process it)
      return this.http.post(`${this.firebaseDb}/simulation_requests.json`, { state, intervention, intensity });
    }

    return this.http.post(`${this.apiUrl}/simulate`, {
      state,
      intervention,
      intensity
    });
  }

  runSimulation(data: any): Observable<any> {
    if (this.firebaseFunctions) {
      return this.http.post(`${this.firebaseFunctions}/simulate`, data);
    }

    if (this.firestoreProject) {
      if (data && data.state && data.usePrecomputed) {
        const key = encodeURIComponent(data.state);
        const url = `https://firestore.googleapis.com/v1/projects/${this.firestoreProject}/databases/(default)/documents/state_mortality_projections/${key}`;
        return this.http.get<any>(url).pipe(
          map(res => {
            const out: any = {};
            if (res && res.fields) {
              for (const k of Object.keys(res.fields)) {
                const v = res.fields[k];
                out[k] = v.stringValue ?? (v.integerValue !== undefined ? Number(v.integerValue) : (v.doubleValue !== undefined ? Number(v.doubleValue) : (v.booleanValue !== undefined ? v.booleanValue : null)));
              }
            }
            return out;
          })
        );
      }
      // Otherwise, create a simulation request document
      const url = `https://firestore.googleapis.com/v1/projects/${this.firestoreProject}/databases/(default)/documents/simulation_requests`;
      const body = { fields: {} } as any;
      if (data) {
        for (const k of Object.keys(data)) {
          const val = data[k];
          if (typeof val === 'number') body.fields[k] = { doubleValue: val };
          else if (typeof val === 'boolean') body.fields[k] = { booleanValue: val };
          else body.fields[k] = { stringValue: String(val) };
        }
      }
      return this.http.post(url, body);
    }

    if (this.firebaseDb) {
      // If the simulation results are precomputed and available under `state_mortality_projections`, read them
      if (data && data.state && data.usePrecomputed) {
        const key = encodeURIComponent(data.state);
        return this.http.get(`${this.firebaseDb}/state_mortality_projections/${key}.json`);
      }
      // Otherwise, create a simulation request entry
      return this.http.post(`${this.firebaseDb}/simulation_requests.json`, data);
    }

    return this.http.post(`${this.apiUrl}/simulate`, data);
  }
}
