import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Route, Router } from '@angular/router';
import { AlertService } from 'src/app/service/alert.service';
import { AuthenticationService } from 'src/app/service/authentication.service';
import { DataApiService } from 'src/app/service/data-api.service';
import { DialogRef } from '@angular/cdk/dialog';
import { DialogService } from 'src/app/service/dialog.service';

import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { BasicDialogComponent } from 'src/app/dialog/basic-dialog/basic-dialog.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'devices',
  templateUrl: './devices.component.html',
  styleUrls: ['./devices.component.scss']
})

export class DevicesComponent implements OnInit {
  devices: any[];
  consumptions: any[];
  alerts: any[];
  devicesByCategory: { [category: string]: any[] } = {};
  filterText: string = '';
  filteredDevicesByCategory: { [category: string]: any[] } = {};
  dialogRef!: DialogRef;
  panelOpenState: boolean = false;
  deviceConfigurationChanged: boolean = false;
  output: Output;

  constructor(private dataApiService: DataApiService, private alertService: AlertService, private router: Router, private dialogService: DialogService, private matDialog: MatDialog) {
    this.devices = [];
    this.consumptions = [];
    this.alerts = [];
    this.output = { result: '', message: '' };
  }

  ngOnInit(): void {
    this.loadDevices();
  }

  setPanelOpenState(state: boolean) {
    this.panelOpenState = state;
  }

  getPanelOpenState(): boolean {
    return this.panelOpenState;
  }

  groupDevicesByCategory() {
    this.devicesByCategory = this.devices.reduce((acc, device) => {
      if (!acc[device.device_category]) {
        acc[device.device_category] = [];
      }
      acc[device.device_category].push(device);
      return acc;
    }, {});
  }

  getCategoryIcon(category: string): string {
    const categoryIcons: { [key: string]: string } = {
      Multimedia: 'devices_other',
      Cooling: 'ac_unit',
      Washing: 'local_laundry_service',
      Kitchen: 'kitchen',
      Other: 'device_unknown'
    };
    return categoryIcons[category] || 'device_unknown';
  }

  loadDevices() {
    this.dataApiService.getDevices().subscribe({
      next: (data) => {
        this.devices = data;
        this.groupDevicesByCategory();
        this.filteredDevicesByCategory = { ...this.devicesByCategory };
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
      },
      error: (error) => {
        console.log(error);
      }
    });
  }

  onAddNewDevice() {
    this.dialogService.openNewDeviceDialog().subscribe(result => {
      if (result) {
        this.dataApiService.addDevice(result.deviceCategory, result.deviceType, result.deviceName, result.alertEnergyThreshold, result.alertPowerThreshold, result.usageFrequency, result.customPowerMin, result.customPowerMax).subscribe({
          next: (data) => {
            this.output.result = 'success';
            this.output.message = data.message;
            this.alertService.showSnackBar(this.output.message);
            this.loadDevices();
            this.alertService.loadAlerts();
          },
          error: (error) => {
            this.alertService.showSnackBar("An error occured!");
            console.log(error);
          }
        })
      } else {
        this.alertService.showSnackBar("Addition of new device cancelled!");
      }
    });
  }

  onDeviceView(device_id: number) {
    this.router.navigate(['/device-detail', device_id]);
  }

