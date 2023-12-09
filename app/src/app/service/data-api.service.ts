import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs'
import { AuthenticationService } from './authentication.service';

@Injectable({
  providedIn: 'root'
})

export class DataApiService {

  private baseUrl: string = 'http://localhost:8000';

  constructor(private http: HttpClient, private authenticationService: AuthenticationService) { }


  //========================================
  // ALERTS API CALLS
  //========================================

  // [GET] Get user's alerts
  getAlerts(unreadAlertsOnly: boolean): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/data/getAlerts?unreadAlertsOnly=${unreadAlertsOnly}`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }

  // [DELETE] Remove all user's alerts
  removeAlerts(): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/data/removeAlerts`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }

  // [POST] Add an alert for the user
  addAlert(device_id: number | null, title: string, description: string, suggestion: string, date: string, type: string, read_status: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/data/addAlert`, {
      device_id: device_id,
      title: title,
      description: description,
      suggestion: suggestion,
      date: date,
      type: type,
      read_status: read_status
    }, { headers: this.authenticationService.getAuthHeaders() });
  }

  // [POST] Add an alert for the user
  addRegistrationAlert(device_id: number | null, username: string, title: string, description: string, suggestion: string, date: string, type: string, read_status: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/data/addRegistrationAlert`, {
      device_id: device_id,
      username: username,
      title: title,
      description: description,
      suggestion: suggestion,
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
    }, { headers: this.authenticationService.getAuthHeaders() });
  }


  //========================================
  // DEVICES API CALLS
  //========================================

  // [GET] Get all user's devices
  getDevices(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/data/getDevices`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }

  // [GET] Get a user's specific device
  getDevice(device_id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/data/getDevice/${device_id}`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }

  // [GET] Get consumption logs for a specific device
  getDeviceConsumption(device_id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/data/getDeviceConsumption/${device_id}`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }

  // [GET] Get all power readings for a specific device
  getDevicePowerReadings(device_id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/data/getDevicePowerReadings/${device_id}`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }

  // [GET] Get alerts for a specific device
  getDeviceAlerts(device_id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/data/getDeviceAlerts/${device_id}`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }

  // [POST] Add a device to user's devices
  addDevice(device_category: string, device_type: string, device_name: string, alert_threshold_high: number, alert_threshold_low: number, usage_frequency: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/data/addDevice`, {
      device_category: device_category,
      device_type: device_type,
      device_name: device_name,
      alert_threshold_high: alert_threshold_high,
      alert_threshold_low: alert_threshold_low,
      usage_frequency: usage_frequency
    }, { headers: this.authenticationService.getAuthHeaders() });
  }

  // [DELETE] Remove a user's device by device_id
  removeDevice(device_id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/data/removeDevice/${device_id}`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }

  // [DELETE] Remove all alerts for a device of the user
  removeDeviceAlerts(device_id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/data/removeDeviceAlerts/${device_id}`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }


  //========================================
  // POWER READINGS API CALLS
  //========================================

  // [GET] Get power readings for a specific consumption of a Device
  getConsumptionPowerReadings(consumption_id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/data/getConsumptionPowerReadings/${consumption_id}`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }


  //========================================
  // DASHBOARD API CALLS
  //========================================

  // [GET] Get device, consumptions and alerts counters for Dashboard's cards
  getDashboardCounters(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/data/getDashboardCounters`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }

  // [GET] GET total power per device
  getTotalPowerPerDevice(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/data/getTotalPowerPerDevice`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }

  // [GET] GET total power per device
  getAveragePowerPerDevice(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/data/getAveragePowerPerDevice`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }


  //========================================
  // ANALYSIS API CALLS
  //========================================

  // [GET] Get power peaks (analysis) per consumption
  getPeakPowerAnalysis(consumption_id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/data/getPeakPowerAnalysis/${consumption_id}`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }
}
