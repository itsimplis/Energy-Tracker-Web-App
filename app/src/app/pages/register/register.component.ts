import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthenticationService } from './../../service/authentication.service';
import { Component } from '@angular/core';
import { AlertService } from 'src/app/service/alert.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {

  output: Output;
  username: string;
  email: string;
  password: string;
  password2: string;

  constructor(private authenticationService: AuthenticationService, private alertService: AlertService,  private matSnackBar: MatSnackBar) {
    this.output = { result: '', message: '' };
    this.username = '';
    this.email = '';
    this.password = '';
    this.password2 = '';
  }

  // Register the user for a new account
  register() {
    this.authenticationService.registerUser(this.username, this.email, this.password, this.password2).subscribe({
      next: (data) => {
        this.output.result = 'success';
        this.output.message = data.message;
        this.alertService.addRegistrationAlert(this.username, null, "Welcome user !", "Welcome. Please don't forget to update your profile details!", new Date().toISOString(), 'U', 'N', false);
        this.alertService.showSnackBar(this.output.message, 'Close', 3500)
        this.authenticationService.notifyRegister();
      },
      error: (error) => {
        console.log(error);
        this.output.result = 'error'
        if (error.status === 400) {
          this.output.message = error.error.detail;
        } else if (error.status === 401) {
          this.output.message = 'Access Denied!';
        } else {
          this.output.message = 'An error occurred!';
        }
        this.alertService.showSnackBar(this.output.message, 'Close', 3500)
      }
    });
  }

  // Reset form fields to blank
  resetForm() {
    this.username = '';
    this.email = '';
    this.password = '';
    this.password2 = '';
  }

  // Check if user got authenticated
  isAuthenticated(): boolean {
    return this.authenticationService.isAuthenticated();
  }
}

interface Output {
  result: string;
  message: string;
}