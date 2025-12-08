import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';
import { ActivitiesService } from '../../../core/services/activities.service';
import { ActivityDetails, ActivityParticipant } from '../../../core/models/activity.model';
import { ChatRoomComponent } from '../../../shared/components/chat/chat-room.component';
import { SemaphoreBadgeComponent } from '../../../shared/components/semaphore-badge/semaphore-badge.component';
import { ModerationModalComponent, UserToWarn } from '../../../shared/components/moderation-modal/moderation-modal.component';
import { RulesSelectorComponent } from '../../../shared/components/rules-selector/rules-selector.component';
import { AttendanceService } from '../../../core/services/attendance.service';
import { RulesService } from '../../../core/services/rules.service';
import { AuthService } from '../../../core/services/auth.service';
import { ModerationService } from '../../../core/services/moderation.service';
import { AttendanceModalComponent } from '../../../shared/components/attendance-modal/attendance-modal.component';

@Component({
  selector: 'app-activity-details',
  standalone: true,
  imports: [CommonModule, ChatRoomComponent, SemaphoreBadgeComponent, RulesSelectorComponent, ModerationModalComponent, AttendanceModalComponent],
  templateUrl: './activity-details.component.html',
  styleUrls: ['./activity-details.component.scss']
})
export class ActivityDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  activityDetails: ActivityDetails | null = null;
  
  // Estados de interfaz
  isLoading = true;
  isActionLoading = false;
  feedbackMessage = '';
  feedbackType: 'success' | 'error' | '' = '';
  
  // Chat y Pestañas
  currentUserId: number | null = null;
  // CAMBIO: Solo 2 pestañas ahora
  activeTab: 'info' | 'chat' = 'info';
  chatRoom: { type: string; id: number; name: string } | null = null;
  
  // Reglas
  showRulesSelector = false;
  activityRules: any[] = [];
  canManageRules = false;
  
  // Moderación y Asistencia
  showAttendanceMarking = false;
  showAttendanceConfirmationModal = false;
  showModerationModal = false;
  selectedUserToWarn: UserToWarn | null = null;
  canModerate = false;

  mySemaphoreColor: string | null = null;
  myWarningCount: number = 0;
  isBanned = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private activitiesService: ActivitiesService,
    private authService: AuthService,
    private attendanceService: AttendanceService,
    private rulesService: RulesService,
    private moderationService: ModerationService
  ) {}

  ngOnInit() {
    const activityId = this.route.snapshot.paramMap.get('id');
    if (activityId) {
      this.loadActivityDetails(parseInt(activityId, 10));
    } else {
      this.router.navigate(['/activities']);
    }

    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.currentUserId = user.id;
          this.canManageRules = user.role === 'ORGANIZER' || user.role === 'SUPERADMIN';
          this.canModerate = user.role === 'ORGANIZER' || user.role === 'SUPERADMIN';
        }
      });
  }

  loadActivityDetails(activityId: number) {
    this.isLoading = true;
    this.feedbackMessage = '';

    this.activitiesService.getActivityDetails(activityId)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoading = false))
      .subscribe({
        next: (details) => {
          this.activityDetails = details;
          console.log(this.activityDetails.attendance_status);
          this.chatRoom = {
            type: 'ACTIVITY',
            id: activityId,
            name: details.title
          };

          if (this.currentUserId && details.is_participant) {
            this.loadMyStatus(activityId);
          }

          this.loadActivityRules(activityId);
        },
        error: (error) => {
          console.error('Error loading details:', error);
          this.showFeedback('No hemos podido cargar la actividad.', 'error');
        }
      });
  }

  loadActivityRules(activityId: number) {
    this.rulesService.getActivityRules(activityId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.activityRules = response.rules || [];
        },
        error: (e) => console.warn('Error loading structured rules', e)
      });
  }

  getRuleIds(): number[] {
    return this.activityRules.map(r => r.id);
  }

  loadMyStatus(activityId: number) {
    if (!this.currentUserId) return;

    this.moderationService.getMyStatus('ACTIVITY', activityId, this.currentUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          this.mySemaphoreColor = status.semaphore_color;
          this.myWarningCount = status.warning_count;
          this.isBanned = status.status === 'BANNED';
        }
      });
  }

  // --- Acciones ---
  joinActivity() {
    if (!this.activityDetails || this.isActionLoading) return;

    this.isActionLoading = true;
    this.feedbackMessage = ''; 

    this.activitiesService.joinActivity(this.activityDetails.id)
      .pipe(finalize(() => this.isActionLoading = false))
      .subscribe({
        next: (response) => {
          if (this.activityDetails) {
            this.activityDetails.is_participant = true;
            this.activityDetails.participant_count = response.participant_count;
            this.loadActivityDetails(this.activityDetails.id);
            this.showFeedback('¡Te has apuntado correctamente!', 'success');
          }
        },
        error: () => this.showFeedback('No hemos podido apuntarte.', 'error')
      });
  }

  leaveActivity() {
    if (!this.activityDetails || this.isActionLoading) return;
    
    this.isActionLoading = true;

    this.activitiesService.leaveActivity(this.activityDetails.id)
      .pipe(finalize(() => this.isActionLoading = false))
      .subscribe({
        next: (response) => {
          if (this.activityDetails) {
            this.activityDetails.is_participant = false;
            this.activityDetails.participant_count = response.participant_count;
            this.showFeedback('Te has dado de baja.', 'success');
          }
        },
        error: () => this.showFeedback('Error al salir.', 'error')
      });
  }

  openAttendanceConfirmation() {
    this.showAttendanceConfirmationModal = true;
  }

  closeAttendanceConfirmation() {
    this.showAttendanceConfirmationModal = false;
  }

  onAttendanceConfirmed(willAttend: boolean) {
    this.showAttendanceConfirmationModal = false;
    if (this.activityDetails) {
       this.loadActivityDetails(this.activityDetails.id);
       const msg = willAttend ? 'Asistencia confirmada.' : 'Gracias por avisar.';
       this.showFeedback(msg, 'success');
    }
  }

  showFeedback(message: string, type: 'success' | 'error') {
    this.feedbackMessage = message;
    this.feedbackType = type;
    setTimeout(() => {
      if (this.feedbackMessage === message) this.feedbackMessage = '';
    }, 5000);
  }

  getActivityIcon(): string {
    if (!this.activityDetails) return '🎯';
    const t = this.activityDetails.title.toLowerCase();
    if (t.includes('fútbol') || t.includes('deporte')) return '⚽';
    if (t.includes('cocina')) return '🍳';
    if (t.includes('arte') || t.includes('pintar')) return '🎨';
    if (t.includes('música')) return '🎵';
    return '🌟';
  }

  getParticipantStatusLabel(status: string) {
    switch (status) {
      case 'confirmed': return { icon: '✅', text: 'Va a ir', class: 'text-green-700 bg-green-100' };
      case 'attended': return { icon: '🏆', text: 'Asistió', class: 'text-green-800 bg-green-200' };
      case 'declined': return { icon: '❌', text: 'No va', class: 'text-gray-500 bg-gray-100' };
      case 'absent': return { icon: '⚠️', text: 'Faltó', class: 'text-red-700 bg-red-100' };
      default: return { icon: '⏳', text: 'Pendiente', class: 'text-yellow-700 bg-yellow-100' };
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const targetDate = dateString.endsWith('Z') ? dateString : dateString + 'Z';
    return new Date(targetDate).toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
    });
  }

  parseRules(): string[] {
    if (!this.activityDetails?.rules) return [];
    return this.activityDetails.rules.split('\n')
      .map(r => r.replace(/^[-•*]\s*/, '').trim())
      .filter(r => r.length > 0);
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  setTab(tab: 'info' | 'chat') {
    this.activeTab = tab;
  }

  openModerationModal(participant: ActivityParticipant) {
    this.selectedUserToWarn = {
      id: participant.id,
      username: participant.username,
      first_name: participant.first_name,
      last_name: participant.last_name,
      warning_count: 0
    };
    this.showModerationModal = true;
  }

  onWarningIssued(response: any) {
    if (this.activityDetails) this.loadActivityDetails(this.activityDetails.id);
    this.showFeedback('Advertencia enviada.', 'success');
  }

  closeModerationModal() {
    this.showModerationModal = false;
  }
  
  onRulesSaved(ruleIds: number[]) {
    if (!this.activityDetails) return;
    this.rulesService.attachActivityRules(this.activityDetails.id, ruleIds)
      .subscribe({
        next: () => {
          this.showRulesSelector = false;
          this.loadActivityRules(this.activityDetails!.id);
          this.showFeedback('Reglas guardadas.', 'success');
        },
        error: () => this.showFeedback('Error al guardar reglas.', 'error')
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}