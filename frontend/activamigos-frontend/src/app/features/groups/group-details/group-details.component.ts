import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';
import { GroupsService } from '../../../core/services/groups.service';
import { AuthService } from '../../../core/services/auth.service';
import { ModerationService } from '../../../core/services/moderation.service';
import { UserService } from '../../../core/services/user.service';
import { GroupDetails } from '../../../core/models/group.model';
import { ChatRoomComponent } from '../../../shared/components/chat/chat-room.component';
import { ConfirmationModalComponent } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { SemaphoreBadgeComponent } from '../../../shared/components/semaphore-badge/semaphore-badge.component';

@Component({
  selector: 'app-group-details',
  standalone: true,
  imports: [
    CommonModule, 
    ChatRoomComponent, 
    ConfirmationModalComponent, 
    SemaphoreBadgeComponent
  ],
  templateUrl: './group-details.component.html',
  styleUrls: ['./group-details.component.scss']
})
export class GroupDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  group: GroupDetails | null = null;
  currentUserId: number | null = null;
  
  // Estados de carga y UI
  isLoading = true;
  isActionLoading = false;
  activeTab: 'info' | 'chat' = 'info';
  
  // Semáforo Personal (Mi estado en este grupo)
  mySemaphoreColor: string | null = null;
  myWarningCount: number = 0;
  isBanned = false;

  // Modal de Salida
  showLeaveModal = false;
  leaveModalConfig = {
    title: '',
    message: '',
    type: 'warning' as 'warning' | 'danger' | 'info',
    confirmText: 'Sí, salir'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private groupsService: GroupsService,
    private authService: AuthService,
    private moderationService: ModerationService,
    private userService: UserService
  ) {}

  ngOnInit() {
    const groupId = this.route.snapshot.paramMap.get('id');
    if (groupId) {
      this.loadGroupDetails(parseInt(groupId, 10));
    }

    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) this.currentUserId = user.id;
      });
  }

  loadGroupDetails(id: number) {
    this.isLoading = true;
    this.groupsService.getGroupDetails(id)
      .pipe(
        takeUntil(this.destroy$), 
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (data) => {
          this.group = data;
          
          // Si soy miembro, cargo mi semáforo personal
          if (this.currentUserId && data.is_member) {
            this.loadMyStatus(id);
          }
        },
        error: () => {
          this.router.navigate(['/groups']); // Si falla, volver a la lista
        }
      });
  }

  // ✅ Cargar mi estado de moderación (Semáforo)
  loadMyStatus(groupId: number) {
    if (!this.currentUserId) return;

    this.moderationService.getMyStatus('GROUP', groupId, this.currentUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          this.mySemaphoreColor = status.semaphore_color;
          this.myWarningCount = status.warning_count;
          this.isBanned = status.status === 'BANNED';
        }
      });
  }

  // ✅ Acción de Unirse
  joinGroup() {
    if (!this.group || this.isActionLoading) return;
    this.isActionLoading = true;

    this.groupsService.joinGroup(this.group.id)
      .pipe(finalize(() => this.isActionLoading = false))
      .subscribe({
        next: () => {
          this.loadGroupDetails(this.group!.id); // Recargar para ver cambios
          this.activeTab = 'chat'; // Llevar al chat al unirse
        }
      });
  }

  // ✅ Acción de Salir (Inteligente)
  onLeaveClick() {
    if (!this.group) return;

    // 1. Soy el Creador -> No puedo salir
    if (this.currentUserId === this.group.created_by) {
      this.leaveModalConfig = {
        title: 'Eres el creador',
        message: 'No puedes salir de tu propio grupo. Si deseas eliminarlo, usa la opción de borrar.',
        type: 'info',
        confirmText: 'Entendido'
      };
    } 
    // 2. Miembro normal -> Confirmación
    else {
      this.leaveModalConfig = {
        title: '¿Salir del grupo?',
        message: `¿Seguro que quieres dejar "${this.group.name}"?`,
        type: 'danger',
        confirmText: 'Sí, salir'
      };
    }
    this.showLeaveModal = true;
  }

  confirmLeave() {
    if (this.leaveModalConfig.type === 'info') {
      this.showLeaveModal = false;
      return;
    }

    if (!this.group) return;
    this.isActionLoading = true;

    this.groupsService.leaveGroup(this.group.id)
      .pipe(finalize(() => {
        this.isActionLoading = false;
        this.showLeaveModal = false;
      }))
      .subscribe({
        next: () => {
          this.loadGroupDetails(this.group!.id);
          this.activeTab = 'info'; // Volver a info al salir
        }
      });
  }

  // Helpers Visuales
  getGroupIcon(): string {
    if (!this.group) return '👥';
    const name = this.group.name.toLowerCase();
    if (name.includes('lectura')) return '📚';
    if (name.includes('deporte')) return '⚽';
    if (name.includes('cocina')) return '👨‍🍳';
    if (name.includes('arte')) return '🎨';
    if (name.includes('música')) return '🎵';
    return '👥';
  }

  goBack() {
    this.router.navigate(['/groups']);
  }

  setTab(tab: 'info' | 'chat') {
    this.activeTab = tab;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getUserAvatarUrl(userId: number): string {
    return this.userService.getProfileImageUrl(userId);
  }

  // ✅ HELPER PARA ERROR DE CARGA (Opcional, o se maneja en HTML)
  handleImageError(event: any) {
    event.target.style.display = 'none'; // Ocultar img rota
    // El elemento hermano (iniciales) se mostrará porque la img está oculta/rota
    // O mejor, controlamos con variable en el *ngFor, pero lo más simple es en HTML.
  }

}