import { Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { NewDeviceDialogComponent } from '../dialog/new-device-dialog/new-device-dialog.component';
import { BasicDialogComponent } from '../dialog/basic-dialog/basic-dialog.component';
import { NewConsumptionDialogComponent } from '../dialog/new-consumption-dialog/new-consumption-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class DialogService {

  constructor(private matDialog: MatDialog) { }

  openDialog(component: any, config?: MatDialogConfig): Observable<any> {
    const dialogRef = this.matDialog.open(component, config);
    return dialogRef.afterClosed();
  }

  openDeleteAccountDialog(): Observable<any> {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = '600px';
    return this.openDialog(BasicDialogComponent, dialogConfig);
  }

  openNewDeviceDialog(): Observable<any> {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = '500px';
    return this.openDialog(NewDeviceDialogComponent, dialogConfig);
  }

  openNewConsumptionDialog(): Observable<any> {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = '500px';
    return this.openDialog(NewConsumptionDialogComponent, dialogConfig);
  }
}