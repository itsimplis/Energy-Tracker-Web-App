import { DataApiService } from './../../service/data-api.service';
import { Component, Output, EventEmitter } from '@angular/core';
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

  constructor(private authenticationService: AuthenticationService, private alertService: AlertService) {}

  @Output() public sidenavToggle = new EventEmitter();

  ngOnInit() {
    this.alertsSubscription = this.alertService.alerts$.subscribe(
      data => {
        this.alerts = data.filter(alert => alert.read_status === 'N');
    });

    this.alertService.loadAlerts();
    console.log("ngoninit toolbar alerts")
  }

  ngOnDestroy() {
    if (this.alertsSubscription) {
      this.alertsSubscription.unsubscribe();
    }
  }

  onToggleSidenav() {
    this.sidenavToggle.emit();
  }

  // Check if user got authenticated
  isAuthenticated(): boolean {
    return this.authenticationService.isAuthenticated();
  }
}
