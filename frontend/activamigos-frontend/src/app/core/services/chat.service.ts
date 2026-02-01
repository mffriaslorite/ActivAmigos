import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';
import { Message } from '../models/message.model';
import { environment } from 'src/environments/environment';

export interface ModerationStatus {
  warning_count: number;
  status: 'ACTIVE' | 'BANNED';
  semaphore_color: 'grey' | 'light_green' | 'dark_green' | 'yellow' | 'red';
}

export interface ChatMessage {
  id: number;
  context_type: 'GROUP' | 'ACTIVITY';
  context_id: number;
  content: string;
  created_at: string;
  sender_id: number;
  sender: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    profile_image?: string;
  };
  is_system?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly API_BASE_URL = `${environment.apiUrl}/api`;
  private socket: Socket | null = null;
  
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  
  public messages$ = this.messagesSubject.asObservable();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeSocket();
  }

  private initializeSocket() {
    const socketUrl = environment.apiUrl || '';
    this.socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      forceNew: true,
      timeout: 10000,
      path: '/socket.io'
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to chat server');
      this.connectionStatusSubject.next(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from chat server:', reason);
      this.connectionStatusSubject.next(false);
      
      // Auto-reconnect after delay unless intentional disconnect
      if (reason !== 'io client disconnect') {
        setTimeout(() => {
          console.log('🔄 Attempting to reconnect...');
          this.socket?.connect();
        }, 2000);
      }
    });

    this.socket.on('new_message', (message: ChatMessage) => {
      console.log('📨 New message received:', message);
      // Instead of appending, emit the single new message
      // Components will handle adding it to their own lists
      this.messagesSubject.next([message]);
    });

    this.socket.on('joined_chat', (data: any) => {
      console.log('✅ Joined room:', data);
    });

    this.socket.on('left_chat', (data: any) => {
      console.log('👋 Left room:', data);
    });

    this.socket.on('error', (error: any) => {
      console.error('❌ Socket error:', error);
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('❌ Connection error:', error);
      this.connectionStatusSubject.next(false);
    });

    this.socket.on('warning_issued', (data: any) => {
      console.log('⚠️ Warning issued:', data);
      // Handle warning notification
    });

    this.socket.on('user_banned', (data: any) => {
      console.log('🚫 User banned:', data);
      // Handle ban notification
    });
  }

  /**
   * Join a chat room
   */
  joinRoom(contextType: 'GROUP' | 'ACTIVITY', contextId: number) {
    if (this.socket?.connected) {
      const roomData = { context_type: contextType, context_id: contextId };
      this.socket.emit('join_chat', roomData);
      console.log('Joining room:', roomData);
    }
  }

  /**
   * Leave a chat room
   */
  leaveRoom(contextType: 'GROUP' | 'ACTIVITY', contextId: number) {
    if (this.socket?.connected) {
      const roomData = { context_type: contextType, context_id: contextId };
      this.socket.emit('leave_chat', roomData);
      console.log('Leaving room:', roomData);
    }
  }

  /**
   * Send a message
   */
  sendMessage(contextType: 'GROUP' | 'ACTIVITY', contextId: number, content: string): Observable<any> {
    return new Observable(observer => {
      if (!this.socket?.connected) {
        observer.error(new Error('Socket not connected'));
        return;
      }

      const messageData = {
        context_type: contextType,
        context_id: contextId,
        content
      };

      this.socket.emit('send_message', messageData);
      
      // Listen for success/error
      const successHandler = () => {
        observer.next({ success: true });
        observer.complete();
      };

      const errorHandler = (error: any) => {
        observer.error(new Error(error.message || 'Failed to send message'));
      };

      this.socket.once('message_sent', successHandler);
      this.socket.once('error', errorHandler);

      // Cleanup listeners after timeout
      setTimeout(() => {
        this.socket?.off('message_sent', successHandler);
        this.socket?.off('error', errorHandler);
        if (!observer.closed) {
          observer.next({ success: true }); // Assume success if no response
          observer.complete();
        }
      }, 5000);
    });
  }

  /**
   * Get message history for a group or activity
   */
  getMessageHistory(contextType: 'GROUP' | 'ACTIVITY', contextId: number, cursor?: string): Observable<ChatMessage[]> {
    const params: any = {
      context_type: contextType,
      context_id: contextId.toString()
    };

    if (cursor) {
      params.cursor = cursor;
    }

    return this.http.get<{ messages: ChatMessage[] }>(`${this.API_BASE_URL}/chat/history`, { 
      params,
      withCredentials: true 
    }).pipe(
      map(response => response.messages || []),
      catchError(this.handleError)
    );
  }

  /**
   * Get user's moderation status in a context
   */
  getUserModerationStatus(contextType: 'GROUP' | 'ACTIVITY', contextId: number, userId: number): Observable<ModerationStatus> {
    const params = {
      context_type: contextType,
      context_id: contextId.toString(),
      user_id: userId.toString()
    };

    return this.http.get<ModerationStatus>(`${this.API_BASE_URL}/moderation/status`, {
      params,
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Issue a warning to a user (organizers/admins only)
   */
  issueWarning(contextType: 'GROUP' | 'ACTIVITY', contextId: number, targetUserId: number, reason: string): Observable<any> {
    return this.http.post(`${this.API_BASE_URL}/moderation/warnings`, {
      context_type: contextType,
      context_id: contextId,
      target_user_id: targetUserId,
      reason: reason
    }, { withCredentials: true }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Disconnect from socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionStatusSubject.next(false);
    }
  }

  /**
   * Reconnect to socket
   */
  reconnect() {
    if (!this.socket || !this.socket.connected) {
      this.initializeSocket();
    }
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ha ocurrido un error inesperado';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else {
      errorMessage = `Error del servidor: ${error.status}`;
    }
    console.error('Chat service error:', error);
    return throwError(() => new Error(errorMessage));
  }

  // Legacy methods for backward compatibility
  getGroupMessages(groupId: number): Observable<ChatMessage[]> {
    return this.getMessageHistory('GROUP', groupId);
  }

  getActivityMessages(activityId: number): Observable<ChatMessage[]> {
    return this.getMessageHistory('ACTIVITY', activityId);
  }

  sendGroupMessage(groupId: number, content: string): Observable<any> {
    return this.sendMessage('GROUP', groupId, content);
  }

  sendActivityMessage(activityId: number, content: string): Observable<any> {
    return this.sendMessage('ACTIVITY', activityId, content);
  }
}