import { Injectable } from '@angular/core';
import { DataApiService } from './data-api.service';
import { AuthenticationService } from './authentication.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class AlertService {
  private alertsSubject = new BehaviorSubject<any[]>([]);
  public alerts$ = this.alertsSubject.asObservable();

  constructor(private dataApiService: DataApiService, private authenticationService: AuthenticationService) {
    console.log("ngOninitAlert Service");
    this.authenticationService.userLoggedIn.subscribe(() => {
      this.loadAlerts();
    });
  }
  

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

  updateAlerts(alertId: any) {
    this.dataApiService.updateAlert(alertId, 'Y').subscribe({
      next: () => {
        this.loadAlerts();
      },
      error: (error) => {
        console.error(error);
      }
    });
  }

  clearAlerts() {
    this.alertsSubject.next([]);
  }
}
