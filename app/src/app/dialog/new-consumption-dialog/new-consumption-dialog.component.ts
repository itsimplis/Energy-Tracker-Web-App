import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-new-consumption-dialog',
  templateUrl: './new-consumption-dialog.component.html',
  styleUrls: ['./new-consumption-dialog.component.scss']
})
export class NewConsumptionDialogComponent {

  consumptionForm: FormGroup;
  fileName: string = '';

  constructor(private dialogRef: MatDialogRef<NewConsumptionDialogComponent>, private fb: FormBuilder) {
    this.consumptionForm = this.fb.group({
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      durationDays: [''],
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
      const duration = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1; // Add 1 to include both start and end date
      this.consumptionForm.get('durationDays')!.setValue(duration);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      const file = input.files[0];
      this.fileName = file.name; // Store the file name

      // Process the file as needed
      this.readFile(file);
    }
  }

  readFile(file: File) {
    // File Process logic... to do.
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSave() {
    if (this.consumptionForm.valid) {
      this.dialogRef.close(this.consumptionForm.value);
    }
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // JavaScript months are 0-indexed
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onApplyClick() {
    let startDate = this.consumptionForm.get('startDate')?.value;
    let endDate = this.consumptionForm.get('endDate')?.value;
  
    if (startDate) {
      startDate = this.formatDate(new Date(startDate));
      this.consumptionForm.get('startDate')!.setValue(startDate);
    }
    if (endDate) {
      endDate = this.formatDate(new Date(endDate));
      this.consumptionForm.get('endDate')!.setValue(endDate);
    }
  
    this.updateDurationDays();
  }
}
