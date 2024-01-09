import { Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { BehaviorSubject, Observable } from 'rxjs';
import { NewDeviceDialogComponent } from '../dialog/new-device-dialog/new-device-dialog.component';
import { BasicDialogComponent } from '../dialog/basic-dialog/basic-dialog.component';
import { NewConsumptionDialogComponent } from '../dialog/new-consumption-dialog/new-consumption-dialog.component';
import { ViewAlertDialogComponent } from '../dialog/view-alert-dialog/view-alert-dialog.component';
import { ImportDialogComponent } from '../dialog/import-dialog/import-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class DialogService {

  constructor(private matDialog: MatDialog) { }

  private messageSource = new BehaviorSubject<{ text: string, showSpinner: boolean, showCheckIcon: boolean }[]>([]);
  currentMessage = this.messageSource.asObservable();

  updateMessages(messages: { text: string, showSpinner: boolean, showCheckIcon: boolean }[]) {
    this.messageSource.next(messages);
  }

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
    dialogConfig.width = '700px';
    return this.openDialog(NewDeviceDialogComponent, dialogConfig);
  }

  openEditDeviceDialog(data: any[]): Observable<any> {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = '700px';
    dialogConfig.data = data;
    return this.openDialog(NewDeviceDialogComponent, dialogConfig);
  }

  openNewConsumptionDialog(): Observable<any> {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = '500px';
    return this.openDialog(NewConsumptionDialogComponent, dialogConfig);
  }

  openViewAlertDialog(data: any[]): Observable<any> {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = '600px';
    dialogConfig.data = data;
    return this.openDialog(ViewAlertDialogComponent, dialogConfig);
  }

  openImportDialog(data: any[]): Observable<any> {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = '400px';
    dialogConfig.data = data;
    return this.openDialog(ImportDialogComponent, dialogConfig);
  }
}
