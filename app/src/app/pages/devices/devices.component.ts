import { Component, OnInit } from '@angular/core';
import { Route, Router } from '@angular/router';
import { AlertService } from 'src/app/service/alert.service';
import { AuthenticationService } from 'src/app/service/authentication.service';
import { DataApiService } from 'src/app/service/data-api.service';
import { DialogRef } from '@angular/cdk/dialog';
import { DialogService } from 'src/app/service/dialog.service';
import { MatDialogConfig } from '@angular/material/dialog';
import { BasicDialogComponent } from 'src/app/dialog/basic-dialog/basic-dialog.component';

@Component({
  selector: 'devices',
  templateUrl: './devices.component.html',
  styleUrls: ['./devices.component.scss']
})

export class DevicesComponent implements OnInit {
  devices: any[];
  devicesByCategory: { [category: string]: any[] } = {};
  filterText: string = '';
  filteredDevicesByCategory: { [category: string]: any[] } = {};
  dialogRef!: DialogRef;
  panelOpenState: boolean = false;
  output: Output;

  constructor(private dataApiService: DataApiService, private authenticationService: AuthenticationService, private alertService: AlertService, private router: Router, private dialogService: DialogService) {
    this.devices = [];
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
        this.filteredDevicesByCategory = {...this.devicesByCategory};
      },
      error: (error) => {
        console.log(error);
      }
    });
  }

  onAddNewDevice() {
    this.dialogService.openNewDeviceDialog().subscribe(result => {
      if (result) {
        this.dataApiService.addDevice(result.deviceCategory, result.deviceType, result.deviceName, result.alertThresholdHigh / 100, result.alertThresholdLow / 100, result.usageFrequency).subscribe({
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
    // To do...
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
}

interface Output {
  result: string;
  message: string;
}
