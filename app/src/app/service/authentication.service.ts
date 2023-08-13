import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';

@Injectable({
  providedIn: 'root'
})

export class AuthenticationService {

  private authToken = 'authToken';
  private userName = 'username';

  constructor(private jwtHelper: JwtHelperService) {}

  setAuthToken(token: string): void {
    localStorage.setItem(this.authToken, token);
  }

  getAuthToken(): string | null {
    return localStorage.getItem(this.authToken);
  }

  setUserName(username: string): void {
    localStorage.setItem(this.userName, username);
  }

  getUserName(): string | null {
    return localStorage.getItem(this.userName);
  }

  isAuthenticated(): boolean {
    // CHANGE LATER !
    return true;
    // CHANGE LATER !
    const token = this.getAuthToken();
    return token !== null && !this.jwtHelper.isTokenExpired(token);
  }

  logout(): void {
    localStorage.removeItem(this.authToken);
    localStorage.removeItem(this.userName);
  }
}