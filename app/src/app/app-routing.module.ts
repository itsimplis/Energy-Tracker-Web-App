import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { AuthGuard } from './guard/auth.guard';
import { DevicesComponent } from './pages/devices/devices.component';
import { AlertsComponent } from './pages/alerts/alerts.component';
import { StatisticsComponent } from './pages/statistics/statistics.component';
import { AccountComponent } from './pages/account/account.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';

const routes: Routes = [
  { path: '', redirectTo: 'home-page', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard]},
  { path: 'devices', component: DevicesComponent, canActivate: [AuthGuard]},
  { path: 'alerts', component: AlertsComponent, canActivate: [AuthGuard]},
  { path: 'statistics', component: StatisticsComponent, canActivate: [AuthGuard]},
  { path: 'account', component: AccountComponent, canActivate: [AuthGuard]}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})

export class AppRoutingModule { }
