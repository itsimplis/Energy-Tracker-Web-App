import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { Color, ScaleType, LegendPosition, LineChartComponent } from '@swimlane/ngx-charts';
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
  @ViewChild('timelineChartPower') timelineChartPower!: LineChartComponent;
  @ViewChild('timelineChartEnergy') timelineChartEnergy!: LineChartComponent;
  private routeSubscription!: Subscription;
  private deviceAlertsSubscription!: Subscription;

  details: any[];
  consumptions: any[];
  consumption_readings: any[];
  consumption_energy: any[];
  device_readings: any[];
  device_readings_daily: any[];
  device_readings_kWh: any[];
  device_readings_cumulative_kWh: any[];
  alerts: any[];
  chartRefLines: any[];
  chartRefLinesEnergy: any[];
  chartYAxisMin: number;
  chartYAxisGroupedMin: number;
  chartEnergyYAxisMax: number;
  selectedStartDate: string | null = null;
  selectedEndDate: string | null = null;
  panelOpenState: boolean = false;
  output: Output;
  aggregation: 'sum' | 'average' | 'none' = 'none';
  columnsConsumption: string[] = ['consumption_id', 'start_date', 'end_date', 'duration_days', 'power_max', 'energy_max', 'files_names', 'actions'];
  columnsAlert: string[] = ['title', 'description', 'consumption_id_ref', 'type', 'read_status', 'suggestion', 'date', 'actions'];
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
    this.consumption_energy = [];
    this.device_readings = [];
    this.device_readings_daily = [];
    this.device_readings_kWh = [];
    this.device_readings_cumulative_kWh = [];
    this.alerts = [];
    this.chartRefLines = [];
    this.chartRefLinesEnergy = [];
    this.chartYAxisMin = 0;
    this.chartYAxisGroupedMin = 0;
    this.chartEnergyYAxisMax = 0;
    this.output = { result: '', message: '' };
    this.aggregation = 'none';
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
        if (this.details[0]?.power_alert_threshold == 0) {
          this.chartRefLines = [{ "name": "Min Power Rating", "value": this.details[0]?.custom_power_min }, { "name": "Max Power Rating", "value": this.details[0]?.custom_power_max }];
        } else {
          this.chartRefLines = [{ "name": "Min Power Rating", "value": this.details[0]?.custom_power_min }, { "name": "User Threshold", "value": this.details[0]?.power_alert_threshold }, { "name": "Max Power Rating", "value": this.details[0]?.custom_power_max }];
        }
        if (this.details[0]?.energy_alert_threshold == 0) {
          this.chartRefLinesEnergy = [];
        } else {
          this.chartRefLinesEnergy = [{ "name": "User Threshold", "value": this.details[0]?.energy_alert_threshold }];
        }

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
        this.chartYAxisGroupedMin = this.getChartYAxisMaxValue(this.getHighestPowerPeak());
        this.chartEnergyYAxisMax = this.getChartEnergyYAxisMaxValue(this.getConsumptionEnergyMax());
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
        this.device_readings = this.groupPowerReadingsByConsumptionPeriod(data, 'none');
        this.device_readings_daily = this.groupPowerReadingsByConsumptionPeriod(data, 'average');
        this.device_readings_kWh = this.groupPowerReadingsByPeriodkWh(data);
        this.device_readings_cumulative_kWh = this.groupPowerReadingsForCumulativeEnergyChart(data);
      },
      error: (error) => {
        console.log(error);
      }
    });
  }

  // Group power readings by consumption period, and 'Day x' name value, to be using in the chart
  groupPowerReadingsByConsumptionPeriod(data: PowerReading[], aggregationType: 'sum' | 'average' | 'none' = 'none'): { name: string; series: SeriesItem[] }[] {
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
      const dayLabel = `Day ${readingDate.getDate()}`; // Day of the reading

      if (aggregationType === 'none') {
        const hourLabel = `${readingDate.getHours()}:00`; // Hour of the reading
        groupedData[period].series.push({
          name: `${dayLabel}, ${hourLabel}`,
          value: reading.power
        });
      } else {
        let daySeries = groupedData[period].series.find(s => s.name === dayLabel);
        if (!daySeries) {
          daySeries = { name: dayLabel, value: 0, count: 0 };
          groupedData[period].series.push(daySeries);
        }
        if (aggregationType === 'average' && reading.power !== 0) {
          // Only add non-zero readings for average calculation
          daySeries.value += reading.power;
          daySeries.count! += 1;
        } else if (aggregationType !== 'average') {
          daySeries.value += reading.power;
          daySeries.count! += 1;
        }
      }
    });

    if (aggregationType === 'average') {
      Object.values(groupedData).forEach(group => {
        group.series.forEach(day => {
          if (day.count !== undefined && day.count > 0) {
            day.value /= day.count;
          }
        });
      });
    }

    return Object.values(groupedData).map(({ name, series }) => ({ name, series }));
  }

  // Group power readings by consumption period, and 'Day x' name value, to be using in the chart
  groupPowerReadingsByPeriodkWh(data: PowerReading[]): any[] {
    const groupedData: Record<string, any> = {};

    data.forEach((reading: PowerReading) => {
      const periodKey = `${new Date(reading.start_date as string).toLocaleDateString()} - ${new Date(reading.end_date as string).toLocaleDateString()}`;
      if (!groupedData[periodKey]) {
        groupedData[periodKey] = { name: periodKey, value: 0 };
      }
      // Convert Watts to kWh for each reading
      groupedData[periodKey].value += reading.power / 1000; // Convert to kWh
    });

    // Round the final kWh values for better readability
    Object.keys(groupedData).forEach(key => {
      groupedData[key].value = Number(groupedData[key].value.toFixed(2));
    });

    return Object.values(groupedData);
  }

  groupPowerReadingsForCumulativeEnergyChart(data: PowerReading[]): any[] {
    const groupedData: Record<string, { name: string; series: any[]; cumulativeEnergy: number }> = {};

    data.forEach((reading: PowerReading) => {
      const period = `${new Date(reading.start_date as string).toLocaleDateString()} - ${new Date(reading.end_date as string).toLocaleDateString()}`;
      if (!groupedData[period]) {
        groupedData[period] = { name: period, series: [], cumulativeEnergy: 0 };
      }

      const readingDate = new Date(reading.reading_timestamp as string);
      const dayLabel = `Day ${readingDate.getDate()}`;

      // Convert Watts to kWh for each reading
      const energy = reading.power / 1000;

      // Accumulate energy for the current day
      groupedData[period].cumulativeEnergy += energy;

      // Find or create the series item for the day
      let daySeries = groupedData[period].series.find(s => s.name === dayLabel);
      if (!daySeries) {
        daySeries = { name: dayLabel, value: groupedData[period].cumulativeEnergy };
        groupedData[period].series.push(daySeries);
      } else {
        // Update the cumulative value for the day
        daySeries.value = groupedData[period].cumulativeEnergy;
      }
    });

    // Format the output
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

  onEditDetailsClick(device_id: number) {
    this.dataApiService.getDevice(device_id).subscribe({
      next: (data) => {
        this.dialogService.openEditDeviceDialog(data).subscribe(result => {
          if (result) {
            this.dataApiService.updateDevice(device_id, result.deviceCategory, result.deviceType, result.deviceName, result.alertEnergyThreshold, result.alertPowerThreshold, result.usageFrequency, result.customPowerMin, result.customPowerMax).subscribe({
              next: (data) => {
                this.output.result = 'success';
                this.output.message = data.message;
                this.alertService.showSnackBar(this.output.message);
                this.loadDeviceDetail(device_id);
                this.loadDeviceConsumption(device_id);
                this.alertService.loadAlerts();
              },
              error: (error) => {
                this.alertService.showSnackBar("An error occured!");
                console.log(error);
              }
            })
          } else {
            this.alertService.showSnackBar("Editing of current device cancelled!");
          }
        });
      },
      error: (error) => {
        console.log('Error fetching device:', error);
        this.alertService.showSnackBar("Failed to fetch device details.");
      }
    })
  }

  onAddNewConsumption(device_id: number) {
    this.dialogService.openNewConsumptionDialog().subscribe(result => {
      if (result) {
        this.dialogService.openImportDialog([]).subscribe(result => { });
        this.dialogService.updateMessages([{ text: "Batch importing data from files...", showSpinner: true, showCheckIcon: false }]);
        this.dataApiService.addConsumptionPowerReadings(device_id, result.startDate, result.endDate, result.durationDays).subscribe({
          next: (data) => {
            this.dialogService.updateMessages([{ text: "Analyzing imported data...", showSpinner: true, showCheckIcon: false }]);

            // Create an array of observables for each consumption_id analysis
            const analysisObservables = data.consumption_ids.map((consumption_id: number) =>
              this.dataApiService.getPeakPowerAnalysis(consumption_id)
            );

            // Use forkJoin to wait for all observables to complete
            forkJoin(analysisObservables).subscribe({
              next: (analysisDataArray) => {
                // Aanalyses are completed
                this.alertService.loadAlerts();
                this.alertService.loadDeviceAlerts(device_id);
                this.loadDeviceDetail(device_id);
                this.output.result = 'success';
                this.output.message = data.message;
                this.alertService.showSnackBar(this.output.message);
                this.loadDeviceConsumption(device_id);
                this.loadDevicePowerReadings(device_id);
                this.dialogService.updateMessages([{ text: "Data import and analysis complete!", showSpinner: false, showCheckIcon: true }]);
              },
              error: (error) => {
                this.alertService.showSnackBar("An error occurred in analysis!");
                console.log(error);
              }
            });

          },
          error: (error) => {
            this.alertService.showSnackBar("An error occurred!");
            console.log(error);
          }
        });
      } else {
        console.log("Addition of new consumption log cancelled!")
      }
    });
  }

  onClearDeviceConsumption(device_id: number) {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = '600px';
    dialogConfig.data = { title: 'Device Consumption Deletion', content: 'This will clear all consumption records associated with your device.' }
    const dialogRef = this.matDialog.open(BasicDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe({
      next: (result) => {
        if (result === true) {
          this.dataApiService.removeAllDeviceConsumption(device_id).subscribe({
            next: (data) => {
              this.output.result = 'success';
              this.output.message = data.message;
              this.alertService.showSnackBar(this.output.message);
              this.loadDeviceConsumption(device_id);
              this.loadDevicePowerReadings(device_id);
              this.alertService.loadAlerts();
              this.alertService.loadDeviceAlerts(device_id);
              this.loadDeviceDetail(device_id);
            },
            error: (error) => {
              this.alertService.showSnackBar("An error occurred!");
              console.log(error);
            }
          })
        } else {
          this.alertService.showSnackBar("Device alerts deletion was cancelled!");
        }
      },
      error: (error) => {
        this.alertService.showSnackBar("An error occurred!");
      }
    });
  }

  onConsumptionRowClick(row: any) {
    this.selectedStartDate = row.start_date;
    this.selectedEndDate = row.end_date;

    this.dataApiService.getConsumptionPowerReadings(row.consumption_id).subscribe({
      next: (data: any[]) => {
        let cumulativeEnergy = 0;

        this.chartEnergyYAxisMax = this.getChartEnergyYAxisMaxValue(row.energy_max);
        this.chartYAxisMin = this.getChartYAxisMaxValue(row.power_max);

        // Prepare data for power readings chart
        this.consumption_readings = [
          {
            name: 'Power Readings',
            series: data.map(item => ({
              name: new Date(item.reading_timestamp),
              value: item.power as number,
            }))
          }
        ];

        // Prepare data for cumulative energy chart
        this.consumption_energy = [
          {
            name: 'Cumulative Energy',
            series: data.map(item => {
              const readingTimestamp = new Date(item.reading_timestamp);

              // Convert power in Watts to kWh (assuming each reading is for one hour)
              const energyInKwh = item.power / 1000;

              // Accumulate energy
              cumulativeEnergy += energyInKwh;

              return {
                name: readingTimestamp,
                value: cumulativeEnergy
              };
            })
          }
        ];

        if (this.timelineChartPower) {
          this.timelineChartPower.filteredDomain = null;
        }
        if (this.timelineChartEnergy) {
          this.timelineChartEnergy.filteredDomain = null;
        }
      },
      error: (error) => {
        console.error(error);
      }
    });
  }

  onDownloadConsumptionData(device_id: number, device_name: string) {
    this.dataApiService.downloadAllConsumptionPowerReadings(device_id).subscribe({
      next: (blob) => {
        const sanitizedDeviceName = device_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `data_downloaded_${sanitizedDeviceName}.xlsx`;

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Download error:', error);
        this.alertService.showSnackBar("Failed to download the file.");
      },
      complete: () => {
        this.alertService.showSnackBar("File download complete.");
      },
    });
  }

  onConsumptionRowDownloadButtonClick(event: MouseEvent, consumption_id: number, filename: string) {
    event.stopPropagation();
    this.dataApiService.downloadConsumptionPowerReadings(consumption_id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Download error:', error);
        this.alertService.showSnackBar("Failed to download the file.");
      },
      complete: () => {
        this.alertService.showSnackBar("File download complete.");
      },
    });
  }

  onConsumptionRowDeleteButtonClick(event: MouseEvent, consumption_id: number) {
    event.stopPropagation();
    this.dataApiService.removeConsumption(consumption_id).subscribe({
      next: (data) => {
        this.output.result = 'success';
        this.output.message = data.message;
        this.alertService.showSnackBar(this.output.message);
        const device_id = this.details[0]?.id;
        this.loadDeviceConsumption(device_id);
        this.loadDevicePowerReadings(device_id);
        this.alertService.loadAlerts();
        this.alertService.loadDeviceAlerts(device_id);
        this.loadDeviceDetail(device_id);
      },
      error: (error) => {
        this.alertService.showSnackBar("An error occurred!");
      }
    });
  }

  onAlertRowDeleteButtonClick(event: MouseEvent, alert_id: number) {
    event.stopPropagation();
    const device_id = this.details[0]?.id;
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = '600px';
    dialogConfig.data = { title: 'Alert Deletion', content: 'This will delete the selected alert.' }
    const dialogRef = this.matDialog.open(BasicDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe({
      next: (result) => {
        if (result === true) {
          this.alertService.removeAlert(device_id, alert_id);
          this.loadDeviceDetail(device_id);
        } else {
          this.alertService.showSnackBar("Alerts deletion was cancelled!");
        }
      },
      error: (error) => {
        this.alertService.showSnackBar("An error occurred!");
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
          this.loadDeviceDetail(device_id);
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

  setPowerReadingsChartType(aggregationType: 'sum' | 'average' | 'none') {
    this.aggregation = aggregationType;
  }

  setPanelOpenState(state: boolean) {
    this.panelOpenState = state;
  }

  getPanelOpenState(): boolean {
    return this.panelOpenState;
  }

  getUnreadAlertsCount(): number {
    return this.alerts.filter(alert => alert.read_status === 'N').length;
  }

  getHighestPowerPeak(): number {
    if (this.consumptions && this.consumptions.length > 0) {
      return Math.max(...this.consumptions.map(consumption => consumption.power_max));
    } else {
      return 0;
    }
  }

  getConsumptionEnergyMax(): number {
    if (this.consumptions && this.consumptions.length > 0) {
      return Math.max(...this.consumptions.map(consumption => consumption.energy_max));
    } else {
      return 0;
    }
  }

  // Detail Customization
  getDeviceDisplayIcon(type: string): string {
    switch (type) {
      case 'Cooling': return 'ac_unit';
      case 'Kitchen': return 'kitchen';
      case 'Multimedia': return 'devices_other';
      case 'Other': return 'device_unknown';
      case 'Washing': return 'local_laundry_service';
      default: return 'device_unknown';
    }
  }

  // Alert Table Customization
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

  // Consumption Table Power Draw Customization
  getTypeClassPower(powerPeak: number): string {
    let type = '';
    let warn_threshold = 0;

    const custom_power_min = this.details[0]?.custom_power_min;
    const custom_power_max = this.details[0]?.custom_power_max;
    const power_alert_threshold = this.details[0]?.power_alert_threshold;
    const default_warning_threshold_percentage = 0.02; // 2%

    if (power_alert_threshold == 0) {
      const power_range = custom_power_max - custom_power_min;
      const adjusted_threshold_percentage = default_warning_threshold_percentage * (power_range / custom_power_max);
      warn_threshold = custom_power_max * (1 - adjusted_threshold_percentage);
      warn_threshold = Math.max(custom_power_min, warn_threshold);
    } else {
      warn_threshold = power_alert_threshold;
    }

    if (powerPeak > custom_power_max) {
      type = 'critical';
    } else if (powerPeak >= warn_threshold && powerPeak <= custom_power_max) {
      type = (custom_power_min == custom_power_max) ? 'normal' : 'warning';
    } else {
      type = 'normal';
    }

    switch (type) {
      case 'normal': return 'good-type';
      case 'warning': return 'warning-type';
      case 'critical': return 'critical-type';
      default: return '';
    }
  }

  getTypeIconPower(powerPeak: number): string {
    let type = '';
    let warn_threshold = 0;

    const custom_power_min = this.details[0]?.custom_power_min;
    const custom_power_max = this.details[0]?.custom_power_max;
    const power_alert_threshold = this.details[0]?.power_alert_threshold;
    const default_warning_threshold_percentage = 0.02; // 2%

    if (power_alert_threshold == 0) {
      const power_range = custom_power_max - custom_power_min;
      const adjusted_threshold_percentage = default_warning_threshold_percentage * (power_range / custom_power_max);
      warn_threshold = custom_power_max * (1 - adjusted_threshold_percentage);
      warn_threshold = Math.max(custom_power_min, warn_threshold);
    } else {
      warn_threshold = power_alert_threshold;
    }

    if (powerPeak > custom_power_max) {
      type = 'critical';
    } else if (powerPeak >= warn_threshold && powerPeak <= custom_power_max) {
      type = (custom_power_min == custom_power_max) ? 'normal' : 'warning';
    } else {
      type = 'normal';
    }

    switch (type) {
      case 'normal': return 'check_circle';
      case 'warning': return 'warning';
      case 'critical': return 'cancel';
      default: return type;
    }
  }

  // Consumption Table Energy Consumption Customization
  getTypeClassEnergy(energyConsumption: number): string {
    let type = '';

    const energy_alert_threshold = this.details[0]?.energy_alert_threshold;
    if (energy_alert_threshold == 0) {
      type = 'info'
    } else {
      if ((energyConsumption >= energy_alert_threshold) && (energyConsumption < (energy_alert_threshold * 2))) {
        type = 'warning'
      } else if (energyConsumption >= (energy_alert_threshold * 2)) {
        type = 'critical'
      } else {
        type = 'normal'
      }
    }

    switch (type) {
      case 'info': return 'informational-type';
      case 'normal': return 'good-type';
      case 'warning': return 'warning-type';
      case 'critical': return 'critical-type';
      default: return '';
    }
  }

  getTypeIconEnergy(energyConsumption: number): string {
    let type = '';

    const energy_alert_threshold = this.details[0]?.energy_alert_threshold;
    if (energy_alert_threshold == 0) {
      type = 'info'
    } else {
      if ((energyConsumption >= energy_alert_threshold) && (energyConsumption < (energy_alert_threshold * 2))) {
        type = 'warning'
      } else if (energyConsumption >= (energy_alert_threshold * 2)) {
        type = 'critical'
      } else {
        type = 'normal'
      }
    }

    switch (type) {
      case 'info': return 'info';
      case 'normal': return 'check_circle';
      case 'warning': return 'warning';
      case 'critical': return 'cancel';
      default: return type;
    }
  }

  // Add a 10% margin to yAxisMax for better visual clarity of peaks
  getChartYAxisMaxValue(current_consumption_peak: number): number {
    if (this.details && this.details[0]) {
      let yAxisMaxValue = 0;

      if (current_consumption_peak > this.details[0].custom_power_max) {
        yAxisMaxValue = current_consumption_peak + (0.1 * current_consumption_peak);
      } else {
        yAxisMaxValue = this.details[0].custom_power_max + (0.1 * this.details[0].custom_power_max);
      }

      return yAxisMaxValue;
    } else {
      return current_consumption_peak;
    }
  }

  getChartEnergyYAxisMaxValue(current_consumption_energy_max: number): number {
    if (this.details && this.details[0]) {
      let yAxisEnergyMaxValue = 0;

      if (this.details[0].energy_alert_threshold == 0) {
        yAxisEnergyMaxValue = current_consumption_energy_max + (0.1 * current_consumption_energy_max);
      } else {
        if (this.details[0].energy_alert_threshold > current_consumption_energy_max) {
          yAxisEnergyMaxValue = this.details[0].energy_alert_threshold + (0.1 * this.details[0].energy_alert_threshold);
        } else {
          yAxisEnergyMaxValue = current_consumption_energy_max + (0.1 * current_consumption_energy_max);

        }
      }

      return yAxisEnergyMaxValue;
    } else {
      return current_consumption_energy_max;
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
  start_date: string | Date;
  end_date: string | Date;
  reading_timestamp: string | Date;
  power: number;
}

interface SeriesItem {
  name: string;
  value: number;
  count?: number;
}

interface GroupedDataItem {
  name: string;
  series: SeriesItem[];
  startDate: Date;
}

interface Output {
  result: string;
  message: string;
}