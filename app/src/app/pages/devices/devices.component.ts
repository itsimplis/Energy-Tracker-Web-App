import { Component, OnInit } from '@angular/core';
import { AlertService } from 'src/app/service/alert.service';
import { AuthenticationService } from 'src/app/service/authentication.service';
import { DataApiService } from 'src/app/service/data-api.service';

@Component({
  selector: 'devices',
  templateUrl: './devices.component.html',
  styleUrls: ['./devices.component.scss']
})

export class DevicesComponent implements OnInit {
  devices: any[];
  devicesByCategory: { [category: string]: any[] } = {};
  panelOpenState: boolean = false;
  output: Output;

  constructor(private dataApiService: DataApiService, private authenticationService: AuthenticationService, private alertService: AlertService) {
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
      multimedia: 'tv',
      cooling: 'ac_unit',
      washing: 'local_laundry_service',
      kitchen: 'kitchen',
      other: 'device_unknown'
    };
    return categoryIcons[category.toLowerCase()] || 'device_unknown';
  }

  loadDevices() {
    this.dataApiService.getDevices(this.authenticationService.getUserName()!).subscribe({
      next: (data) => {
        this.devices = data;
        this.groupDevicesByCategory();
      },
      error: (error) => {
        console.log(error);
      }
    });
  }

  onDeviceView(device_id: number) {
    // To do...
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
