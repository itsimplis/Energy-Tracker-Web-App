import { Injectable } from '@angular/core';
import { DataApiService } from './data-api.service';
import { AuthenticationService } from './authentication.service';
import { BehaviorSubject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})

export class AlertService {
  private alertsSubject = new BehaviorSubject<any[]>([]);
  private deviceAlertsSubject = new BehaviorSubject<any[]>([]);

  public alerts$ = this.alertsSubject.asObservable();
  public deviceAlerts$ = this.deviceAlertsSubject.asObservable();


  constructor(private dataApiService: DataApiService, private authenticationService: AuthenticationService, private matSnackBar: MatSnackBar) {
    this.authenticationService.userLoggedIn.subscribe(() => {
      this.loadAlerts();
    });
    this.authenticationService.userLoggedOut.subscribe(() => {
      this.clearAlerts();
    });
  }

  // Load all alerts
  loadAlerts() {
    this.dataApiService.getAlerts(false).subscribe({
      next: (data) => {
        this.alertsSubject.next(data);
      },
      error: (error) => {
        console.log(error);
      }
    });
  }

  loadDeviceAlerts(device_id: number) {
    this.dataApiService.getDeviceAlerts(device_id).subscribe({
        next: (data) => {
            this.deviceAlertsSubject.next(data);
        },
        error: (error) => {
            console.error(error);
        }
    });
}

  // Add an alert
  addAlert(device_id: number | null, title: string, description: string, suggestion: string, date: string, type: string, read_status: string, force_refresh: boolean) {
    this.dataApiService.addAlert(device_id, title, description, suggestion, date, type, read_status).subscribe({
      next: (data) => {
        if (force_refresh) {
          this.loadAlerts();
          this.showSnackBar(data.message);
        }
      },
      error: (error) => {
        console.error(error);
      }
    });
  }

    // Add a registration alert
    addRegistrationAlert(username: string, device_id: number | null, title: string, description: string, suggestion: string, date: string, type: string, read_status: string, force_refresh: boolean) {
      this.dataApiService.addRegistrationAlert(device_id, username, title, description, suggestion, date, type, read_status).subscribe({
        next: (data) => {
        },
        error: (error) => {
          console.error(error);
        }
      });
    }

  // Update an alert
  updateAlerts(alertId: any) {
    this.dataApiService.updateAlert(alertId, 'Y').subscribe({
      next: (data) => {
        this.loadAlerts();
        this.showSnackBar(data.message);
      },
      error: (error) => {
        console.error(error);
      }
    });
  }

  // Remove all alerts (for a user)
  removeAlerts() {
    this.dataApiService.removeAlerts().subscribe({
      next: (data) => {
          this.loadAlerts();
          this.showSnackBar(data.message);
      },
      error: (error) => {
        console.error(error);
        this.showSnackBar(error.error.detail)
      }
    });
  }

  // Remove all device alerts (for a user's device)
  removeDeviceAlerts(device_id: number) {
    this.dataApiService.removeDeviceAlerts(device_id).subscribe({
      next: (data) => {
        this.loadAlerts();
        this.loadDeviceAlerts(device_id);
        this.showSnackBar(data.message);
      },
      error: (error) => {
        console.error(error);
        this.showSnackBar(error.error.detail)
      }
    });
  }

  // Clear alerts locally
  clearAlerts() {
    this.alertsSubject.next([]);
  }

  showSnackBar(message: string, action: string = 'Close', duration: number = 3500) {
    this.matSnackBar.open(message, action, { duration });
  }
}
