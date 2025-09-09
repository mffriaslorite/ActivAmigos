import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-websocket-debug',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded-lg shadow-lg text-xs max-w-xs z-50">
      <h4 class="font-bold mb-2">WebSocket Debug</h4>
      <div class="space-y-1">
        <div>
          <span class="text-gray-300">Status:</span>
          <span [class]="isConnected ? 'text-green-400' : 'text-red-400'">
            {{ isConnected ? 'Connected' : 'Disconnected' }}
          </span>
        </div>
        <div>
          <span class="text-gray-300">User ID:</span>
          <span class="text-blue-400">{{ currentUserId || 'None' }}</span>
        </div>
        <div>
          <span class="text-gray-300">Room:</span>
          <span class="text-yellow-400">{{ currentRoom || 'None' }}</span>
        </div>
        <div>
          <span class="text-gray-300">Messages:</span>
          <span class="text-purple-400">{{ messageCount }}</span>
        </div>
      </div>
      <div class="mt-2 space-x-2">
        <button 
          (click)="reconnect()"
          class="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
        >
          Reconnect
        </button>
        <button 
          (click)="disconnect()"
          class="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
        >
          Disconnect
        </button>
      </div>
    </div>
  `,
  styles: []
})
export class WebSocketDebugComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  isConnected = false;
  currentUserId: number | null = null;
  currentRoom: string | null = null;
  messageCount = 0;

  constructor(
    private webSocketService: WebSocketService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Subscribe to connection status
    this.webSocketService.getConnectionStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe(connected => {
        this.isConnected = connected;
      });

    // Subscribe to current user
    this.authService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUserId = user?.id || null;
      });

    // Subscribe to messages
    this.webSocketService.getMessages()
      .pipe(takeUntil(this.destroy$))
      .subscribe(messages => {
        this.messageCount = messages.length;
      });

    // Get current room
    this.currentRoom = this.webSocketService.getCurrentRoom();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  reconnect(): void {
    this.webSocketService.forceReconnect();
  }

  disconnect(): void {
    this.webSocketService.disconnect();
  }
}