import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getUser(): Observable<any> {
    return this.http.get(this.baseUrl + '/user');
  }

  play(): Observable<any> {
    return this.http.post(this.baseUrl + '/play', {});
  }

  idle(): Observable<any> {
    return this.http.post(this.baseUrl + '/idle', {});
  }

  upgrade(type: string): Observable<any> {
    return this.http.post(this.baseUrl + '/upgrade', { type });
  }
}
