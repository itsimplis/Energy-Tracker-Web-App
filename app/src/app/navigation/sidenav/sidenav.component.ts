import { AuthenticationService } from './../../service/authentication.service';
import { Component, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss']
})

export class SidenavComponent {
  @Output() sidenavClose = new EventEmitter();

  constructor(private authenticationService: AuthenticationService) {}

  onSidenavClose() {
    this.sidenavClose.emit();
  }

  onSidenavLogout() {
    this.logout();
    this.sidenavClose.emit();
  }

  // Check if user got authenticated
  isAuthenticated(): boolean {
    return this.authenticationService.isAuthenticated();
  }

  logout() {
    this.authenticationService.logout();
  }
}
