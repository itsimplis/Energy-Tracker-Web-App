import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs'

@Injectable({
  providedIn: 'root'
})

export class DataApiService {

  private baseUrl: string = 'http://localhost:8000';

  constructor(private http: HttpClient) { }

   // [GET] Get user's alerts
   getAlerts(username: string, unreadAlertsOnly: boolean): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/data/getAlerts?username=${username}&unreadAlertsOnly=${unreadAlertsOnly}`, { withCredentials: true });
  }

  // [POST] Add an alert for the user
  addAlert(username: string, title: string, description: string, date: string, type: string, read_status: string): Observable<any[]> {
    return this.http.post<any[]>(`${this.baseUrl}/data/addAlert`, {
        username: username,
        title: title,
        description: description,
        date: date,
        type: type,
        read_status: read_status
    });
  }
}