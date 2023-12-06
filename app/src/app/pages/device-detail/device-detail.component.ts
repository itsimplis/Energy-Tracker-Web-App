import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
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

@Component({
  selector: 'app-device-detail',
  templateUrl: './device-detail.component.html',
  styleUrls: ['./device-detail.component.scss']
})
export class DeviceDetailComponent implements OnInit {

  private routeSubscription!: Subscription;
  private deviceAlertsSubscription!: Subscription;

  details: any[];
  consumptions: any[];
  consumption_readings: any[];
  device_readings: any[];
  alerts: any[];
  selectedStartDate: string | null = null;
  selectedEndDate: string | null = null;
  panelOpenState: boolean = false;
  columnsConsumption: string[] = ['start_date', 'end_date', 'duration_days', 'files_names', 'power_max'];
  columnsAlert: string[] = ['title', 'description', 'type', 'read_status', 'suggestion', 'date'];
  dataSourceConsumption!: MatTableDataSource<any[]>;
  dataSourceAlert!: MatTableDataSource<any[]>;

  @ViewChild('paginatorAlerts') paginatorAlerts!: MatPaginator;
  @ViewChild('paginatorConsumptions') paginatorConsumptions!: MatPaginator;
  @ViewChild('sortAlerts') sortAlerts!: MatSort;
  @ViewChild('sortConsumptions') sortConsumptions!: MatSort;


  constructor(private route: ActivatedRoute, private dataApiService: DataApiService, private dialogService: DialogService, private alertService: AlertService, private matDialog: MatDialog, private changeDetectorRef: ChangeDetectorRef) {
    this.details = [];
    this.consumptions = [];
    this.consumption_readings = [];
    this.device_readings = [];
    this.alerts = [];
  }

  ngOnInit() {
    this.routeSubscription = this.route.params.subscribe(params => {
      const deviceId = Number(params['id']);

      this.deviceAlertsSubscription = this.alertService.deviceAlerts$.subscribe(
        deviceAlerts => {
          this.alerts = deviceAlerts;
          this.dataSourceAlert = new MatTableDataSource(this.alerts);
          this.dataSourceAlert.data = this.alerts;
          setTimeout(() => {
            this.dataSourceAlert.sort = this.sortAlerts;
            this.dataSourceAlert.paginator = this.paginatorAlerts
          });
        });

      this.loadDeviceDetail(deviceId);
      this.loadDeviceConsumption(deviceId);
      this.loadDevicePowerReadings(deviceId);
      this.alertService.loadDeviceAlerts(deviceId);
    });
  }

  ngOnDestroy() {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    if (this.deviceAlertsSubscription) {
      this.deviceAlertsSubscription.unsubscribe();
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

  loadDeviceConsumption(device_id: number) {
    this.dataApiService.getDeviceConsumption(device_id).subscribe({
      next: (data) => {
        this.consumptions = data;
        this.dataSourceConsumption = new MatTableDataSource(this.consumptions);
        this.dataSourceConsumption.data = this.consumptions;
        setTimeout(() => {
          this.dataSourceConsumption.sort = this.sortConsumptions;
          this.dataSourceConsumption.paginator = this.paginatorConsumptions;
        });
      },
      error: (error) => {
        console.log(error);
      }
    });
  }

  loadDevicePowerReadings(device_id: number) {
    this.dataApiService.getDevicePowerReadings(device_id).subscribe({
      next: (data: any[]) => {
        this.device_readings = this.groupPowerReadingsByConsumptionPeriod(data);
      },
      error: (error) => {
        console.log(error);
      }
    });
  }

  // Group power readings by consumption period, and 'Day x' name value, to be using in the chart
  groupPowerReadingsByConsumptionPeriod(data: PowerReading[]): { name: string; series: { name: string; value: number; }[] }[] {
    const groupedData: Record<string, GroupedDataItem> = {};

    data.forEach((reading: PowerReading) => {
      const period = `${new Date(reading.start_date as string).toLocaleDateString()} - ${new Date(reading.end_date as string).toLocaleDateString()}`;
      if (!groupedData[period]) {
        groupedData[period] = {
          name: period,
          series: [],
          startDate: new Date(reading.start_date)
        };
      }

      const readingDate = new Date(reading.reading_timestamp as string);
      const dayNumber = Math.ceil((readingDate.getTime() - groupedData[period].startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      groupedData[period].series.push({
        name: `Day ${dayNumber}`,
        value: reading.power
      });
    });

    return Object.values(groupedData).map(({ name, series }) => ({ name, series }));
  }


  applyFilterInConsumptions(event: Event) {
    const filterValueConsumption = (event.target as HTMLInputElement).value;
    this.dataSourceConsumption.filter = filterValueConsumption.trim().toLowerCase();

    if (this.dataSourceConsumption.paginator) {
      this.dataSourceConsumption.paginator.firstPage();
    }
  }

  applyFilterInAlerts(event: Event) {
    const filterValueAlert = (event.target as HTMLInputElement).value;
    this.dataSourceAlert.filter = filterValueAlert.trim().toLowerCase();

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
        this.consumption_readings = [
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
    this.dialogService.openViewAlertDialog(row).subscribe({
      next: (result) => {
        if (result === true) {
          this.alertService.updateAlerts(row.id);
          this.alertService.loadDeviceAlerts(row.device_id);
        }
      },
      error: (error) => {
        this.alertService.showSnackBar("An error occurred!");
      }
    })
  }

  setPanelOpenState(state: boolean) {
    this.panelOpenState = state;
  }

  getPanelOpenState(): boolean {
    return this.panelOpenState;
  }

  getDeviceDisplayIcon(type: string): string {
    switch (type) {
      case 'Cooling': return 'ac_unit';
      case 'Kitchen': return 'kitchen';
      case 'Multimedia': return 'tv';
      case 'Other': return 'device_unknown';
      case 'Washing': return 'local_laundry_service';
      default: return 'device_unknown';
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

  colorScheme: Color = {
    name: 'custom',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#009dff', '#00d089', '#00b8e5']
  };

}

interface PowerReading {
  consumption_id: number;
  reading_timestamp: string;
  power: number;
  start_date: string;
  end_date: string;
}

interface GroupedDataItem {
  name: string;
  series: { name: string; value: number; }[];
  startDate: Date;
}