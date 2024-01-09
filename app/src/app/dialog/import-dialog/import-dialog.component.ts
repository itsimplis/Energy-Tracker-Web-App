import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DialogService } from 'src/app/service/dialog.service';

@Component({
  selector: 'app-import-dialog',
  templateUrl: './import-dialog.component.html',
  styleUrls: ['./import-dialog.component.scss']
})
export class ImportDialogComponent {
  messages: { text: string; showSpinner: boolean; showCheckIcon: boolean }[] = [];

  constructor(private dialogRef: MatDialogRef<ImportDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: any, private dialogService: DialogService) {
    this.dialogService.currentMessage.subscribe(messages => {
      this.messages = messages;
    });

    this.dialogRef.backdropClick().subscribe(() => {
        this.dialogRef.close(false);
    });
  }

  onClose() {
    this.dialogRef.close(false);
  }
}