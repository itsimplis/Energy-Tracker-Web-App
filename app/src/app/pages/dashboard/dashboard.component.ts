import { Component, OnInit } from '@angular/core';
import { Color, ScaleType } from '@swimlane/ngx-charts';
import { DataApiService } from 'src/app/service/data-api.service';

@Component({
  selector: 'dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  counters: any[];
  totalPower: any[];

  constructor(private dataApiService: DataApiService) {
    this.counters = [];
    this.totalPower = [];
  }

  ngOnInit() {
    this.loadDashboardCounters();
    this.loadTotalPowerPerDevice();
  }

  loadDashboardCounters() {
    this.dataApiService.getDashboardCounters().subscribe({
      next: (data) => {
        this.counters = data;
      },
      error: (error) => {
        console.log(error);
      }
    });
  }

  loadTotalPowerPerDevice() {
    this.dataApiService.getTotalPowerPerDevice().subscribe({
      next: (data) => {
        this.totalPower = data.map(device => ({
          name: device.device_name,
          value: device.total_power,
          extra: {
            code: device.device_id
          }
        }));
      },
      error: (error) => {
        console.log(error);
      }
    });
  }

  colorScheme: Color = {
    name: 'custom',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#009dff', '#00d089', '#00b8e5']
  };
}
