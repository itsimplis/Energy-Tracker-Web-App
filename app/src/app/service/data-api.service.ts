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

  // [DELETE] Remove a single alert
  removeAlert(alert_id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/data/removeAlert/${alert_id}`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }

  // [POST] Add an alert for the user
  addAlert(device_id: number | null, consumption_id: number | null = null, title: string, description: string, suggestion: string, date: string, type: string, read_status: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/data/addAlert`, {
      device_id: device_id,
      consumption_id: consumption_id,
      title: title,
      description: description,
      suggestion: suggestion,
      date: date,
      type: type,
      read_status: read_status
    }, { headers: this.authenticationService.getAuthHeaders() });
  }

  // [POST] Add an alert for the user
  addRegistrationAlert(device_id: number | null, consumption_id: number | null = null, username: string, title: string, description: string, suggestion: string, date: string, type: string, read_status: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/data/addRegistrationAlert`, {
      device_id: device_id,
      consumption_id: consumption_id,
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
  // DEVICE TYPE API CALLS
  //========================================

  // [GET] Get all user's devices
  getDeviceTypes(device_category: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/data/getDeviceTypes/${device_category}`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
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
  addDevice(device_category: string, device_type: string, device_name: string, energy_alert_threshold: number, power_alert_threshold: number, usage_frequency: string, custom_power_min: number, custom_power_max: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/data/addDevice`, {
      device_category: device_category,
      device_type: device_type,
      device_name: device_name,
      energy_alert_threshold: energy_alert_threshold,
      power_alert_threshold: power_alert_threshold,
      usage_frequency: usage_frequency,
      custom_power_min: custom_power_min,
      custom_power_max: custom_power_max
    }, { headers: this.authenticationService.getAuthHeaders() });
  }

  // [PATCH] Update a device of the user
  updateDevice(device_id: number, device_category: string, device_type: string, device_name: string, energy_alert_threshold: number, power_alert_threshold: number, usage_frequency: string, custom_power_min: number, custom_power_max: number): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/data/editDevice/${device_id}`, {
      device_category: device_category,
      device_type: device_type,
      device_name: device_name,
      energy_alert_threshold: energy_alert_threshold,
      power_alert_threshold: power_alert_threshold,
      usage_frequency: usage_frequency,
      custom_power_min: custom_power_min,
      custom_power_max: custom_power_max
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

  // [DELETE] Remove all consumption records for a device of the user
  removeAllDeviceConsumption(device_id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/data/removeAllDeviceConsumption/${device_id}`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }

    // [DELETE] Remove all consumption records for all devices of the user
  removeAllUserConsumption(): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/data/removeAllUserConsumptions`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }

  // [DELETE] Remove a single consumption record
  removeConsumption(consumption_id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/data/removeConsumption/${consumption_id}`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }


  //========================================
  // POWER READINGS API CALLS
  //========================================

  // [GET] Get power readings for a specific consumption of a Device
  getConsumptionPowerReadings(consumption_id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/data/getConsumptionPowerReadings/${consumption_id}`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }

  // [POST] Add a consumption, and simulate power reading  by generating them
  addConsumptionPowerReadings(device_id: number, start_date: string, end_date: string, duration_days: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/data/addConsumptionPowerReadings`, {
      device_id: device_id,
      start_date: start_date,
      end_date: end_date,
      duration_days: duration_days
    }, { headers: this.authenticationService.getAuthHeaders() });
  }

  // [GET] Download power readings as an Excel file for a specific device
  downloadAllConsumptionPowerReadings(deviceId: number): Observable<Blob> {
    return this.http.get<Blob>(`${this.baseUrl}/data/downloadAllConsumptionPowerReadings/${deviceId}`, { responseType: 'blob' as 'json', headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }

  // [GET] Download power readings as an Excel file for a specific consumption of device
  downloadConsumptionPowerReadings(consumption_id: number): Observable<Blob> {
    return this.http.get<Blob>(`${this.baseUrl}/data/downloadConsumptionPowerReadings/${consumption_id}`, { responseType: 'blob' as 'json', headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
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


  //========================================
  //  STATISTICS CALLS
  //========================================

  // [GET] Get user power consumption, compared to other users, per device category
  getTopTenDevicesByPowerDraw(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/data/getTopTenDevicesByPowerDraw`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }

  // [GET] Get user power consumption, compared to other users, per device category
  getUserConsumptionComparisonByCategory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/data/getUserConsumptionComparisonByCategory`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }

  // [GET] Get user usage (hours), compared to other users, per device category
  getUserUsageComparisonByCategory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/data/getUserUsageComparisonByCategory`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }

  // [GET] Get average power consumption by age group
  getAverageEnergyConsumptionByAgeGroup(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/data/getAverageEnergyConsumptionByAgeGroup`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }

  // [GET] Get average energy consumption by gender
  getAverageEnergyConsumptionByGender(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/data/getAverageEnergyConsumptionByGender`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }

  // [GET] Get average power consumption by country
  getAverageEnergyConsumptionByCountry(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/data/getAverageEnergyConsumptionByCountry`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }
}
