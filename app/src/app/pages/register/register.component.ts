import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthenticationService } from './../../service/authentication.service';
import { Component } from '@angular/core';

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

  constructor(private authenticationService: AuthenticationService, private matSnackBar: MatSnackBar) {
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
        this.matSnackBar.open(this.output.message, 'Close', { duration: 3500, });
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
        this.matSnackBar.open(this.output.message, 'Close', { duration: 3500, });
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