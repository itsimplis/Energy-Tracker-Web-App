// Core Modules
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { JwtHelperService, JWT_OPTIONS } from '@auth0/angular-jwt';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule} from '@angular/flex-layout'
import { NgxChartsModule } from '@swimlane/ngx-charts';

// Angular Material
import { MatButtonModule} from '@angular/material/button';
import { MatSidenavModule} from '@angular/material/sidenav';
import { MatToolbarModule} from '@angular/material/toolbar';
import { MatIconModule} from '@angular/material/icon';
import { MatListModule} from '@angular/material/list';
import { MatTabsModule} from '@angular/material/tabs';
import { MatTableModule} from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule} from '@angular/material/checkbox';
import { MatDialogModule} from '@angular/material/dialog';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatGridListModule} from '@angular/material/grid-list';

// Custom Components
import { ToolbarComponent } from './navigation/toolbar/toolbar.component';
import { SidenavComponent } from './navigation/sidenav/sidenav.component';
import { HomeComponent } from './pages/home/home.component';
import { AlertsComponent } from './pages/alerts/alerts.component';
import { StatisticsComponent } from './pages/statistics/statistics.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AccountComponent } from './pages/account/account.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { AlertService } from './service/alert.service';
import { DevicesComponent } from './pages/devices/devices.component';
import { BasicDialogComponent } from './dialog/basic-dialog/basic-dialog.component';
import { MatExpansionModule } from '@angular/material/expansion';
import { DeviceDetailComponent } from './pages/device-detail/device-detail.component';
import { NewConsumptionDialogComponent } from './dialog/new-consumption-dialog/new-consumption-dialog.component';
import { NewDeviceDialogComponent } from './dialog/new-device-dialog/new-device-dialog.component';

@NgModule({
  declarations: [
    AppComponent,
    ToolbarComponent,
    SidenavComponent,
    HomeComponent,
    DashboardComponent,
    AlertsComponent,
    DevicesComponent,
    StatisticsComponent,
    LoginComponent,
    RegisterComponent,
    AccountComponent,
    BasicDialogComponent,
    DeviceDetailComponent,
    NewConsumptionDialogComponent,
    NewDeviceDialogComponent
  ],
  imports: [
    AppRoutingModule,
    NgxChartsModule,
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    FlexLayoutModule,
    MatButtonModule,
    MatSidenavModule,
    MatTableModule,
    MatTabsModule,
    MatIconModule,
    MatListModule,
    MatToolbarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatBadgeModule,
    MatMenuModule,
    MatRadioModule,
    MatCheckboxModule,
    MatDialogModule,
    MatExpansionModule,
    MatTableModule,
    MatPaginatorModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
    MatGridListModule
  ],
  providers: [
    JwtHelperService,
    { provide: JWT_OPTIONS, useValue: JWT_OPTIONS },
    AlertService,
    MatSnackBar
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
