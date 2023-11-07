import { Component, OnDestroy, OnInit } from '@angular/core';
import { DataApiService } from './../../service/data-api.service';
import { AuthenticationService } from 'src/app/service/authentication.service';
import { AlertService } from 'src/app/service/alert.service';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'alerts',
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.scss']
})

export class AlertsComponent implements OnInit, OnDestroy {

  alerts: any[] = [];
  highlightedAlertId: number | null = null;
  private alertsSubscription!: Subscription;
  private routeSubscription!: Subscription;
  

  constructor(private dataApiService: DataApiService, private authenticationService: AuthenticationService, private alertService: AlertService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.alertsSubscription = this.alertService.alerts$.subscribe(
      data => {
        this.alerts = data;
      });

    this.routeSubscription = this.route.params.subscribe(params => {
      this.highlightedAlertId = params['id'];
      this.alertService.loadAlerts();
    });
  }

  ngOnDestroy() {
    if (this.alertsSubscription) {
      this.alertsSubscription.unsubscribe();
    }
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  onMarkAsRead(alert: any) {
    this.alertService.updateAlerts(alert.id);
  }

  onGoToDevice() {
    // Todo:...
  }
}

