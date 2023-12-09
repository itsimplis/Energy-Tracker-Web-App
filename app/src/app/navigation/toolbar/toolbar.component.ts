import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AlertService } from 'src/app/service/alert.service';
import { AuthenticationService } from 'src/app/service/authentication.service';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss']
})
export class ToolbarComponent {
  alerts: any[] = [];
  private alertsSubscription!: Subscription;

  constructor(private authenticationService: AuthenticationService, private alertService: AlertService, private router: Router) {}

  @Output() public sidenavToggle = new EventEmitter();

  ngOnInit() {
    this.alertsSubscription = this.alertService.alerts$.subscribe(
      data => {
        this.alerts = data.filter(alert => alert.read_status === 'N');
    });

    if (this.authenticationService.isAuthenticated()) {
      this.alertService.loadAlerts();
    }
  }

  ngOnDestroy() {
    if (this.alertsSubscription) {
      this.alertsSubscription.unsubscribe();
    }
  }

  onToggleSidenav() {
    this.sidenavToggle.emit();
  }

  onAlertMenuItemClick(id: number) {
    this.router.navigate(['/alerts', id]);
  }

  onViewAccountClick() {

  }

  onLogoutClick() {
    this.authenticationService.logout();
  }

  // Check if user got authenticated
  isAuthenticated(): boolean {
    return this.authenticationService.isAuthenticated();
  }
}
