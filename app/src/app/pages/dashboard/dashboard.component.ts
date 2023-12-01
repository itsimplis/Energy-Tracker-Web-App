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
  totalPowerGrouped: any[];
  showGroupedChart: boolean = false;

  constructor(private dataApiService: DataApiService) {
    this.counters = [];
    this.totalPower = [];
    this.totalPowerGrouped = [];
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
      },
      error: (error) => {
        console.log(error);
      }
    });
  }

  private groupDataBy(groupBy: string ,data: DeviceData[]): Record<string, { name: string; value: number; extra: { code: number } }[]> {
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

  setChartType(grouped: boolean, groupBy: string = '') {
    this.showGroupedChart = grouped;
    this.loadTotalPowerPerDevice(grouped, groupBy);
  }
}

interface DeviceData {
  device_id: number;
  device_name: string;
  device_category: string;
  device_type: string;
  total_power: number;
}
