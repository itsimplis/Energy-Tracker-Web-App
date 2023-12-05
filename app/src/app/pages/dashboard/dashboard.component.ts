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
  totalPowerDistribution: any[];
  totalPowerCategoryGrouped: any[];
  totalPowerTypeGrouped: any[];
  highestReadings: any[];
  lowestReadings: any[];
  chartType: string = 'device';

  constructor(private dataApiService: DataApiService, private router: Router) {
    this.counters = [];
    this.totalPower = [];
    this.totalPowerDistribution = [];
    this.totalPowerCategoryGrouped = [];
    this.totalPowerTypeGrouped = [];
    this.lowestReadings = [];
    this.highestReadings = [];
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
      next: (data: DeviceData[]) => {
        const categoryGroupedData = this.groupDataBy('category', data);
        const typeGroupedData = this.groupDataBy('type', data);

        this.totalPowerCategoryGrouped = Object.keys(categoryGroupedData).map(category => ({
          name: category,
          series: categoryGroupedData[category]
        }));
        this.totalPowerTypeGrouped = Object.keys(typeGroupedData).map(type => ({
          name: type,
          series: typeGroupedData[type]
        }));
        this.totalPower = data.map(device => ({
          name: device.device_name,
          value: device.total_power,
          extra: {
            code: device.device_id
          }
        }));
        this.totalPowerDistribution = Object.keys(categoryGroupedData).map(category => {
          const totalPower = categoryGroupedData[category].reduce((acc, curr) => acc + curr.value, 0);
          console.log(totalPower);
          return {
            name: category,
            value: totalPower
          }});
          

        const maxPowerDevice = this.findMaxPowerDevice(data);
        const minPowerDevice = this.findMinPowerDevice(data);

        if (maxPowerDevice) {
          this.loadPowerReadingsOfHighestDevice(maxPowerDevice);
        }
        if (minPowerDevice) {
          this.loadPowerReadingsOfLowestDevice(minPowerDevice);
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
              value: item.power as number,
              extra: {
                code: device.device_id
              }
            }))
          }
        ];
      },
      error: (error) => {
        console.error(error);
      }
    });
  }

  loadPowerReadingsOfLowestDevice(device: DeviceData) {
    this.dataApiService.getDevicePowerReadings(device.device_id).subscribe({
      next: (data: any[]) => {
        this.lowestReadings = [
          {
            name: device.device_name,
            series: data.map(item => ({
              name: new Date(item.reading_timestamp as string),
              value: item.power as number,
              extra: {
                code: device.device_id
              }
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

  // Find the device with the lowest total power consumption
  findMinPowerDevice(data: DeviceData[]) {
    if (data.length === 0) return null;

    return data.reduce((prev: DeviceData, current: DeviceData) =>
      (prev.total_power < current.total_power) ? prev : current
    );
  }

  setChartType(groupBy: string = 'device') {
    this.chartType = groupBy;
  }

  onChartDeviceSelect(data: any) {
    this.router.navigate(['/device-detail', data.extra.code]);
  }

  public formatDistribution(dataItem: any): string {
    let value = dataItem.value;
    // Formats the number with thousand separators
    let formattedValue = value.toLocaleString('de-DE');
    return formattedValue + ' W';
  }
}

interface DeviceData {
  device_id: number;
  device_name: string;
  device_category: string;
  device_type: string;
  total_power: number;
}
