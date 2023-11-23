import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-new-device-dialog',
  templateUrl: './new-device-dialog.component.html',
  styleUrls: ['./new-device-dialog.component.scss']
})

export class NewDeviceDialogComponent {
  deviceForm: FormGroup;

  constructor(private dialogRef: MatDialogRef<NewDeviceDialogComponent>, private fb: FormBuilder) {
    this.deviceForm = this.fb.group({
      deviceCategory: ['', Validators.required],
      deviceType: ['', Validators.required],
      deviceName: ['', Validators.required],
      alertThresholdHigh:['130', Validators.required],
      alertThresholdLow:['0', Validators.required]
    });

    this.dialogRef.backdropClick().subscribe(() => {
      this.dialogRef.close();
    });
  }

  onSave() {
    if (this.deviceForm.valid) {
      this.dialogRef.close(this.deviceForm.value);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}

export interface DeviceData {
  deviceCategory: string;
  deviceType: string;
  deviceName: string;
  alertThresholdHigh: number;
  alertThresholdLow: number;
}
