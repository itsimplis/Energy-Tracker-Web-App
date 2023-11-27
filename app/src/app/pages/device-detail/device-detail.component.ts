import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { Color, ScaleType, LegendPosition } from '@swimlane/ngx-charts';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { DataApiService } from 'src/app/service/data-api.service';
import { DialogService } from 'src/app/service/dialog.service';
import { AlertService } from 'src/app/service/alert.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { BasicDialogComponent } from 'src/app/dialog/basic-dialog/basic-dialog.component';
import { DialogRef } from '@angular/cdk/dialog';

@Component({
  selector: 'app-device-detail',
  templateUrl: './device-detail.component.html',
  styleUrls: ['./device-detail.component.scss']
})
export class DeviceDetailComponent implements OnInit {

  private routeSubscription!: Subscription;
  private alertsSubscription!: Subscription;

  details: any[];
  consumptions: any[];
  readings: any[];
  alerts: any[];
  selectedStartDate: string | null = null;
  selectedEndDate: string | null = null;
  panelOpenState: boolean = false;
  columnsConsumption: string[] = ['consumption_id', 'start_date', 'end_date', 'duration_days', 'files_names', 'power_max'];
  columnsAlert: string[] = ['title', 'description', 'type', 'read_status', 'date'];
  dataSourceConsumption!: MatTableDataSource<any[]>;
  dataSourceAlert!: MatTableDataSource<any[]>;

  @ViewChild('paginatorConsumptions') paginatorConsumptions!: MatPaginator;
  @ViewChild(MatSort) sortConsumptions!: MatSort;
  @ViewChild('paginatorAlerts') paginatorAlert!: MatPaginator;
  @ViewChild(MatSort) sortAlert!: MatSort;

  constructor(private route: ActivatedRoute, private dataApiService: DataApiService, private dialogService: DialogService, private alertService: AlertService, private matDialog: MatDialog) {
    this.details = [];
    this.consumptions = [];
    this.readings = [];
    this.alerts = [];
  }

  ngOnInit() {
    this.routeSubscription = this.route.params.subscribe(params => {
      this.loadDeviceDetail(Number(params['id']));
      this.loadDeviceConsumption(Number(params['id']));
      this.loadDeviceAlerts(Number(params['id']));
    });
  }

  ngOnDestroy() {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  loadDeviceDetail(device_id: number) {
    this.dataApiService.getDevice(device_id).subscribe({
      next: (data) => {
        this.details = data;
      },
      error: (error) => {
        console.log(error);
      }
    });
  }

  loadDeviceAlerts(device_id: number) {
    this.dataApiService.getDeviceAlerts(device_id).subscribe({
      next: (data) => {
        this.alerts = data;
        this.dataSourceAlert = new MatTableDataSource(this.alerts);
        this.dataSourceAlert.data = this.alerts;
        this.dataSourceAlert.paginator = this.paginatorAlert;
        this.dataSourceAlert.sort = this.sortAlert;
      },
      error: (error) => {
        console.log(error);
      }
    });
  }

  loadDeviceConsumption(device_id: number) {
    this.dataApiService.getDeviceConsumption(device_id).subscribe({
      next: (data) => {
        this.consumptions = data;
        this.dataSourceConsumption = new MatTableDataSource(this.consumptions);
        this.dataSourceConsumption.data = this.consumptions;
        this.dataSourceConsumption.paginator = this.paginatorConsumptions;
        this.dataSourceConsumption.sort = this.sortConsumptions;
      },
      error: (error) => {
        console.log(error);
      }
    });
  }

  applyFilterInConsumptions(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSourceConsumption.filter = filterValue.trim().toLowerCase();

    if (this.dataSourceConsumption.paginator) {
      this.dataSourceConsumption.paginator.firstPage();
    }
  }

  applyFilterInAlerts(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSourceAlert.filter = filterValue.trim().toLowerCase();

    if (this.dataSourceAlert.paginator) {
      this.dataSourceAlert.paginator.firstPage();
    }
  }

  onAddNewConsumption() {
    this.dialogService.openNewConsumptionDialog().subscribe(result => {
      if (result) {
        console.log("Handling addition of new consumption log!")
        console.log(result);
      } else {
        console.log("Addition of new consumption log cancelled!")
        console.log(result);
      }
    });
  }

  onConsumptionRowClick(row: any) {

    this.selectedStartDate = row.start_date;
    this.selectedEndDate = row.end_date;

    this.dataApiService.getConsumptionPowerReadings(row.consumption_id).subscribe({
      next: (data: any[]) => {
        this.readings = [
          {
            name: 'Power Readings',
            series: data.map(item => ({
              name: new Date(item.reading_timestamp as string),
              value: item.power as number
            }))
          }
        ];
      },
      error: (error) => {
        console.error(error);
      }
    });
  }

  onClearDeviceAlerts(device_id: number) {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = '600px';
    dialogConfig.data = { title: 'Device Alerts Deletion', content: 'This will clear all alerts associated with your device only.' }
    const dialogRef = this.matDialog.open(BasicDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe({
      next: (result) => {
        if (result === true) {
          this.alertService.removeDeviceAlerts(device_id);
          this.loadDeviceAlerts(device_id);
        } else {
          this.alertService.showSnackBar("Device alerts deletion was cancelled!");
        }
      },
      error: (error) => {
        this.alertService.showSnackBar("An error occurred!");
      }
    });
  }

  onAlertRowClick(row: any) {
    console.log(row);
  }

  setPanelOpenState(state: boolean) {
    this.panelOpenState = state;
  }

  getPanelOpenState(): boolean {
    return this.panelOpenState;
  }

  colorScheme: Color = {
    name: 'custom',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#009dff', '#00d089', '#00b8e5']
  };

}

export interface ConsumptionData {
  consumption_id: number | null;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  files_names: string | null;
  power_max: number | null;
}

export interface AlertData {
  title: string;
  description: string;
  date: string;
  type: string;
  read_status: string;
}