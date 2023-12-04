import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
  totalPowerGrouped: any[];
  highestReadings: any[];
  showGroupedChart: boolean = false;

  constructor(private dataApiService: DataApiService, private router: Router) {
    this.counters = [];
    this.totalPower = [];
    this.totalPowerGrouped = [];
    this.highestReadings = [];
  }

  ngOnInit() {
    this.loadDashboardCounters();
    this.loadTotalPowerPerDevice(false);
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

  loadTotalPowerPerDevice(grouped: boolean, groupBy: string = '') {
    this.dataApiService.getTotalPowerPerDevice().subscribe({
      next: (data: DeviceData[]) => {
        if (grouped) {
          const groupedData = this.groupDataBy(groupBy, data);
          this.totalPowerGrouped = Object.keys(groupedData).map(category => ({
            name: category,
            series: groupedData[category]
          }));
        } else {
          this.totalPower = data.map(device => ({
            name: device.device_name,
            value: device.total_power,
            extra: {
              code: device.device_id
            }
          }));
        }

        const maxPowerDevice = this.findMaxPowerDevice(data);
        if (maxPowerDevice) {
          this.loadPowerReadingsOfHighestDevice(maxPowerDevice);
        }

      },
      error: (error) => {
        console.log(error);
      }
    });
  }

  loadPowerReadingsOfHighestDevice(device: DeviceData) {
    this.dataApiService.getDevicePowerReadings(device.device_id).subscribe({
      next: (data: any[]) => {
        this.highestReadings = [
          {
            name: device.device_name,
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

  // Group data by either device category or device type
  private groupDataBy(groupBy: string, data: DeviceData[]): Record<string, { name: string; value: number; extra: { code: number } }[]> {
    const groupedData: Record<string, { name: string; value: number; extra: { code: number } }[]> = {};
    var group = '';

    data.forEach(device => {
      if (groupBy == 'category') {
        group = device.device_category;
      }
      if (groupBy == 'type') {
        group = device.device_type;
      }

      if (!groupedData[group]) {
        groupedData[group] = [];
      }
      groupedData[group].push({
        name: device.device_name,
        value: device.total_power,
        extra: { code: device.device_id }
      });
    });

    return groupedData;
  }

  // Find the device with the highest total power consumption
  findMaxPowerDevice(data: DeviceData[]) {
    if (data.length === 0) return null;

    return data.reduce((prev: DeviceData, current: DeviceData) =>
      (prev.total_power > current.total_power) ? prev : current
    );
  }

  setChartType(grouped: boolean, groupBy: string = '') {
    this.showGroupedChart = grouped;
    this.loadTotalPowerPerDevice(grouped, groupBy);
  }

  onChartDeviceSelect(data: any) {
    this.router.navigate(['/device-detail', data.extra.code]);
  }
}

interface DeviceData {
  device_id: number;
  device_name: string;
  device_category: string;
  device_type: string;
  total_power: number;
}
