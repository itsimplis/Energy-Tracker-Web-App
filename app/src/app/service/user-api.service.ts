import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs'
import { AuthenticationService } from './authentication.service';

@Injectable({
  providedIn: 'root'
})

export class UserApiService {

  private baseUrl: string = 'http://localhost:8000';

  constructor(private http: HttpClient, private authenticationService: AuthenticationService) { }

  // [GET] Get user details
  getUser(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/user/get/`, { headers: this.authenticationService.getAuthHeaders() });
  }

  // [PATCH] Update user details
  updateUser(first_name: string, last_name: string, age: string, gender: string, country: string, visibility: string, notifications: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/user/update/`,
    {
      first_name: first_name,
      last_name: last_name,
      age: age,
      gender: gender,
      country: country,
      visibility: visibility,
      notifications: notifications
    }, {headers: this.authenticationService.getAuthHeaders()});
  }

  // [DELETE] Delete user account
  deleteUser(username: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/user/delete/`, { headers: this.authenticationService.getAuthHeaders(), withCredentials: true });
  }

}
