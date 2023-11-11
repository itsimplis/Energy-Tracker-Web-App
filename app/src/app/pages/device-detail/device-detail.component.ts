import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import {MatPaginator, MatPaginatorModule} from '@angular/material/paginator';
import {MatSort, MatSortModule} from '@angular/material/sort';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import { DataApiService } from 'src/app/service/data-api.service';

@Component({
  selector: 'app-device-detail',
  templateUrl: './device-detail.component.html',
  styleUrls: ['./device-detail.component.scss']
})
export class DeviceDetailComponent implements OnInit, AfterViewInit {

  private routeSubscription!: Subscription;
  private consumptions: any[];
  private alerts: any[];
  panelOpenState: boolean = false;
  columnsConsumption: string[] = ['id', 'start date', 'end date', 'duration days', 'files names', 'total power'];
  columnsAlert: string[] = ['id', 'title', 'description', 'date', 'type', 'read'];
  dataSourceConsumption: MatTableDataSource<ConsumptionData>;
  dataSourceAlert: MatTableDataSource<AlertData>;

  @ViewChild(MatPaginator) paginatorConsumptions!: MatPaginator;
  @ViewChild(MatSort) sortConsumptions!: MatSort;
  @ViewChild(MatPaginator) paginatorAlert!: MatPaginator;
  @ViewChild(MatSort) sortAlert!: MatSort;

  constructor(private route: ActivatedRoute, private dataApiService: DataApiService) {    
    this.consumptions = [];
    this.alerts = [];

    this.dataSourceConsumption = new MatTableDataSource(this.consumptions);
    this.dataSourceAlert = new MatTableDataSource(this.alerts);
  }

  ngAfterViewInit() {
    this.dataSourceConsumption.paginator = this.paginatorConsumptions;
    this.dataSourceConsumption.sort = this.sortConsumptions;
    this.dataSourceAlert.paginator = this.paginatorAlert;
    this.dataSourceAlert.sort = this.sortAlert;
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
          this.dataSourceConsumption.data = this.consumptions;
        },
        error: (error) => {
          console.log(error);
        }
      });

      this.dataApiService.getDeviceAlerts(params['id']).subscribe({
        next: (data) => {
          this.alerts = data;
          this.dataSourceAlert.data = this.alerts;
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

  setPanelOpenState(state: boolean) {
    this.panelOpenState = state;
  }

  getPanelOpenState(): boolean {
    return this.panelOpenState;
  }
}

export interface ConsumptionData {
  id: string;
  start_date: string;
  end_date: string;
  duration_days: string;
  files_names: string;
  total_power: string;
}

export interface AlertData {
  id: string;
  title: string;
  description: string;
  date: string;
  type: string;
  read_status: string;
}