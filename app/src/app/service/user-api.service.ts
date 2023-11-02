import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs'

@Injectable({
  providedIn: 'root'
})

export class UserApiService {

  private baseUrl: string = 'http://localhost:8000';

  constructor(private http: HttpClient) { }

  // [GET] Get user details
  getUser(username: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/user/get?username=${username}`, { withCredentials: true });
  }

  // [PATCH] Update user details
  updateUser(username:string, first_name: string, last_name: string, age: string, gender: string, country: string, visibility: string, notifications: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/user/update`, {
      username: username,
      first_name: first_name,
      last_name: last_name,
      age: age,
      gender: gender,
      country: country,
      visibility: visibility,
      notifications: notifications
    });
  }
}
