import { Component } from '@angular/core';
import { DataApiService } from './../../service/data-api.service';
import { AuthenticationService } from 'src/app/service/authentication.service';

@Component({
  selector: 'alerts',
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.scss']
})

export class AlertsComponent {
  alerts: any[];

  constructor(private dataApiService: DataApiService, private authenticationService: AuthenticationService) {
    this.alerts = [];
  }

  ngOnInit(): void {
    this.loadAlerts();
  }

  loadAlerts() {

    this.alerts = [];

    this.dataApiService.getAlerts(this.authenticationService.getUserName()!, false).subscribe({
      next: (data) => {
        this.alerts = data;
      },
      error: (error) => {
        console.log(error);
      }
    })
  }

  onMarkAsRead(alert: any) {
    alert.read_status = 'Y';

    this.dataApiService.updateAlert(alert.id, 'Y').subscribe({
      next: () => {
        this.loadAlerts();
      },
      error: (error) => {
        console.log(error);
        alert.read_status = 'N';
      }
    });
  }

  onGoToDevice() {

  }
}


