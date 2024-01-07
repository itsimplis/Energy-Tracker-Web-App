import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthenticationService } from './../../service/authentication.service';
import { Component } from '@angular/core';
import { AlertService } from 'src/app/service/alert.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})

export class LoginComponent {

  output: Output;
  username: string;
  password: string;
  hidePwd: boolean;

  constructor(private authenticationService: AuthenticationService, private matSnackBar: MatSnackBar, private alertService: AlertService) {
    this.output = { result: '', message: '' };
    this.username = '';
    this.password = '';
    this.hidePwd = true;
  }

  // Login to the account
  login() {
    this.authenticationService.loginUser(this.username, this.password).subscribe({
      next: (data) => {
        this.authenticationService.setAuthToken(data.access_token);
        this.authenticationService.setUserName(data.username);
        this.output.result = 'success';
        this.output.message = data.message;
        this.matSnackBar.open(this.output.message, 'Close', { duration: 3500, });
        this.authenticationService.notifyLogin();
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

  // Check if user got authenticated
  isAuthenticated(): boolean {
    return this.authenticationService.isAuthenticated();
  }

  // Reset form fields to blank
  resetForm() {
    this.username = '';
    this.password = '';
  }

  // Easter Egg
  onForgotPassword() {
    this.alertService.showSnackBar("Close your eyes... concentrate, remember !", 'Ok...', 6000);
  }
}

interface Output {
  result: string;
  message: string;
}
