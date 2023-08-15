import { Component } from '@angular/core';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  
  username: string = '';
  email: string = '';
  password: string = '';
  password2: string = '';

  register() {

  }

}
