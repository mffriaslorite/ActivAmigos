import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Message, CreateMessage, MessageListQuery } from '../models/message.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = environment?.apiUrl || 'http://localhost:5000';

  constructor(private http: HttpClient) {}

  // Group chat methods
  getGroupMessages(groupId: number, params?: MessageListQuery): Observable<Message[]> {
    let httpParams = new HttpParams();
    
    if (params?.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.per_page) {
      httpParams = httpParams.set('per_page', params.per_page.toString());
    }
    if (params?.before) {
      httpParams = httpParams.set('before', params.before);
    }

    return this.http.get<Message[]>(`${this.apiUrl}/api/chat/groups/${groupId}/messages`, {
      params: httpParams
    });
  }

  sendGroupMessage(groupId: number, message: CreateMessage): Observable<Message> {
    return this.http.post<Message>(`${this.apiUrl}/api/chat/groups/${groupId}/messages`, message);
  }

  // Activity chat methods
  getActivityMessages(activityId: number, params?: MessageListQuery): Observable<Message[]> {
    let httpParams = new HttpParams();
    
    if (params?.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.per_page) {
      httpParams = httpParams.set('per_page', params.per_page.toString());
    }
    if (params?.before) {
      httpParams = httpParams.set('before', params.before);
    }

    return this.http.get<Message[]>(`${this.apiUrl}/api/chat/activities/${activityId}/messages`, {
      params: httpParams
    });
  }

  sendActivityMessage(activityId: number, message: CreateMessage): Observable<Message> {
    return this.http.post<Message>(`${this.apiUrl}/api/chat/activities/${activityId}/messages`, message);
  }
}