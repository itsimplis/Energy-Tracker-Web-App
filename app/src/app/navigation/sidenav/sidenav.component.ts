import { AuthenticationService } from './../../service/authentication.service';
import { Component, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss']
})

export class SidenavComponent {
  @Output() sidenavClose = new EventEmitter();

  constructor(private authenticationService: AuthenticationService) { }

  onSidenavClose() {
    if (this.isMobileView()) {
      this.sidenavClose.emit();
    }
  }

  onSidenavLogout() {
    this.logout();
    if (this.isMobileView()) {
      this.sidenavClose.emit();
    }
  }

  isMobileView(): boolean {
    return window.innerWidth <= 768;
  }

  // Check if user got authenticated
  isAuthenticated(): boolean {
    return this.authenticationService.isAuthenticated();
  }

  logout() {
    this.authenticationService.logout();
  }
}
