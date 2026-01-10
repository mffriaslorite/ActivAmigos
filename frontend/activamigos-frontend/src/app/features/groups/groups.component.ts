import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { GroupCardComponent } from './group-card/group-card.component';
import { CreateGroupModalComponent } from './create-group-modal/create-group-modal.component';
import { ConfirmationModalComponent } from '../../shared/components/confirmation-modal/confirmation-modal.component';
import { GroupsService } from '../../core/services/groups.service';
import { AuthService } from '../../core/services/auth.service';
import { Group, GroupCreate } from '../../core/models/group.model';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';


@Component({
    selector: 'app-groups',
    standalone: true,
    imports: [
        CommonModule, 
        BottomNavComponent, 
        GroupCardComponent, 
        CreateGroupModalComponent,
        ConfirmationModalComponent,
        MatSnackBarModule
    ],
    templateUrl: './groups.component.html',
    styleUrls: ['./groups.component.scss']
})
export class GroupsComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    
    groups: Group[] = [];
    filteredGroups: Group[] = [];
    searchTerm = '';
    isLoading = false;
    isModalVisible = false;
    isCreatingGroup = false;
    loadingGroupId: number | null = null;
    errorMessage = '';
    currentUserId: number | null = null;
    showLeaveModal = false;
    groupToLeave: Group | null = null;
    leaveModalConfig = {
      title: '',
      message: '',
      type: 'warning' as 'warning' | 'danger' | 'info',
      confirmText: 'Sí, salir'
    };

    constructor(
        private router: Router,
        private groupsService: GroupsService,
        private authService: AuthService,
        private snackBar: MatSnackBar,
    ) {}

    ngOnInit() {
        this.loadGroups();
        
        this.authService.currentUser$
            .pipe(takeUntil(this.destroy$))
            .subscribe(user => {
                if (user) this.currentUserId = user.id;
        });

        // Subscribe to groups changes
        this.groupsService.groups$
            .pipe(takeUntil(this.destroy$))
            .subscribe(groups => {
                this.groups = groups;
                this.filterGroups();
            });

        // Subscribe to loading state
        this.groupsService.isLoading$
            .pipe(takeUntil(this.destroy$))
            .subscribe(loading => {
                this.isLoading = loading;
            });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadGroups() {
        this.errorMessage = '';
        this.groupsService.getGroups()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                error: (error) => {
                    this.errorMessage = 'Error al cargar los grupos. Inténtalo de nuevo.';
                    console.error('Error loading groups:', error);
                }
            });
    }

    onSearch(event: Event) {
        const target = event.target as HTMLInputElement;
        this.searchTerm = target.value;
        this.filterGroups();
    }

    filterGroups() {
        if (!this.searchTerm.trim()) {
            this.filteredGroups = this.groups;
        } else {
            this.filteredGroups = this.groups.filter(group =>
                group.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                (group.description && group.description.toLowerCase().includes(this.searchTerm.toLowerCase()))
            );
        }
    }

    goBack() {
        this.router.navigate(['/dashboard']);
    }

    openCreateGroupModal() {
        this.isModalVisible = true;
    }

    closeCreateGroupModal() {
        this.isModalVisible = false;
    }

    onCreateGroup(groupData: GroupCreate) {
        this.isCreatingGroup = true;
        this.errorMessage = '';
        
        this.groupsService.createGroup(groupData)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.isCreatingGroup = false;
                    this.closeCreateGroupModal();
                },
                error: (error) => {
                    this.isCreatingGroup = false;
                    this.errorMessage = 'Error al crear el grupo. Inténtalo de nuevo.';
                    console.error('Error creating group:', error);
                }
            });
    }

    onJoinGroup(groupId: number) {
        this.loadingGroupId = groupId;
        this.errorMessage = '';
        
        this.groupsService.joinGroup(groupId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.loadingGroupId = null;
                },
                error: (error) => {
                    this.loadingGroupId = null;
                    this.errorMessage = 'Error al unirse al grupo. Inténtalo de nuevo.';
                    console.error('Error joining group:', error);
                }
            });
    }

    onLeaveGroup(groupId: number) {
        this.loadingGroupId = groupId;
        this.errorMessage = '';
        
        this.groupsService.leaveGroup(groupId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.loadingGroupId = null;
                },
                error: (error) => {
                    this.loadingGroupId = null;
                    this.errorMessage = 'Error al abandonar el grupo. Inténtalo de nuevo.';
                    console.error('Error leaving group:', error);
                }
            });
    }

    onLeaveGroupClick(groupId: number) {
        const group = this.groups.find(g => g.id === groupId);
        if (!group) return;
        
        this.groupToLeave = group;

        if (this.currentUserId === group.created_by) {
            this.leaveModalConfig = {
                title: 'Eres el creador',
                message: 'No puedes salir de tu propio grupo.',
                type: 'info',
                confirmText: 'Entendido'
            };
        } else {
            this.leaveModalConfig = {
                title: '¿Salir del grupo?',
                message: `¿Seguro que quieres dejar "${group.name}"?`,
                type: 'danger',
                confirmText: 'Sí, salir'
            };
        }
        this.showLeaveModal = true;
    }

    // Confirmación real de salida
    confirmLeave() {
        // Si es solo informativo (creador), cerramos
        if (this.leaveModalConfig.type === 'info') {
            this.showLeaveModal = false;
            return;
        }

        if (!this.groupToLeave) return;

        this.loadingGroupId = this.groupToLeave.id;
        
        this.groupsService.leaveGroup(this.groupToLeave.id)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => {
                    this.loadingGroupId = null;
                    this.showLeaveModal = false;
                    this.groupToLeave = null;
                })
            )
            .subscribe({
                next: () => {
                    this.showSnack('Te has dado de baja correctamente.');
                    this.loadGroups();
                },
                error: (error) => {
                    this.errorMessage = 'Error al abandonar el grupo.';
                }
            });
    }

    cancelLeave() {
        this.showLeaveModal = false;
        this.groupToLeave = null;
    }

    showSnack(message: string) {
        this.snackBar.open(message, 'OK', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['bg-gray-800', 'text-white']
        });
    }

    isGroupLoading(groupId: number): boolean {
        return this.loadingGroupId === groupId;
    }

    retryLoad() {
        this.loadGroups();
    }

    getMyGroups(): Group[] {
        return this.filteredGroups.filter(group => group.is_member);
    }

    getAvailableGroups(): Group[] {
        return this.filteredGroups.filter(group => !group.is_member);
    }
}