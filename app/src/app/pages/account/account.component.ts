import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from 'src/app/service/authentication.service';
import { UserApiService } from 'src/app/service/user-api.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { BasicDialogComponent } from 'src/app/dialog/basic-dialog/basic-dialog.component';
import { DialogRef } from '@angular/cdk/dialog';
import { AlertService } from 'src/app/service/alert.service';


@Component({
  selector: 'account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss']
})

export class AccountComponent implements OnInit {

  output: Output;
  dialogRef!: DialogRef;
  isFormChanged: boolean;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  age: string;
  gender: string;
  country: string;
  visibility: string;
  notifications: string;


  constructor(private userApiService: UserApiService, private authenticationService: AuthenticationService, private alertService: AlertService, private matDialog: MatDialog) {
    this.output = { result: '', message: '' };
    this.username = '';
    this.email = '';
    this.first_name = '';
    this.last_name = '';
    this.age = '';
    this.gender = '';
    this.country = '';
    this.isFormChanged = false;
    this.visibility = '';
    this.notifications = '';
  }

  ngOnInit(): void {
    this.loadUserDetails();
  }

  loadUserDetails() {
    this.userApiService.getUser().subscribe({
      next: (data) => {
        this.username = data[0].username;
        this.email = data[0].email;
        this.first_name = data[0].first_name;
        this.last_name = data[0].last_name;
        this.age = data[0].age;
        this.gender = data[0].gender;
        this.country = data[0].country;
        this.visibility = data[0].visibility;
        this.notifications = data[0].notifications;
      },
      error: (error) => {
        console.log(error);
      }
    })
  }

  onUpdateDetails() {
    this.userApiService.updateUser(this.first_name, this.last_name, this.age, this.gender, this.country, this.visibility, this.notifications).subscribe({
      next: (data) => {
        this.output.result = 'success';
        this.output.message = data.message;
        this.isFormChanged = false;
        this.alertService.showSnackBar(this.output.message);
      },
      error: (error) => {
        console.log(error);
      }
    })
  }

  onDeleteAccount() {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = '600px';
    dialogConfig.data = {title: 'Account Deletion', content: 'Deleting your account is an irreversible action and will permanently delete all your data associated with your account.'}
    const dialogRef = this.matDialog.open(BasicDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe({
      next: (result) => {
        if (result === true) {
          this.userApiService.deleteUser(this.authenticationService.getUserName()!).subscribe({
            next: (response) => {
              this.authenticationService.logout();
              this.alertService.showSnackBar("Account deleted successfully!");
            },
            error: (error) => {
              this.alertService.showSnackBar("There was an error deleting the account!");
            }
          });
        } else {
          this.alertService.showSnackBar("Account deletion was cancelled!");
        }
      },
      error: (error) => {
        this.alertService.showSnackBar("An error occurred!");
      }
    });
  }

  onInputChange() {
    this.isFormChanged = true;
  }

}

interface Output {
  result: string;
  message: string;
}
