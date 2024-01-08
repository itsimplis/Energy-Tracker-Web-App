import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DataApiService } from 'src/app/service/data-api.service';

@Component({
  selector: 'app-new-device-dialog',
  templateUrl: './new-device-dialog.component.html',
  styleUrls: ['./new-device-dialog.component.scss']
})

export class NewDeviceDialogComponent {
  deviceForm: FormGroup;
  deviceTypes: any[];
  isEditMode = false;
  existingDeviceData: any | null = null;

  constructor(private dialogRef: MatDialogRef<NewDeviceDialogComponent>, private fb: FormBuilder, private dataApiService: DataApiService, @Inject(MAT_DIALOG_DATA) public data: any) {
    this.deviceTypes = [];
    this.deviceForm = this.fb.group({
      deviceCategory: ['', Validators.required],
      deviceType: ['', Validators.required],
      deviceName: ['', Validators.required],
      alertEnergyThreshold: ['0', Validators.required],
      alertPowerThreshold: ['0', Validators.required],
      usageFrequency: ['N', Validators.required],
      customPowerMin: ['', Validators.required],
      customPowerMax: ['', Validators.required]
    });

    this.deviceForm.get('customPowerMin')!.valueChanges.subscribe(value => {
      if (value < 0) {
        this.deviceForm.get('customPowerMin')!.setValue(0, {emitEvent: false});
      }
      this.validateCustomPowerMinMax()
      this.validatePowerDrawThreshold();
    });
    
    this.deviceForm.get('customPowerMax')!.valueChanges.subscribe(value => {
      if (value < 0) {
        this.deviceForm.get('customPowerMax')!.setValue(0, {emitEvent: false});
      }
      this.validateCustomPowerMinMax()
      this.validatePowerDrawThreshold();
    });

    this.deviceForm.get('alertPowerThreshold')!.valueChanges.subscribe(value => {
      if (value < 0) {
        this.deviceForm.get('alertPowerThreshold')!.setValue(0, {emitEvent: false});
      }
      this.validatePowerDrawThreshold();
    });

    this.deviceForm.get('alertEnergyThreshold')!.valueChanges.subscribe(value => {
      if (value < 0) {
        this.deviceForm.get('alertEnergyThreshold')!.setValue(0, {emitEvent: false});
      }
    });

    

    // Check if editing an existing device
    if (this.data) {
      this.isEditMode = true;
      this.existingDeviceData = this.data[0];
      this.populateForm(this.existingDeviceData);
    }

    this.dialogRef.backdropClick().subscribe(() => {
      this.dialogRef.close();
    });
  }

  // Populate form when editing
  private populateForm(deviceData: any): void {
    this.deviceForm.get('deviceCategory')!.setValue(deviceData.device_category);

    this.dataApiService.getDeviceTypes(deviceData.device_category).subscribe({
      next: (data) => {
        this.deviceTypes = data;
        this.deviceForm.get('deviceType')!.setValue(deviceData.device_type);
      },
      error: (error) => {}
    });

    this.deviceForm.get('deviceName')!.setValue(deviceData.device_name);
    this.deviceForm.get('alertEnergyThreshold')!.setValue(deviceData.energy_alert_threshold);
    this.deviceForm.get('alertPowerThreshold')!.setValue(deviceData.power_alert_threshold);
    this.deviceForm.get('usageFrequency')!.setValue(deviceData.usage_frequency);
    this.deviceForm.get('customPowerMin')!.setValue(deviceData.custom_power_min);
    this.deviceForm.get('customPowerMax')!.setValue(deviceData.custom_power_max);
  }

  private validatePowerDrawThreshold() {
    const minPower = this.deviceForm.get('customPowerMin')!.value;
    const maxPower = this.deviceForm.get('customPowerMax')!.value;
    const powerDraw = this.deviceForm.get('alertPowerThreshold')!.value;
  
    if (powerDraw != 0 && (powerDraw < minPower || powerDraw > maxPower)) {
      this.deviceForm.get('alertPowerThreshold')!.setErrors({ outOfRange: true });
    } else {
      this.deviceForm.get('alertPowerThreshold')!.setErrors(null);
    }
  }

  private validateCustomPowerMinMax() {
    const minPower = this.deviceForm.get('customPowerMin')!.value;
    const maxPower = this.deviceForm.get('customPowerMax')!.value;

    if (minPower > maxPower) {
      this.deviceForm.get('customPowerMin')!.setErrors({ outOfRange: true });
      this.deviceForm.get('customPowerMax')!.setErrors({ outOfRange: true });
    } else {
      this.deviceForm.get('customPowerMin')!.setErrors(null);
      this.deviceForm.get('customPowerMax')!.setErrors(null);
    }
  }

  onDeviceCategorySelection(event: any) {
    this.dataApiService.getDeviceTypes(event.value).subscribe({
      next: (data) => {
        this.deviceTypes = data;
        this.deviceForm.get('customPowerMin')!.setValue('')
        this.deviceForm.get('customPowerMax')!.setValue('');
      },
      error: (error) => {

      }
    });
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
