import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ChatService } from '../../../core/services/chat.service';
import { ActivitiesService } from '../../../core/services/activities.service';
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
  templateUrl: `./chat-room.component.html`,
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
    private authService: AuthService,
    private activitiesService: ActivitiesService
  ) {
    this.messageForm = this.fb.group({
      content: ['', [Validators.required, Validators.maxLength(500)]]
    });
  }

  ngOnInit() {
    // Get current user
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.currentUserId = user?.id || null;
      // Primero, por rol global
      this.canModerate = user?.role === 'ORGANIZER' || user?.role === 'SUPERADMIN';
      
      if (user && this.contextId) {
        this.loadUserModerationStatus();
        this.initializeChat();

        // Si es chat de actividad, comprobar también el rol en la actividad
        if (this.contextType === 'ACTIVITY') {
          this.activitiesService.getUserRoleInActivity(this.contextId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response) => {
                if (response.role === 'organizer') {
                  this.canModerate = true;
                }
              },
              error: (error) => {
                console.error('Error loading user activity role:', error);
              }
            });
        }
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