  onDeviceEdit(device_id: number) {
    this.loadDeviceConsumption(device_id);
    this.dataApiService.getDevice(device_id).subscribe({
      next: (data) => {
        this.dialogService.openEditDeviceDialog(data).subscribe(result => {
          if (result) {
            this.deviceConfigurationChanged = this.checkForDeviceChanges(result, device_id);
            this.dataApiService.updateDevice(device_id, result.deviceCategory, result.deviceType, result.deviceName, result.alertEnergyThreshold, result.alertPowerThreshold, result.usageFrequency, result.customPowerMin, result.customPowerMax).subscribe({
              next: (data) => {
                if (this.deviceConfigurationChanged && this.consumptions.length > 0) {
                  this.alertService.removeDeviceAlerts(device_id);
                  this.dialogService.openImportDialog([]).subscribe(result => { });
                  this.dialogService.updateMessages([{ text: "Re-analyzing consumption data...", showSpinner: true, showCheckIcon: false }]);
                  // Create an array of observables for each consumption_id analysis
                  const analysisObservables = this.consumptions.map((consumption: any) =>
                    this.dataApiService.getPeakPowerAnalysis(consumption.consumption_id)
                  );

                  // Use forkJoin to wait for all observables to complete
                  forkJoin(analysisObservables).subscribe({
                    next: (analysisDataArray) => {
                      // Analyses are completed
                      this.loadDevices();
                      this.alertService.loadAlerts();
                      this.alertService.loadDeviceAlerts(device_id);
                      this.output.result = 'success';
                      this.output.message = data.message;
                      this.alertService.showSnackBar(this.output.message);
                      this.dialogService.updateMessages([{ text: "Data re-analysis complete!", showSpinner: false, showCheckIcon: true }]);
                    },
                    error: (error) => {
                      this.alertService.showSnackBar("An error occurred in analysis!");
                      console.log(error);
                    }
                  });
                } else {
                  this.output.result = 'success';
                  this.output.message = data.message;
                  this.alertService.showSnackBar(this.output.message);
                  this.loadDevices();
                  this.alertService.loadAlerts();
                }
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

  onDeviceRemove(device_id: number) {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = '600px';
    dialogConfig.data = { title: 'Device Deletion', content: 'This will delete the device along with all consumption and alert records associated with it.' }
    this.dialogService.openDialog(BasicDialogComponent, dialogConfig).subscribe({
      next: (result) => {
        if (result === true) {
          this.dataApiService.removeDevice(device_id).subscribe({
            next: (data) => {
              this.output.result = 'success';
              this.output.message = data.message;
              this.alertService.showSnackBar(this.output.message);
              this.loadDevices();
              this.alertService.loadAlerts();
            },
            error: (error) => {
              console.log(error);
            }
          });
        } else {
          this.alertService.showSnackBar("Device deletion was cancelled!");
        }
      },
      error: (error) => {
        this.alertService.showSnackBar("An error occurred!");
      }
    });
  }

  onAddNewConsumption(event: MouseEvent, device_id: number) {
    event.stopPropagation();
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
                this.loadDevices();
                this.output.result = 'success';
                this.output.message = data.message;
                this.alertService.showSnackBar(this.output.message);
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

  async onAddNewConsumptionForAllDevices() {
    // Open the New Consumption Dialog once for all devices
    this.dialogService.openNewConsumptionDialog().subscribe(async result => {
      if (result) {
        // Open the import dialog for all devices
        this.dialogService.openImportDialog([]).subscribe(result => { });

        for (const device of this.devices) { // Assuming `this.devices` is your list of devices
          await this.processDeviceConsumptionForAll(device.id, result.startDate, result.endDate, result.durationDays);
        }

        // Once all devices are processed, display completion message
        this.dialogService.updateMessages([{ text: "Data import and analysis complete for all devices!", showSpinner: false, showCheckIcon: true }]);
      } else {
        console.log("Addition of new consumption log cancelled!");
      }
    });
  }

  processDeviceConsumptionForAll(device_id: number, startDate: string, endDate: string, durationDays: number) {
    return new Promise<void>((resolve, reject) => {
      // Update message for the current device
      this.dialogService.updateMessages([{ text: `Device ${device_id} - Batch importing data from files...`, showSpinner: true, showCheckIcon: false }]);

      this.dataApiService.addConsumptionPowerReadings(device_id, startDate, endDate, durationDays).subscribe({
        next: (data) => {
          this.dialogService.updateMessages([{ text: `Device ${device_id} - Analyzing imported data...`, showSpinner: true, showCheckIcon: false }]);

          // Create an array of observables for each consumption_id analysis
          const analysisObservables = data.consumption_ids.map((consumption_id: number) =>
            this.dataApiService.getPeakPowerAnalysis(consumption_id)
          );

          // Use forkJoin to wait for all observables to complete
          forkJoin(analysisObservables).subscribe({
            next: (analysisDataArray) => {
              // Analyses are completed
              this.alertService.loadAlerts();
              this.loadDevices();
              this.output.result = 'success';
              this.output.message = data.message;
              this.alertService.showSnackBar(this.output.message);
              this.dialogService.updateMessages([{ text: "Data import and analysis complete!", showSpinner: false, showCheckIcon: true }]);
              resolve();
            },
            error: (error) => {
              this.alertService.showSnackBar("An error occurred in analysis!");
              console.log(error);
              reject(error);
            }
          });
        },
        error: (error) => {
          this.alertService.showSnackBar("An error occurred!");
          console.log(error);
          reject(error);
        }
      });
    });
  }

  onClearConsumptionForAllDevices() {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = '600px';
    dialogConfig.data = { title: 'All Devices Consumption Deletion', content: 'This will clear all consumption records for all devices listed.' }
    const dialogRef = this.matDialog.open(BasicDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe({
      next: (result) => {
        if (result === true) {
          this.dataApiService.removeAllUserConsumption().subscribe({
            next: (data) => {
              this.output.result = 'success';
              this.output.message = data.message;
              this.alertService.showSnackBar(this.output.message);
              this.alertService.loadAlerts();
              this.loadDevices();
            }, error: (error) => {
              this.alertService.showSnackBar("An error occurred!");
              console.log(error);
            }
          })
        } else {
          this.alertService.showSnackBar("All devices consumption deletion was cancelled!");
        }
      },
      error: (error) => {
        this.alertService.showSnackBar("An error occurred!");
      }
    });
  }

  checkForDeviceChanges(result: any, device_id: number): boolean {
    const custom_power_min = (this.devices.find(d => d.id == device_id)).custom_power_min;
    const custom_power_max = (this.devices.find(d => d.id == device_id)).custom_power_max;
    const power_alert_threshold = (this.devices.find(d => d.id == device_id)).power_alert_threshold;
    const energy_alert_threshold = (this.devices.find(d => d.id == device_id)).energy_alert_threshold;
    result.alertEnergyThreshold, result.alertPowerThreshold, result.usageFrequency, result.customPowerMin, result.customPowerMax
    if ((result.alertEnergyThreshold != energy_alert_threshold) || (result.alertPowerThreshold != power_alert_threshold) || (result.customPowerMin != custom_power_min) || (result.customPowerMax != custom_power_max)) {
      return true
    } else {
      return false
    }
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.filterText = filterValue.trim().toLowerCase();
    this.filterDevices();
  }

  filterDevices() {
    this.filteredDevicesByCategory = {};
    for (const category in this.devicesByCategory) {
      this.filteredDevicesByCategory[category] = this.devicesByCategory[category].filter(device =>
        device.device_name.toLowerCase().includes(this.filterText) ||
        device.device_type.toLowerCase().includes(this.filterText)
      );
    }
  }

  hasDevicesInCategory(category: string): boolean {
    return this.filteredDevicesByCategory[category]?.length > 0;
  }

  getTypeClassAlert(alert_level: string) {
    switch (alert_level) {
      case 'info': return 'informational-type'
      case 'normal': return 'good-type';
      case 'warning': return 'warning-type';
      case 'critical': return 'critical-type';
      default: return 'good-type';
    }
  }

  getTypeIconAlert(alert_level: string): string {
    switch (alert_level) {
      case 'info': return 'info'
      case 'normal': return 'check_circle';
      case 'warning': return 'error';
      case 'critical': return 'cancel';
      default: return 'check_circle';
    }
  }

  getTypeTooltipAlert(alert_level: string): string {
    switch (alert_level) {
      case 'info': return 'Your device has informational alerts !'
      case 'normal': return 'Your device looks good !';
      case 'warning': return 'Your device has warning alerts !';
      case 'critical': return 'Your device has critical alerts !';
      default: return 'check_circle';
    }
  }
}

interface Output {
  result: string;
  message: string;
}
