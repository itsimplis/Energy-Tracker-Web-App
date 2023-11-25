import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DataApiService } from './../../service/data-api.service';
import { AuthenticationService } from 'src/app/service/authentication.service';
import { AlertService } from 'src/app/service/alert.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatPaginator} from '@angular/material/paginator';
import { MatSort} from '@angular/material/sort';
import { MatTableDataSource} from '@angular/material/table';

@Component({
  selector: 'alerts',
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.scss']
})

export class AlertsComponent implements OnInit, OnDestroy {

  alerts: any[] = [];
  highlightedAlertId: number | null = null;
  dataSourceAlert!: MatTableDataSource<any[]>;
  columnsAlert: string[] = ['title', 'description', 'type', 'read_status', 'date', 'actions'];
  @ViewChild(MatPaginator) paginatorAlert!: MatPaginator;
  @ViewChild(MatSort) sortAlert!: MatSort;
  private alertsSubscription!: Subscription;
  private routeSubscription!: Subscription;

  constructor(private dataApiService: DataApiService, private authenticationService: AuthenticationService, private alertService: AlertService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.alertsSubscription = this.alertService.alerts$.subscribe(
      data => {
        this.alerts = data;
          this.dataSourceAlert = new MatTableDataSource(this.alerts);
          this.dataSourceAlert.data = this.alerts;
          this.dataSourceAlert.paginator = this.paginatorAlert;
          this.dataSourceAlert.sort = this.sortAlert;
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

  applyFilterInAlerts(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSourceAlert.filter = filterValue.trim().toLowerCase();

    if (this.dataSourceAlert.paginator) {
      this.dataSourceAlert.paginator.firstPage();
    }
  }

  onAlertRowClick(row: any) {
    console.log(row);
  }

  onMarkAsRead(alert: any) {
    this.alertService.updateAlerts(alert.id);
  }

  onButtonClick(device_id: number) {
    if (device_id) {
      this.router.navigate(['/device-detail', device_id]);
    } 
    else {
      this.router.navigate(['/account']);
    }
  }
}

