import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import {
  ChatMessage,
  ChatHistoryResponse,
  SendMessageRequest,
  SendMessageResponse,
  ChatStatus,
  Message,
  WebSocketEvents,
  WebSocketEmitEvents
} from '../models/chat.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = `${environment.apiUrl}/chat`;
  private socket: Socket | null = null;
  private isConnected = false;
  private currentUser: any = null;
  
  // Behavior subjects for real-time updates
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  public messages$ = this.messagesSubject.asObservable();
  
  // Subject for new messages
  private newMessageSubject = new Subject<Message>();
  public newMessage$ = this.newMessageSubject.asObservable();
  
  // Connection status
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeSocket();
  }

  private initializeSocket(): void {
    try {
      this.socket = io(environment.apiUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: false
      });
      
      this.setupSocketListeners();
    } catch (error) {
      console.warn('Socket.io not available, falling back to REST API only:', error);
    }
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to chat server');
      this.isConnected = true;
      this.connectionStatusSubject.next(true);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from chat server');
      this.isConnected = false;
      this.connectionStatusSubject.next(false);
    });

    this.socket.on('connected', (data: any) => {
      console.log('Connection confirmed:', data);
    });

    this.socket.on('joined_chat', (data: any) => {
      console.log('Joined chat room:', data);
    });

    this.socket.on('left_chat', (data: any) => {
      console.log('Left chat room:', data);
    });

    this.socket.on('new_message', (message: Message) => {
      console.log('New message received:', message);
      this.newMessageSubject.next(message);
      this.addMessageToHistory(message);
    });

    this.socket.on('message_sent', (data: any) => {
      console.log('Message sent confirmation:', data);
    });

    this.socket.on('error', (data: any) => {
      console.error('Chat error:', data);
    });
  }

  setCurrentUser(user: any): void {
    this.currentUser = user;
    
    // Connect to socket if user is set and socket is available
    if (this.socket && user && !this.socket.connected) {
      this.socket.connect();
    }
  }

  // Join a chat room
  joinChat(chatType: 'group' | 'activity', chatId: number): void {
    if (!this.socket || !this.currentUser) {
      console.warn('Cannot join chat: socket not available or user not set');
      return;
    }

    this.socket.emit('join_chat', {
      user_id: this.currentUser.id,
      chat_type: chatType,
      chat_id: chatId
    });
  }

  // Leave a chat room
  leaveChat(chatType: 'group' | 'activity', chatId: number): void {
    if (!this.socket) return;

    this.socket.emit('leave_chat', {
      chat_type: chatType,
      chat_id: chatId
    });
  }

  // Send a message via WebSocket
  sendMessage(chatType: 'group' | 'activity', chatId: number, content: string): void {
    if (!this.socket || !this.currentUser) {
      console.warn('Cannot send message: socket not available or user not set');
      // Fallback to REST API
      this.sendMessageViaRest(chatType, chatId, content);
      return;
    }

    this.socket.emit('send_message', {
      user_id: this.currentUser.id,
      content: content,
      chat_type: chatType,
      chat_id: chatId
    });
  }

  // REST API methods (fallback)
  getChatHistory(chatType: 'group' | 'activity', chatId: number, page: number = 1, perPage: number = 50): Observable<ChatHistoryResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('per_page', perPage.toString());

    return this.http.get<ChatHistoryResponse>(`${this.apiUrl}/${chatType}/${chatId}/messages`, { params });
  }

  sendMessageViaRest(chatType: 'group' | 'activity', chatId: number, content: string): Observable<SendMessageResponse> {
    const request: SendMessageRequest = {
      content: content,
      user_id: this.currentUser?.id || 0
    };

    return this.http.post<SendMessageResponse>(`${this.apiUrl}/${chatType}/${chatId}/messages`, request);
  }

  getChatStatus(chatType: 'group' | 'activity', chatId: number): Observable<ChatStatus> {
    return this.http.get<ChatStatus>(`${this.apiUrl}/${chatType}/${chatId}/status`);
  }

  // Message history management
  private addMessageToHistory(message: Message): void {
    const chatMessage: ChatMessage = {
      ...message,
      isCurrentUser: message.sender_id === this.currentUser?.id
    };

    const currentMessages = this.messagesSubject.value;
    const updatedMessages = [...currentMessages, chatMessage];
    this.messagesSubject.next(updatedMessages);
  }

  setMessages(messages: ChatMessage[]): void {
    this.messagesSubject.next(messages);
  }

  clearMessages(): void {
    this.messagesSubject.next([]);
  }

  // Utility methods
  isSocketConnected(): boolean {
    return this.isConnected;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  // Format timestamp for display
  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Ahora';
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }
  }

  // Check if message is from current user
  isCurrentUserMessage(message: ChatMessage): boolean {
    return message.sender_id === this.currentUser?.id;
  }
}