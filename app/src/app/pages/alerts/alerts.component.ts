import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DataApiService } from './../../service/data-api.service';
import { AuthenticationService } from 'src/app/service/authentication.service';
import { AlertService } from 'src/app/service/alert.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialogConfig } from '@angular/material/dialog';
import { BasicDialogComponent } from 'src/app/dialog/basic-dialog/basic-dialog.component';
import { DialogRef } from '@angular/cdk/dialog';
import { DialogService } from 'src/app/service/dialog.service';

@Component({
  selector: 'alerts',
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.scss']
})

export class AlertsComponent implements OnInit, OnDestroy {

  alerts: any[] = [];
  highlightedAlertId: number | null = null;
  dataSourceAlert!: MatTableDataSource<any[]>;
  columnsAlert: string[] = ['title', 'description', 'suggestion', 'type', 'read_status', 'date', 'actions'];
  @ViewChild(MatPaginator) paginatorAlert!: MatPaginator;
  @ViewChild(MatSort) sortAlert!: MatSort;
  dialogRef!: DialogRef;
  private alertsSubscription!: Subscription;
  private routeSubscription!: Subscription;

  constructor(private dataApiService: DataApiService, private authenticationService: AuthenticationService, private alertService: AlertService, private route: ActivatedRoute, private router: Router, private dialogService: DialogService) { }

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

  getTypeDisplayText(type: string): string {
    switch (type) {
      case 'I': return 'Information';
      case 'W': return 'Warning';
      case 'C': return 'Critical';
      case 'U': return 'System';
      default: return type;
    }
  }

  getTypeClass(type: string): string {
    switch (type) {
      case 'I': return 'informational-type';
      case 'W': return 'warning-type';
      case 'C': return 'critical-type';
      case 'U': return 'system-type';
      default: return '';
    }
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'I': return 'info';
      case 'W': return 'warning';
      case 'C': return 'cancel';
      case 'U': return 'person_pin';
      default: return type;
    }
  }

  getReadStatusDisplayText(read_status: string): string {
    switch (read_status) {
      case 'Y': return 'Read';
      case 'N': return 'Unread';
      default: return read_status;
    }
  }

  getReadStatusClass(read_status: string): string {
    switch (read_status) {
      case 'Y': return 'read-type';
      case 'N': return 'unread-type';
      default: return '';
    }
  }

  onClearAllAlerts() {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = '600px';
    dialogConfig.data = { title: 'Alerts Deletion', content: 'This will clear all alerts associated with your account.' }
    this.dialogService.openDialog(BasicDialogComponent, dialogConfig).subscribe({
      next: (result) => {
        if (result === true) {
          this.alertService.removeAlerts();
        } else {
          this.alertService.showSnackBar("Alerts deletion was cancelled!");
        }
      },
      error: (error) => {
        this.alertService.showSnackBar("An error occurred!");
      }
    });
  }

  onAlertRowClick(row: any) {
    this.dialogService.openViewAlertDialog(row).subscribe({
      next: (result) => {
        if (result === true) {
          this.alertService.updateAlerts(row.id);
        }
      },
      error: (error) => {
        this.alertService.showSnackBar("An error occurred!");
      }
    })
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

