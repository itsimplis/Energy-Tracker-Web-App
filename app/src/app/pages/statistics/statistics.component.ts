import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Color, ScaleType } from '@swimlane/ngx-charts';
import { DataApiService } from 'src/app/service/data-api.service';

@Component({
  selector: 'statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss']
})
export class StatisticsComponent {

  counters: any[];
  totalPower: any[];
  totalPowerCategoryGrouped: any[];
  totalPowerTypeGrouped: any[];
  averagePower: any[];
  averagePowerCategoryGrouped: any[];
  averagePowerTypeGrouped: any[];
  highestReadings: any[];
  lowestReadings: any[];
  chartTotalType: string = 'deviceTotal';
  chartAverageType: string = 'deviceAverage';

  constructor(private dataApiService: DataApiService, private router: Router) {
    this.counters = [];
    this.totalPower = [];
    this.totalPowerCategoryGrouped = [];
    this.totalPowerTypeGrouped = [];
    this.averagePower = [];
    this.averagePowerCategoryGrouped = [];
    this.averagePowerTypeGrouped = [];
    this.lowestReadings = [];
    this.highestReadings = [];
  }

  ngOnInit() {
    this.loadDashboardCounters();
    this.loadAveragePowerPerDevice();
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

  loadAveragePowerPerDevice() {
    this.dataApiService.getAveragePowerPerDevice().subscribe({
      next: (data: DeviceData[]) => {
        const categoryGroupedData = this.groupDataBy('category','average', data);
        const typeGroupedData = this.groupDataBy('type','average', data);

        this.averagePowerCategoryGrouped = Object.keys(categoryGroupedData).map(category => ({
          name: category,
          series: categoryGroupedData[category]
        }));
        this.averagePowerTypeGrouped = Object.keys(typeGroupedData).map(type => ({
          name: type,
          series: typeGroupedData[type]
        }));
        this.averagePower = data.map(device => ({
          name: device.device_name,
          value: device.average_power,
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

  loadTotalPowerPerDevice() {
    this.dataApiService.getTotalPowerPerDevice().subscribe({
      next: (data: DeviceData[]) => {
        const categoryGroupedData = this.groupDataBy('category','total', data);
        const typeGroupedData = this.groupDataBy('type','total', data);

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
  private groupDataBy(groupBy: string, chart: string, data: DeviceData[]): Record<string, { name: string; value: number; extra: { code: number } }[]> {
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
      if (chart == 'total') {
        groupedData[group].push({
          name: device.device_name,
          value: device.total_power,
          extra: { code: device.device_id }
        });
      }
      if (chart == 'average') {
        groupedData[group].push({
          name: device.device_name,
          value: device.average_power,
          extra: { code: device.device_id }
        });
      }
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

  setTotalChartType(groupBy: string = 'deviceTotal') {
    this.chartTotalType = groupBy;
  }

  setAverageChartType(groupBy: string = 'deviceAverage') {
    this.chartAverageType = groupBy;
  }

  onChartDeviceSelect(data: any) {
    this.router.navigate(['/device-detail', data.extra.code]);
  }

  public formatDistribution(dataItem: any): string {
    let value = dataItem.name;
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
  average_power: number;
}
