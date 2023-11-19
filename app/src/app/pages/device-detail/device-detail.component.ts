import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { DataApiService } from 'src/app/service/data-api.service';
import { DialogService } from 'src/app/service/dialog.service';

@Component({
  selector: 'app-device-detail',
  templateUrl: './device-detail.component.html',
  styleUrls: ['./device-detail.component.scss']
})
export class DeviceDetailComponent implements OnInit {

  private routeSubscription!: Subscription;
  private consumptions: any[];
  alerts: any[];
  panelOpenState: boolean = false;
  columnsConsumption: string[] = ['consumption_id', 'start_date', 'end_date', 'duration_days', 'files_names', 'power_max'];
  columnsAlert: string[] = ['title', 'description', 'type', 'read_status', 'date'];
  dataSourceConsumption!: MatTableDataSource<any[]>;
  dataSourceAlert!: MatTableDataSource<any[]>;

  @ViewChild('paginatorConsumptions', { static: true }) paginatorConsumptions!: MatPaginator;
  @ViewChild('sortConsumptions', { static: true }) sortConsumptions!: MatSort;
  @ViewChild('paginatorAlert', { static: true }) paginatorAlert!: MatPaginator;
  @ViewChild('sortAlert', { static: true }) sortAlert!: MatSort;

  constructor(private route: ActivatedRoute, private dataApiService: DataApiService, private dialogService: DialogService) {
    this.consumptions = [];
    this.alerts = [];
  }



  applyFilterInConsumptions(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSourceConsumption.filter = filterValue.trim().toLowerCase();

    if (this.dataSourceConsumption.paginator) {
      this.dataSourceConsumption.paginator.firstPage();
    }
  }

  applyFilterInAlerts(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSourceAlert.filter = filterValue.trim().toLowerCase();

    if (this.dataSourceAlert.paginator) {
      this.dataSourceAlert.paginator.firstPage();
    }
  }

  ngOnInit() {
    this.routeSubscription = this.route.params.subscribe(params => {
      this.dataApiService.getDevice(params['id']).subscribe({
        next: (data) => {

        },
        error: (error) => {
          console.log(error);
        }
      });

      this.dataApiService.getDeviceConsumption(params['id']).subscribe({
        next: (data) => {
          this.consumptions = data;
          this.dataSourceConsumption = new MatTableDataSource(this.consumptions);
          this.dataSourceConsumption.data = this.consumptions;
          this.dataSourceConsumption.paginator = this.paginatorConsumptions;
          this.dataSourceConsumption.sort = this.sortConsumptions;
        },
        error: (error) => {
          console.log(error);
        }
      });

      this.dataApiService.getDeviceAlerts(params['id']).subscribe({
        next: (data) => {
          this.alerts = data;
          this.dataSourceAlert = new MatTableDataSource(this.alerts);
          this.dataSourceAlert.data = this.alerts;
          this.dataSourceAlert.paginator = this.paginatorAlert;
          this.dataSourceAlert.sort = this.sortAlert;
        },
        error: (error) => {
          console.log(error);
        }
      });
    });
  }

  ngOnDestroy() {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  onAddNewConsumption() {
    this.dialogService.openNewConsumptionDialog().subscribe(result => {
      if (result) {
        console.log("Handling addition of new consumption log!")
        console.log(result);
      } else {
        console.log("Addition of new consumption log cancelled!")
        console.log(result);
      }
    });
  }

  setPanelOpenState(state: boolean) {
    this.panelOpenState = state;
  }

  getPanelOpenState(): boolean {
    return this.panelOpenState;
  }
}

export interface ConsumptionData {
  consumption_id: number | null;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  files_names: string | null;
  power_max: number | null;
}

export interface AlertData {
  title: string;
  description: string;
  date: string; 
  type: string;
  read_status: string;
}