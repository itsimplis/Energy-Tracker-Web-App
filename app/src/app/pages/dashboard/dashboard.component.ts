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
  showGroupedChart: boolean = false;

  constructor(private dataApiService: DataApiService) {
    this.counters = [];
    this.totalPower = [];
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

  loadTotalPowerPerDevice(grouped: boolean) {
    this.dataApiService.getTotalPowerPerDevice().subscribe({
      next: (data: DeviceData[]) => { // Assuming DeviceData is an interface representing your device data
        if (grouped) {
          //const groupedData = this.groupDataByCategory(data);
          //console.log('Grouped Data:', groupedData);
          //this.totalPower = groupedData;
        }
        else {
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

  private groupDataByCategory(data: DeviceData[]): GroupedData[] {
    const groupedData: { [key: string]: ChartData[] } = {};
  
    data.forEach(device => {
      if (!groupedData[device.device_category]) {
        groupedData[device.device_category] = [];
      }
      groupedData[device.device_category].push({
        name: device.device_name,
        value: device.total_power,
        extra: { code: device.device_id }
      });
    });
  
    return Object.keys(groupedData).map(category => ({
      name: category,
      series: groupedData[category]
    }));
  }

  onPerDeviceClick() {
    this.showGroupedChart = false;
    this.loadTotalPowerPerDevice(this.showGroupedChart);
  }

  onPerDeviceCategoryClick() {
    this.showGroupedChart = true;
    this.loadTotalPowerPerDevice(this.showGroupedChart);

  }

  colorScheme: Color = {
    name: 'custom',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#009dff', '#00d089', '#00b8e5']
  };
}

interface DeviceData {
  device_id: number;
  device_name: string;
  device_category: string;
  device_type: string;
  total_power: number;
}

interface ChartData {
  name: string;
  value: number;
  extra: {
    code: number;
  };
}

interface GroupedData {
  name: string;
  series: ChartData[];
}
