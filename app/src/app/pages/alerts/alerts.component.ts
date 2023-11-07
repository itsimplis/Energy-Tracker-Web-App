import { Component } from '@angular/core';
import { DataApiService } from './../../service/data-api.service';
import { AuthenticationService } from 'src/app/service/authentication.service';
import { AlertService } from 'src/app/service/alert.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'alerts',
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.scss']
})

export class AlertsComponent {
  alerts: any[] = [];
  private alertsSubscription!: Subscription;

  constructor(private dataApiService: DataApiService, private authenticationService: AuthenticationService, private alertService: AlertService) {
    this.alerts = [];
  }

  ngOnInit(): void {
    this.alertsSubscription = this.alertService.alerts$.subscribe(
      data => {
        this.alerts = data;
    });

    this.alertService.loadAlerts();
  }

  ngOnDestroy() {
    if (this.alertsSubscription) {
      this.alertsSubscription.unsubscribe();
    }
  }

  onMarkAsRead(alert: any) {
    this.alertService.updateAlerts(alert.id);
  }

  onGoToDevice() {
    // Todo:...
  }
}


