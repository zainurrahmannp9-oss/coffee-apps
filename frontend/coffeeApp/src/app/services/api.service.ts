import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'https://coffee-apps-production.up.railway.app'; 

  constructor(private http: HttpClient) { }

  getUser(): Observable<any> {
    return this.http.get(this.baseUrl + '/user');
  }

  play(rewardCoins: number, rewardXp: number, energyCost: number): Observable<any> {
    return this.http.post(this.baseUrl + '/play', { rewardCoins, rewardXp, energyCost });
  }

  idle(): Observable<any> {
    return this.http.post(this.baseUrl + '/idle', {});
  }

  upgrade(type: string): Observable<any> {
    return this.http.post(this.baseUrl + '/upgrade', { type });
  }
}
