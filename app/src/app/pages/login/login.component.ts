import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})

export class LoginComponent {

  username: string = '';
  password: string = '';

  constructor(private router: Router) {}

  login() {
    // Here you can implement your login logic
    // For demonstration purposes, let's navigate to a dummy dashboard page
    this.router.navigate(['/dashboard']);
  }
}
