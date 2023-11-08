import { Component, OnInit } from '@angular/core';
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

  constructor(private dataApiService: DataApiService, private authenticationService: AuthenticationService) {
    this.devices = [];
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
      other: 'device_unknown' // Assuming you want to use this for 'other'
    };
    return categoryIcons[category.toLowerCase()] || 'device_unknown';
  }

  ngOnInit(): void {
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
}
