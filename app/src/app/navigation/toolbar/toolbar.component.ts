import { Component, Output, EventEmitter } from '@angular/core';
import { AuthenticationService } from 'src/app/service/authentication.service';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss']
})
export class ToolbarComponent {

  constructor(private authenticationService: AuthenticationService) {}

  @Output() public sidenavToggle = new EventEmitter();

  onToggleSidenav() {
    this.sidenavToggle.emit();
  }

   // Check if user got authenticated
   isAuthenticated(): boolean {
    return this.authenticationService.isAuthenticated();
  }
}
