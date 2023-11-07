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
  public alerts$ = this.alertsSubject.asObservable();

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
    this.dataApiService.getAlerts(this.authenticationService.getUserName()!, false).subscribe({
      next: (data) => {
        this.alertsSubject.next(data);
      },
      error: (error) => {
        console.log(error);
      }
    })
  }

  // Add an alert
  addAlert(username: string, title: string, description: string, date: string, type: string, read_status: string, force_refresh: boolean) {
    this.dataApiService.addAlert(username, title, description, date, type, read_status).subscribe({
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

  // Clear alerts locally
  clearAlerts() {
    this.alertsSubject.next([]);
  }

  showSnackBar(message: string, action: string = 'Close', duration: number = 3500) {
    this.matSnackBar.open(message, action, { duration });
  }
}
