import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs'

@Injectable({
  providedIn: 'root'
})

export class DataApiService {

  private baseUrl: string = 'http://localhost:8000';

  constructor(private http: HttpClient) { }

  //========================================
  // ALERTS API CALLS
  //========================================

   // [GET] Get user's alerts
   getAlerts(username: string, unreadAlertsOnly: boolean): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/data/getAlerts?username=${username}&unreadAlertsOnly=${unreadAlertsOnly}`, { withCredentials: true });
  }

  // [POST] Add an alert for the user
  addAlert(username: string, device_id: number | null, title: string, description: string, date: string, type: string, read_status: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/data/addAlert`, {
        username: username,
        device_id: device_id,
        title: title,
        description: description,
        date: date,
        type: type,
        read_status: read_status
    });
  }

  // [POST] Update the read status of an Alert
  updateAlert(id: string, read_status: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/data/updateAlert`, {
        id: id,
        read_status: read_status
    });
  }

  //========================================
  // DEVICES API CALLS
  //========================================

  // [GET] Get user's alerts
  getDevices(username: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/data/getDevices?username=${username}`, { withCredentials: true });
  }
}
