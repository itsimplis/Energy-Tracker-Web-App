import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Color, LegendPosition, ScaleType } from '@swimlane/ngx-charts';
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
  averagePowerCategoryGrouped: any[];
  averagePowerTypeGrouped: any[];
  averagePowerConsumptionAgeGroup: any[];
  averagePowerConsumptionGender: any[];
  highestReadings: any[];
  lowestReadings: any[];
  globalTopTenAveragePower: any[];
  userTotalPowerPerCategory: any[];
  userTotalUsagePerCategory: any[];
  chartTotalType: string = 'deviceTotal';
  chartAverageType: string = 'deviceAverage';

  constructor(private dataApiService: DataApiService, private router: Router) {
    this.counters = [];
    this.totalPower = [];
    this.totalPowerCategoryGrouped = [];
    this.totalPowerTypeGrouped = [];
    this.averagePowerCategoryGrouped = [];
    this.averagePowerTypeGrouped = [];
    this.averagePowerConsumptionAgeGroup = [];
    this.averagePowerConsumptionGender = [];
    this.lowestReadings = [];
    this.highestReadings = [];
    this.globalTopTenAveragePower = [];
    this.userTotalPowerPerCategory = [];
    this.userTotalUsagePerCategory = [];
  }

  ngOnInit() {
    this.loadDashboardCounters();
    this.loadGlobalTopTenAveragePowerDrawDevices();
    this.loadTotalPowerConsumptionComparisonByCategory();
    this.loadTotalUsageComparisonByCategory();
    this.loadAveragePowerConsumptionByAgeGroup();
    this.loadAveragePowerConsumptionByGender();
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

  loadTotalPowerConsumptionComparisonByCategory() {
    this.dataApiService.getUserConsumptionComparisonByCategory().subscribe({
      next: (data) => {
        this.userTotalPowerPerCategory = data.map(item => ({
          "name": item.device_category,
          "series": [
            {
              "name": "You",
              "value": item.user_total_power_consumption
            },
            {
              "name": "Other Users",
              "value": item.average_other_users_power_consumption
            }
          ]
        }));
      },
      error: (error) => {
        console.log(error);
      }
    });
  }

  loadTotalUsageComparisonByCategory() {
    this.dataApiService.getUserUsageComparisonByCategory().subscribe({
      next: (data) => {
        this.userTotalUsagePerCategory = data.map(item => ({
          "name": item.device_category,
          "series": [
            {
              "name": "You",
              "value": item.user_total_usage_hours
            },
            {
              "name": "Other Users",
              "value": item.average_other_users_usage_hours
            }
          ]
        }));
      },
      error: (error) => {
        console.log(error);
      }
    });
  }

  loadAveragePowerConsumptionByAgeGroup() {
    this.dataApiService.getAveragePowerConsumptionByAgeGroup().subscribe({
      next: (data) => {
        this.averagePowerConsumptionAgeGroup = data.map(item => ({
          "name": item.age_group,
          "value": item.average_total_power_consumption
        }));
      },
      error: (error) => {
        console.log(error);
      }
    });
  }

  loadAveragePowerConsumptionByGender() {
    this.dataApiService.getAveragePowerConsumptionByGender().subscribe({
      next: (data) => {
        this.averagePowerConsumptionGender = data.map(item => ({
          "name": item.gender,
          "value": item.average_total_power_consumption
        }));
      },
      error: (error) => {
        console.log(error);
      }
    });
  }

  loadGlobalTopTenAveragePowerDrawDevices() {
    this.dataApiService.getTopTenDevicesByPowerDraw().subscribe({
      next: (data) => {
        const formattedData = data.map(item => ({
          name: item.device_name,
          value: item.average_power_draw
        }));
  
        this.globalTopTenAveragePower = formattedData;
      },
      error: (error) => {
        console.log('Error loading top ten devices by power draw:', error);
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

  public valueFormat(dataItem: any): string {
    return dataItem.value.toFixed(2) + " W";
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
