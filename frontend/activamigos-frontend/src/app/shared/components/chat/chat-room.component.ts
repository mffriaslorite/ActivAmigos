import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';
import { SemaphoreBadgeComponent } from '../semaphore-badge/semaphore-badge.component';
import { ModerationModalComponent, UserToWarn } from '../moderation-modal/moderation-modal.component';

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

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SemaphoreBadgeComponent, ModerationModalComponent],
  template: `
    <div class="flex flex-col h-full bg-white rounded-lg border border-gray-200">
      <!-- Chat Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <h3 class="text-lg font-semibold text-gray-900">
          {{ contextType === 'GROUP' ? 'Grupo' : 'Actividad' }} Chat
        </h3>
        <div class="flex items-center space-x-2">
          <!-- Semaphore Badge -->
          <app-semaphore-badge
            *ngIf="userSemaphoreColor"
            [color]="userSemaphoreColor"
            [warningCount]="userWarningCount"
            [showText]="false"
          ></app-semaphore-badge>
          
          <!-- Moderation button for organizers -->
          <button
            *ngIf="canModerate && selectedUserToWarn"
            class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200 transition-colors"
            (click)="openModerationModal()"
          >
            ⚠️ Moderar
          </button>
        </div>
      </div>

      <!-- Messages Area -->
      <div 
        #messagesContainer 
        class="flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
        style="max-height: 400px;"
      >
        <div 
          *ngFor="let message of messages; trackBy: trackByMessageId" 
          class="flex"
          [class.justify-end]="message.sender_id === currentUserId"
        >
          <div 
            class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg break-words cursor-pointer"
            (click)="onMessageClick(message)"
            [class.bg-blue-500]="message.sender_id === currentUserId && !message.is_system"
            [class.text-white]="message.sender_id === currentUserId && !message.is_system"
            [class.bg-gray-200]="message.sender_id !== currentUserId && !message.is_system"
            [class.text-gray-900]="message.sender_id !== currentUserId && !message.is_system"
            [class.bg-yellow-100]="message.is_system"
            [class.text-yellow-800]="message.is_system"
            [class.border]="message.is_system"
            [class.border-yellow-300]="message.is_system"
          >
            <!-- Sender name (only for others' messages and system messages) -->
            <div 
              *ngIf="message.sender_id !== currentUserId || message.is_system" 
              class="text-xs font-semibold mb-1"
              [class.text-gray-600]="!message.is_system"
              [class.text-yellow-700]="message.is_system"
            >
              {{ message.is_system ? '⚠️ Sistema' : getSenderName(message.sender) }}
            </div>
            
            <!-- Message content -->
            <div class="text-sm">{{ message.content }}</div>
            
            <!-- Timestamp -->
            <div 
              class="text-xs mt-1 opacity-75"
              [class.text-gray-300]="message.sender_id === currentUserId && !message.is_system"
              [class.text-gray-500]="message.sender_id !== currentUserId && !message.is_system"
              [class.text-yellow-600]="message.is_system"
            >
              {{ formatTimestamp(message.created_at) }}
            </div>
          </div>
        </div>

        <!-- Loading indicator -->
        <div *ngIf="isLoading" class="text-center py-4">
          <div class="inline-flex items-center space-x-2">
            <div class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span class="text-gray-500">Cargando mensajes...</span>
          </div>
        </div>

        <!-- Empty state -->
        <div *ngIf="messages.length === 0 && !isLoading" class="text-center py-8">
          <div class="text-gray-500">
            <div class="text-4xl mb-2">💬</div>
            <p>No hay mensajes aún</p>
            <p class="text-sm">¡Sé el primero en escribir algo!</p>
          </div>
        </div>
      </div>

      <!-- Message Input -->
      <div class="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <form [formGroup]="messageForm" (ngSubmit)="sendMessage()" class="flex space-x-2">
          <input
            type="text"
            class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Escribe tu mensaje..."
            formControlName="content"
            [disabled]="isBanned || isSending"
            maxlength="500"
          />
          <button
            type="submit"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            [disabled]="messageForm.invalid || isBanned || isSending"
          >
            <span *ngIf="!isSending">Enviar</span>
            <span *ngIf="isSending">...</span>
          </button>
        </form>
        
        <!-- Ban message -->
        <div *ngIf="isBanned" class="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
          ⛔ No puedes enviar mensajes porque has sido suspendido de este chat.
        </div>
      </div>
    </div>

    <!-- Moderation Modal -->
    <app-moderation-modal
      [isOpen]="showModerationModal"
      [user]="selectedUserToWarn"
      [contextType]="contextType"
      [contextId]="contextId"
      (close)="closeModerationModal()"
      (warningIssued)="onWarningIssued($event)"
    ></app-moderation-modal>
  `,
  styleUrls: ['./chat-room.component.scss']
})
export class ChatRoomComponent implements OnInit, OnDestroy {
  @Input() contextType: 'GROUP' | 'ACTIVITY' = 'GROUP';
  @Input() contextId!: number;
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  messageForm: FormGroup;
  messages: ChatMessage[] = [];
  isLoading = false;
  isSending = false;
  isBanned = false;
  currentUserId: number | null = null;
  
