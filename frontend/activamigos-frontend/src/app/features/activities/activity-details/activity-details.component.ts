import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';
import { ActivitiesService } from '../../../core/services/activities.service';
import { ActivityDetails, ActivityParticipant } from '../../../core/models/activity.model';
import { ChatRoomComponent } from '../../../shared/components/chat/chat-room.component';
import { SemaphoreBadgeComponent } from '../../../shared/components/semaphore-badge/semaphore-badge.component';
import { ModerationModalComponent, UserToWarn } from '../../../shared/components/moderation-modal/moderation-modal.component';
import { AttendanceService } from '../../../core/services/attendance.service';
import { RulesService } from '../../../core/services/rules.service';
import { AuthService } from '../../../core/services/auth.service';
import { ModerationService } from '../../../core/services/moderation.service';
import { AttendanceModalComponent } from '../../../shared/components/attendance-modal/attendance-modal.component';
import { ConfirmationModalComponent } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { RulesSelectorComponent } from '../../../shared/components/rules-selector/rules-selector.component';

@Component({
  selector: 'app-activity-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChatRoomComponent,
    SemaphoreBadgeComponent,
    ModerationModalComponent,
    AttendanceModalComponent,
    ConfirmationModalComponent,
    RulesSelectorComponent
  ],
  templateUrl: './activity-details.component.html',
  styleUrls: ['./activity-details.component.scss']
})
export class ActivityDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  activityDetails: ActivityDetails | null = null;

  isLoading = true;
  isActionLoading = false;
  isEditingActivity = false;
  feedbackMessage = '';
  feedbackType: 'success' | 'error' | '' = '';
  showDeleteModal = false;
  editActivityData = {
    title: '',
    description: '',
    activity_type: '',
    location: '',
    date: ''
  };

  currentUserId: number | null = null;
  activeTab: 'info' | 'chat' = 'info';
  chatRoom: { type: string; id: number; name: string } | null = null;

  showRulesSelector = false;
  activityRules: any[] = [];
  canManageRules = false;

  showAttendanceMarking = false;
  showAttendanceConfirmationModal = false;
  showModerationModal = false;
  selectedUserToWarn: UserToWarn | null = null;
  canModerate = false;

  mySemaphoreColor: string | null = null;
  myWarningCount = 0;
  isBanned = false;

  activityTypes = [
    { value: 'sport', label: 'Deporte', icon: '⚽' },
    { value: 'social', label: 'Social', icon: '👥' },
    { value: 'culture', label: 'Cultura', icon: '🎭' },
    { value: 'academic', label: 'Estudios', icon: '📚' },
    { value: 'other', label: 'Otro', icon: '🌈' }
  ];

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

    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.currentUserId = user.id;
          this.canManageRules = user.role === 'ORGANIZER' || user.role === 'SUPERADMIN';
          this.canModerate = user.role === 'ORGANIZER' || user.role === 'SUPERADMIN';
        }
      });

    if (activityId) {
      this.loadActivityDetails(parseInt(activityId, 10));
    } else {
      this.router.navigate(['/activities']);
    }
  }

  get isCreator(): boolean {
    return !!this.activityDetails && this.currentUserId === this.activityDetails.created_by;
  }

  loadActivityDetails(activityId: number) {
    this.isLoading = true;
    this.feedbackMessage = '';

    this.activitiesService.getActivityDetails(activityId)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoading = false))
      .subscribe({
        next: (details) => {
          this.activityDetails = details;
          this.resetEditActivityData();
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
        error: () => {
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
        error: (error) => console.warn('Error loading structured rules', error)
      });
  }

  getRuleIds(): number[] {
    return this.activityRules.map(rule => rule.id);
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
      const message = willAttend ? 'Asistencia confirmada.' : 'Gracias por avisar.';
      this.showFeedback(message, 'success');
    }
  }

  startEditingActivity() {
    if (!this.activityDetails) return;
    this.resetEditActivityData();
    this.isEditingActivity = true;
  }

  cancelEditingActivity() {
    this.isEditingActivity = false;
    this.resetEditActivityData();
  }

  saveActivityChanges() {
    if (!this.activityDetails || this.isActionLoading) return;

    const title = this.editActivityData.title.trim();
    if (!title || !this.editActivityData.date) {
      this.showFeedback('Completa el título y la fecha.', 'error');
      return;
    }

    const selectedDate = new Date(this.editActivityData.date);
    if (selectedDate < new Date()) {
      this.showFeedback('La fecha no puede ser anterior a este momento.', 'error');
      return;
    }

    this.isActionLoading = true;
    this.activitiesService.updateActivity(this.activityDetails.id, {
      title,
      description: this.editActivityData.description.trim(),
      activity_type: this.editActivityData.activity_type,
      location: this.editActivityData.location.trim(),
      date: selectedDate.toISOString()
    })
      .pipe(finalize(() => this.isActionLoading = false))
      .subscribe({
        next: () => {
          this.isEditingActivity = false;
          this.loadActivityDetails(this.activityDetails!.id);
          this.showFeedback('Actividad actualizada.', 'success');
        },
        error: () => this.showFeedback('No hemos podido guardar los cambios.', 'error')
      });
  }

  openRulesEditor() {
    this.showRulesSelector = true;
  }

  openDeleteModal() {
    this.showDeleteModal = true;
  }

  confirmDeleteActivity() {
    if (!this.activityDetails || this.isActionLoading) return;

    this.isActionLoading = true;
    this.activitiesService.deleteActivity(this.activityDetails.id)
      .pipe(finalize(() => {
        this.isActionLoading = false;
        this.showDeleteModal = false;
      }))
      .subscribe({
        next: () => this.router.navigate(['/activities']),
        error: () => this.showFeedback('No hemos podido borrar la actividad.', 'error')
      });
  }

  showFeedback(message: string, type: 'success' | 'error') {
    this.feedbackMessage = message;
    this.feedbackType = type;

    setTimeout(() => {
      if (this.feedbackMessage === message) {
        this.feedbackMessage = '';
      }
    }, 5000);
  }

  getActivityIcon(): string {
    if (!this.activityDetails) return '🎯';
    if (this.activityDetails.activity_type === 'sport') return '⚽';
    if (this.activityDetails.activity_type === 'social') return '👥';
    if (this.activityDetails.activity_type === 'culture') return '🎭';
    if (this.activityDetails.activity_type === 'academic') return '📚';
    if (this.activityDetails.activity_type === 'other') return '🌟';

    const title = this.activityDetails.title.toLowerCase();
    if (title.includes('fútbol') || title.includes('futbol') || title.includes('deporte')) return '⚽';
    if (title.includes('cocina')) return '🍳';
    if (title.includes('arte') || title.includes('pintar')) return '🎨';
    if (title.includes('música') || title.includes('musica')) return '🎵';
    return '🌟';
  }

  getActivityTypeInfo() {
    const activityType = this.activityDetails?.activity_type;

    switch (activityType) {
      case 'sport': return { icon: '⚽', label: 'Deporte' };
      case 'social': return { icon: '👥', label: 'Social' };
      case 'culture': return { icon: '🎭', label: 'Cultura' };
      case 'academic': return { icon: '📚', label: 'Estudios' };
      case 'other': return { icon: '🌈', label: 'Otro' };
      default: return null;
    }
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

    const targetDate = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
    return new Date(targetDate).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  parseRules(): string[] {
    if (!this.activityDetails?.rules) return [];

    return this.activityDetails.rules.split('\n')
      .map(rule => rule.replace(/^[-•*]\s*/, '').trim())
      .filter(rule => rule.length > 0);
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  goToLinkedGroup() {
    if (!this.activityDetails?.group_id) return;
    this.router.navigate(['/groups', this.activityDetails.group_id]);
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

  onWarningIssued(_response: any) {
    if (this.activityDetails) {
      this.loadActivityDetails(this.activityDetails.id);
    }
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

  private resetEditActivityData() {
    if (!this.activityDetails) return;

    this.editActivityData = {
      title: this.activityDetails.title || '',
      description: this.activityDetails.description || '',
      activity_type: this.activityDetails.activity_type || '',
      location: this.activityDetails.location || '',
      date: this.toLocalDateTimeInput(this.activityDetails.date)
    };
  }

  private toLocalDateTimeInput(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return localDate.toISOString().slice(0, 16);
  }
}
