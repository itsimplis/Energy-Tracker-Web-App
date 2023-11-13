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

  // [GET] Get all user's devices
  getDevices(username: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/data/getDevices?username=${username}`, { withCredentials: true });
  }

  // [GET] Get a user's specific device
  getDevice(device_id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/data/getDevice/${device_id}`, { withCredentials: true });
  }

  // [GET] Get consumption logs for a specific device
  getDeviceConsumption(device_id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/data/getDeviceConsumption/${device_id}`, { withCredentials: true });
  }

  // [GET] Get alerts for a specific device
  getDeviceAlerts(device_id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/data/getDeviceAlerts/${device_id}`, { withCredentials: true });
  }

  // [POST] Add a device to user's devices
  addDevice(user_username: string, device_category: string, device_type: string, device_name: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/data/addDevice`, {
      user_username: user_username,
      device_category: device_category,
      device_type: device_type,
      device_name: device_name
    });
  }

  // [DELETE] Remove a user's device by device_id
  removeDevice(device_id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/data/removeDevice/${device_id}`, { withCredentials: true });
  }
}
