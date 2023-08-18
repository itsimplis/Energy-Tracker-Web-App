import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from 'src/app/service/authentication.service';
import { UserApiService } from 'src/app/service/user-api.service';
import { MatSnackBar } from '@angular/material/snack-bar';


@Component({
  selector: 'account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss']
})

export class AccountComponent implements OnInit {

  output: Output;
  isFormChanged: boolean;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  age: string;
  gender: string;
  country: string;

  constructor(private userApiService: UserApiService, private authenticationService: AuthenticationService, private matSnackBar: MatSnackBar) {
    this.output = { result: '', message: '' };
    this.username = '';
    this.email = '';
    this.first_name = '';
    this.last_name = '';
    this.age = '';
    this.gender = '';
    this.country = '';
    this.isFormChanged = false;
  }

  ngOnInit(): void {
    this.loadUserDetails();
  }

  loadUserDetails() {
    this.userApiService.getUser(this.authenticationService.getUserName()!).subscribe({
      next: (data) => {
        this.username = data[0].username;
        this.email = data[0].email;
        this.first_name = data[0].first_name;
        this.last_name = data[0].last_name;
        this.age = data[0].age;
        this.gender = data[0].gender;
        this.country = data[0].country;
      },
      error: (error) => {
        console.log(error);
      }
    })
  }

  updateUserDetails() {
    this.userApiService.updateUser(this.authenticationService.getUserName()!, this.first_name, this.last_name, this.age, this.gender, this.country).subscribe({
      next: (data) => {
        this.output.result = 'success';
        this.output.message = data.message;
        this.isFormChanged = false;
        this.matSnackBar.open(this.output.message, 'Close', { duration: 3500, });
      },
      error: (error) => {
        console.log(error);
      }
    })
  }

  onInputChange() {
    this.isFormChanged = true;
  }

}

interface Output {
  result: string;
  message: string;
}
