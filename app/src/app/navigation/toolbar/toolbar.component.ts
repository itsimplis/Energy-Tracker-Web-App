import { DataApiService } from './../../service/data-api.service';
import { Component, Output, EventEmitter } from '@angular/core';
import { AuthenticationService } from 'src/app/service/authentication.service';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss']
})
export class ToolbarComponent {

  unreadAlerts: any[];

  constructor(private authenticationService: AuthenticationService, private dataApiService: DataApiService) {
    this.unreadAlerts = [];
   }

  @Output() public sidenavToggle = new EventEmitter();

  ngOnInit(): void {
    this.loadAlerts();
  }

  onToggleSidenav() {
    this.sidenavToggle.emit();
  }

  // Check if user got authenticated
  isAuthenticated(): boolean {
    return this.authenticationService.isAuthenticated();
  }

  

  loadAlerts() {

    this.unreadAlerts = [];

    this.dataApiService.getUnreadAlerts(this.authenticationService.getUserName()!).subscribe({
      next: (data) => {
        this.unreadAlerts = data;
      },
      error: (error) => {
        console.log(error);
      }
    })
  }

}
