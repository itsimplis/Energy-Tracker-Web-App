import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs'

@Injectable({
  providedIn: 'root'
})

export class UserApiService {

  private baseUrl: string = 'http://localhost:8000';

  constructor(private http: HttpClient) { }

  // [POST] Send user details to register
  registerUser(username: string, email: string, password: string, password2: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/user/register`, {
      username: username,
      email: email,
      password: password,
      password2: password2,
    });
  }

  // [POST] Send user credentials to login
  loginUser(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/user/login`, {
      username: username,
      password: password,
    });
  }

  // [GET] Get user details
  getUser(username: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/user/get?username=${username}`, { withCredentials: true });
  }

  // [PATCH] Update user details
  updateUser(username:string, first_name: string, last_name: string, age: string, gender: string, country: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/user/update`, {
      username: username,
      first_name: first_name,
      last_name: last_name,
      age: age,
      gender: gender,
      country: country,
    });
  }
}
