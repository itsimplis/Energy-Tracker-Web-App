import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-basic-dialog',
  templateUrl: './basic-dialog.component.html',
  styleUrls: ['./basic-dialog.component.scss']
})
export class BasicDialogComponent {

  constructor(private dialogRef: MatDialogRef<BasicDialogComponent>){
    this.dialogRef.backdropClick().subscribe(() => {
      this.dialogRef.close(false);
    });
  }

  onClose(confirmed: boolean) {
    this.dialogRef.close(confirmed);
  }
}
