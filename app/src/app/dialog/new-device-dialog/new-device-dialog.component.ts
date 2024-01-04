import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { DataApiService } from 'src/app/service/data-api.service';

@Component({
  selector: 'app-new-device-dialog',
  templateUrl: './new-device-dialog.component.html',
  styleUrls: ['./new-device-dialog.component.scss']
})

export class NewDeviceDialogComponent {
  deviceForm: FormGroup;
  deviceTypes: any[];

  constructor(private dialogRef: MatDialogRef<NewDeviceDialogComponent>, private fb: FormBuilder, private dataApiService: DataApiService) {
    this.deviceTypes = [];
    this.deviceForm = this.fb.group({
      deviceCategory: ['', Validators.required],
      deviceType: ['', Validators.required],
      deviceName: ['', Validators.required],
      alertEnergyThreshold:['130', Validators.required],
      alertPowerThreshold:['0', Validators.required],
      usageFrequency:['N', Validators.required],
      customPowerMin:['', Validators.required],
      customPowerMax:['', Validators.required]
    });

    this.dialogRef.backdropClick().subscribe(() => {
      this.dialogRef.close();
    });
  }

  onDeviceCategorySelection(event: any) {
    console.log('Selected: ' + (event.value));
    this.dataApiService.getDeviceTypes(event.value).subscribe({
      next: (data) => {
        this.deviceTypes = data;
        this.deviceForm.get('customPowerMin')!.setValue('')
        this.deviceForm.get('customPowerMax')!.setValue('');
      },
      error: (error) => {

      }
    })
  }

  onDeviceTypeSelection(event: any) {
    const selectedDevice = this.deviceTypes.find(deviceType => deviceType.type_name == event.value);
    
    if (selectedDevice) {
      this.deviceForm.get('customPowerMin')!.setValue(selectedDevice.power_min);
      this.deviceForm.get('customPowerMax')!.setValue(selectedDevice.power_max);
    }
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
  alertEnergyThreshold: number;
  alertPowerThreshold: number;
  usageFrequency: string;
  custom_power_min: number;
  custom_power_max: number;
}
