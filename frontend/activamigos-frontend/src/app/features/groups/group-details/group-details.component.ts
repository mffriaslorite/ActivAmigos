import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';
import { GroupsService } from '../../../core/services/groups.service';
import { ActivitiesService } from '../../../core/services/activities.service';
import { AuthService } from '../../../core/services/auth.service';
import { ModerationService } from '../../../core/services/moderation.service';
import { UserService } from '../../../core/services/user.service';
import { GroupDetails } from '../../../core/models/group.model';
import { RulesService } from '../../../core/services/rules.service';
import { ChatRoomComponent } from '../../../shared/components/chat/chat-room.component';
import { ConfirmationModalComponent } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { SemaphoreBadgeComponent } from '../../../shared/components/semaphore-badge/semaphore-badge.component';
import { RulesSelectorComponent } from '../../../shared/components/rules-selector/rules-selector.component';

@Component({
  selector: 'app-group-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChatRoomComponent,
    ConfirmationModalComponent,
    SemaphoreBadgeComponent,
    RulesSelectorComponent
  ],
  templateUrl: './group-details.component.html',
  styleUrls: ['./group-details.component.scss']
})
export class GroupDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  group: GroupDetails | null = null;
  currentUserId: number | null = null;
  editGroupData = {
    name: '',
    description: ''
  };
  groupRules: any[] = [];
  showRulesSelector = false;

  isLoading = true;
  isActionLoading = false;
  isEditingGroup = false;
  activeTab: 'info' | 'chat' = 'info';

  mySemaphoreColor: string | null = null;
  myWarningCount = 0;
  isBanned = false;

  showLeaveModal = false;
  showDeleteModal = false;
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
    private activitiesService: ActivitiesService,
    private authService: AuthService,
    private moderationService: ModerationService,
    private userService: UserService,
    private rulesService: RulesService
  ) {}

  ngOnInit() {
    const groupId = this.route.snapshot.paramMap.get('id');

    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.currentUserId = user.id;
        }
      });

    if (groupId) {
      this.loadGroupDetails(parseInt(groupId, 10));
    }
  }

  get isCreator(): boolean {
    return !!this.group && this.currentUserId === this.group.created_by;
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
          this.resetEditGroupData();
          this.loadGroupRules(id);

          if (this.currentUserId && data.is_member) {
            this.loadMyStatus(id);
          }
        },
        error: () => {
          this.router.navigate(['/groups']);
        }
      });
  }

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

  joinGroup() {
    if (!this.group || this.isActionLoading) return;

    this.isActionLoading = true;
    this.groupsService.joinGroup(this.group.id)
      .pipe(finalize(() => this.isActionLoading = false))
      .subscribe({
        next: () => {
          this.loadGroupDetails(this.group!.id);
          this.activeTab = 'chat';
        }
      });
  }

  onLeaveClick() {
    if (!this.group) return;

    if (this.isCreator) {
      this.leaveModalConfig = {
        title: 'Eres la persona creadora',
        message: 'No puedes salir de tu propio grupo. Si ya no lo necesitas, puedes borrarlo.',
        type: 'info',
        confirmText: 'Entendido'
      };
    } else {
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
          this.activeTab = 'info';
        }
      });
  }

  startEditingGroup() {
    if (!this.group) return;
    this.resetEditGroupData();
    this.isEditingGroup = true;
  }

  cancelEditingGroup() {
    this.isEditingGroup = false;
    this.resetEditGroupData();
  }

  saveGroupChanges() {
    if (!this.group || this.isActionLoading) return;

    const name = this.editGroupData.name.trim();
    if (!name) return;

    this.isActionLoading = true;
    this.groupsService.updateGroup(this.group.id, {
      name,
      description: this.editGroupData.description.trim()
    })
      .pipe(finalize(() => this.isActionLoading = false))
      .subscribe({
        next: () => {
          this.isEditingGroup = false;
          this.loadGroupDetails(this.group!.id);
        }
      });
  }

  loadGroupRules(groupId: number) {
    this.rulesService.getGroupRules(groupId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.groupRules = response.rules || [];
        },
        error: () => {
          this.groupRules = [];
        }
      });
  }

  getGroupRuleIds(): number[] {
    return this.groupRules.map(rule => rule.id);
  }

  onRulesSaved(ruleIds: number[]) {
    if (!this.group) return;

    this.rulesService.attachGroupRules(this.group.id, ruleIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showRulesSelector = false;
          this.loadGroupRules(this.group!.id);
        }
      });
  }

  openDeleteModal() {
    this.showDeleteModal = true;
  }

  confirmDeleteGroup() {
    if (!this.group || this.isActionLoading) return;

    this.isActionLoading = true;
    this.groupsService.deleteGroup(this.group.id)
      .pipe(finalize(() => {
        this.isActionLoading = false;
        this.showDeleteModal = false;
      }))
      .subscribe({
        next: () => this.router.navigate(['/groups'])
      });
  }

  getGroupIcon(): string {
    if (!this.group) return '👥';

    const name = this.group.name.toLowerCase();
    if (name.includes('lectura')) return '📚';
    if (name.includes('deporte')) return '⚽';
    if (name.includes('cocina')) return '👨‍🍳';
    if (name.includes('arte')) return '🎨';
    if (name.includes('música') || name.includes('musica')) return '🎵';

    return '👥';
  }

  getActivityIcon(activityType?: string): string {
    switch (activityType) {
      case 'sport': return '⚽';
      case 'social': return '👥';
      case 'culture': return '🎭';
      case 'academic': return '📚';
      case 'other': return '🌈';
      default: return '📅';
    }
  }

  getActivityImageSrc(activityId: number, imageUrl?: string | null): string | null {
    if (!imageUrl) return null;
    return this.activitiesService.getActivityImageSrc(activityId, imageUrl);
  }

  goBack() {
    if (this.activeTab === 'chat') {
      this.activeTab = 'info';
      return;
    }
    this.router.navigate(['/groups']);
  }

  goToActivity(activityId: number) {
    this.router.navigate(['/activities', activityId]);
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

  handleImageError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.style.display = 'none';
  }

  private resetEditGroupData() {
    if (!this.group) return;

    this.editGroupData = {
      name: this.group.name || '',
      description: this.group.description || ''
    };
  }
}
