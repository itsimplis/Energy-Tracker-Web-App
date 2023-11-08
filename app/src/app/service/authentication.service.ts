import { Injectable, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Observable } from 'rxjs'

@Injectable({
  providedIn: 'root'
})

export class AuthenticationService {

  private baseUrl: string = 'http://localhost:8000';
  private authToken = 'authToken';
  private userName = 'username';

  constructor(private jwtHelper: JwtHelperService, private http: HttpClient, private router: Router) {}

    userLoggedOut = new EventEmitter();
    userLoggedIn = new EventEmitter();
    userRegistered = new EventEmitter();

    // [POST] Send user details to register
    registerUser(username: string, email: string, password: string, password2: string): Observable<any> {
      return this.http.post<any>(`${this.baseUrl}/auth/register`, {
        username: username,
        email: email,
        password: password,
        password2: password2,
      });
    }
  
    // [POST] Send user credentials to login
    loginUser(username: string, password: string): Observable<any> {
      return this.http.post<any>(`${this.baseUrl}/auth/login`, {
        username: username,
        password: password,
      });
    }

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
    const token = this.getAuthToken();
    return token !== null && !this.jwtHelper.isTokenExpired(token);
  }

  logout(): void {
    localStorage.removeItem(this.authToken);
    localStorage.removeItem(this.userName);
    this.userLoggedOut.emit();
    this.router.navigate(['/home']);
  }

  notifyLogin(): void {
    this.userLoggedIn.emit();
    setTimeout(() => {
      this.router.navigate(['/home']);
    }, 2000);
  }

  notifyRegister(): void {
    this.userRegistered.emit();
    setTimeout(() => {
      this.router.navigate(['/home']);
    }, 2000);
  }

}