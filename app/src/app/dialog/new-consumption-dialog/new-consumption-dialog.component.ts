import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-new-consumption-dialog',
  templateUrl: './new-consumption-dialog.component.html',
  styleUrls: ['./new-consumption-dialog.component.scss']
})
export class NewConsumptionDialogComponent {

  consumptionForm: FormGroup;

  constructor(private dialogRef: MatDialogRef<NewConsumptionDialogComponent>, private fb: FormBuilder) {
    this.consumptionForm = this.fb.group({
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      durationDays: [''],
      filesNames: [''],
      totalPower: ['', Validators.required]
    });

    this.dialogRef.backdropClick().subscribe(() => {
      this.dialogRef.close();
    });

    this.setupDateChangeListeners();
  }

  setupDateChangeListeners() {
    this.consumptionForm.get('startDate')?.valueChanges.subscribe(() => {
      this.updateDurationDays();
    });
    this.consumptionForm.get('endDate')?.valueChanges.subscribe(() => {
      this.updateDurationDays();
    });
  }

  updateDurationDays() {
    const startDate = this.consumptionForm.get('startDate')?.value;
    const endDate = this.consumptionForm.get('endDate')?.value;
    if (startDate && endDate) {
      const duration = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
      this.consumptionForm.get('durationDays')!.setValue(duration);
    }
  }


  onCancel() {

  }

  onSave() {

  }
}