  // Semaphore system
  userSemaphoreColor: string | null = null;
  userWarningCount: number = 0;
  
  // Moderation
  canModerate = false;
  selectedUserToWarn: UserToWarn | null = null;
  showModerationModal = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private chatService: ChatService,
    private authService: AuthService
  ) {
    this.messageForm = this.fb.group({
      content: ['', [Validators.required, Validators.maxLength(500)]]
    });
  }

  ngOnInit() {
    // Get current user
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.currentUserId = user?.id || null;
      this.canModerate = user?.role === 'ORGANIZER' || user?.role === 'SUPERADMIN';
      if (user && this.contextId) {
        this.loadUserModerationStatus();
        this.initializeChat();
      }
    });
  }

  private initializeChat() {
    // Connect to chat room
    this.connectToRoom();
    
    // Load message history
    this.loadMessages();

    // Listen for new messages from the service
    this.chatService.messages$.pipe(takeUntil(this.destroy$)).subscribe(newMessages => {
      // newMessages now contains only the latest message(s)
      newMessages.forEach(message => {
        // Only add messages for this specific context
        if (message.context_type === this.contextType && message.context_id === this.contextId) {
          // Check if message already exists to avoid duplicates
          const exists = this.messages.some(existing => existing.id === message.id);
          if (!exists) {
            this.messages.push(message);
            this.scrollToBottom();
          }
        }
      });
    });

    // Listen for connection status
    this.chatService.connectionStatus$.pipe(takeUntil(this.destroy$)).subscribe(connected => {
      if (connected && this.currentUserId) {
        // Reconnect to room when connection is restored
        setTimeout(() => this.connectToRoom(), 500);
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.chatService.leaveRoom(this.contextType, this.contextId);
  }

  private connectToRoom() {
    this.chatService.joinRoom(this.contextType, this.contextId);
  }

  private loadMessages() {
    this.isLoading = true;
    this.chatService.getMessageHistory(this.contextType, this.contextId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages) => {
          this.messages = messages;
          this.isLoading = false;
          this.scrollToBottom();
        },
        error: (error) => {
          console.error('Error loading messages:', error);
          this.isLoading = false;
        }
      });
  }

  private loadUserModerationStatus() {
    if (!this.currentUserId) return;
    
    this.chatService.getUserModerationStatus(this.contextType, this.contextId, this.currentUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          this.userSemaphoreColor = status.semaphore_color;
          this.userWarningCount = status.warning_count;
          this.isBanned = status.status === 'BANNED';
        },
        error: (error) => {
          console.error('Error loading moderation status:', error);
        }
      });
  }

  sendMessage() {
    if (this.messageForm.invalid || this.isBanned || this.isSending) return;

    this.isSending = true;
    const content = this.messageForm.get('content')?.value;

    this.chatService.sendMessage(this.contextType, this.contextId, content)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageForm.reset();
          this.isSending = false;
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.isSending = false;
          // Show error to user
        }
      });
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    }, 100);
  }

  trackByMessageId(index: number, message: ChatMessage): number {
    return message.id;
  }

  getSenderName(sender: any): string {
    if (sender.first_name) {
      return sender.first_name + (sender.last_name ? ` ${sender.last_name}` : '');
    }
    return sender.username;
  }

  formatTimestamp(timestamp: string): string {
    // Crear la fecha asegurando que se interprete como UTC
    const date = new Date(timestamp + (timestamp.endsWith('Z') ? '' : 'Z'));
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    // Mostrar hora local correcta
    return date.toLocaleString('es-ES', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Madrid' // Forzar zona horaria española
    });
  }

  getSemaphoreTooltip(): string {
    switch (this.userSemaphoreColor) {
      case 'grey': return 'No participando';
      case 'light_green': return 'Miembro pero nunca ha chateado';
      case 'dark_green': return 'Miembro activo';
      case 'yellow': return `${this.userWarningCount} advertencia(s)`;
      case 'red': return 'Suspendido';
      default: return '';
    }
  }

  openModerationModal() {
    if (this.selectedUserToWarn) {
      this.showModerationModal = true;
    }
  }

  closeModerationModal() {
    this.showModerationModal = false;
  }

  onWarningIssued(response: any) {
    console.log('Warning issued:', response);
    // Refresh moderation status
    if (this.currentUserId) {
      this.loadUserModerationStatus();
    }
  }

  onMessageClick(message: ChatMessage) {
    if (this.canModerate && message.sender_id !== this.currentUserId && !message.is_system) {
      this.chatService.getUserModerationStatus(this.contextType, this.contextId, message.sender.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (status) => {
            this.selectedUserToWarn = {
              id: message.sender.id,
              username: message.sender.username,
              first_name: message.sender.first_name,
              last_name: message.sender.last_name,
              warning_count: status.warning_count
            };
          },
          error: (error) => {
            console.error('Error fetching user moderation status:', error);
            // Fallback: show user with 0 warnings
            this.selectedUserToWarn = {
              id: message.sender.id,
              username: message.sender.username,
              first_name: message.sender.first_name,
              last_name: message.sender.last_name,
              warning_count: 0
            };
          }
        });
    }
  }
}