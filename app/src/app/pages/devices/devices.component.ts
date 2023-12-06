import { Component, OnInit } from '@angular/core';
import { Route, Router } from '@angular/router';
import { AlertService } from 'src/app/service/alert.service';
import { AuthenticationService } from 'src/app/service/authentication.service';
import { DataApiService } from 'src/app/service/data-api.service';
import { DialogRef } from '@angular/cdk/dialog';
import { DialogService } from 'src/app/service/dialog.service';


@Component({
  selector: 'devices',
  templateUrl: './devices.component.html',
  styleUrls: ['./devices.component.scss']
})

export class DevicesComponent implements OnInit {
  devices: any[];
  devicesByCategory: { [category: string]: any[] } = {};
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
            console.log(error);
          }
        })
      } else {
        console.log("Addition of new device cancelled!");
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
  }

}

interface Output {
  result: string;
  message: string;
}
