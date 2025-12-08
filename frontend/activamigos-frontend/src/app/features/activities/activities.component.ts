import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { CreateActivityModalComponent } from './create-activity-modal/create-activity-modal.component';
import { ActivityCardComponent } from './activity-card/activity-card.component';
import { ActivitiesService } from '../../core/services/activities.service';
import { Activity } from '../../core/models/activity.model';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ConfirmationModalComponent } from '../../shared/components/confirmation-modal/confirmation-modal.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [CommonModule, BottomNavComponent, CreateActivityModalComponent, ActivityCardComponent, MatSnackBarModule, ConfirmationModalComponent],
  templateUrl: './activities.component.html',
  styleUrls: ['./activities.component.scss']
})
export class ActivitiesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  activities: Activity[] = [];
  filteredActivities: Activity[] = [];
  searchTerm = '';
  
  isLoading = true; // Carga inicial global
  loadingActivityId: number | null = null; // Carga específica por tarjeta
  
  showCreateModal = false;
  errorMessage = '';

  // Usuario actual para comprobar permisos
  currentUserId: number | null = null;

  // Estado del Modal de Confirmación
  showLeaveModal = false;
  activityToLeave: Activity | null = null;
  leaveModalConfig = {
    title: '',
    message: '',
    type: 'warning' as 'warning' | 'danger' | 'info',
    confirmText: 'Sí, salir'
  };

  constructor(
    private router: Router,
    private activitiesService: ActivitiesService,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadActivities();

    // Obtener ID del usuario actual
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) this.currentUserId = user.id;
      });
  }

  loadActivities() {
    this.errorMessage = '';
    // No ponemos isLoading=true aquí para evitar "flash" si ya hay datos, 
    // solo en la primera carga o refresh manual
    if (this.activities.length === 0) this.isLoading = true;

    this.activitiesService.getActivities()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (activities) => {
          this.activities = activities;
          this.filterActivities();
        },
        error: (error) => {
          console.error('Error loading:', error);
          this.errorMessage = 'No hemos podido cargar las actividades.';
        }
      });
  }

  onSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.filterActivities();
  }

  filterActivities() {
    if (!this.searchTerm.trim()) {
      this.filteredActivities = this.activities;
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredActivities = this.activities.filter(a =>
        a.title.toLowerCase().includes(term) ||
        (a.description && a.description.toLowerCase().includes(term)) ||
        (a.location && a.location.toLowerCase().includes(term))
      );
    }
  }

  // --- Acciones de Tarjeta ---

  onJoinActivity(activityId: number) {
    this.loadingActivityId = activityId;
    
    this.activitiesService.joinActivity(activityId)
      .pipe(finalize(() => this.loadingActivityId = null))
      .subscribe({
        next: () => {
          this.showSnack('¡Te has apuntado! 🎉');
          this.loadActivities(); // Recargar para actualizar estado
        },
        error: () => this.showSnack('Error al apuntarse. Inténtalo luego.')
      });
  }

  onLeaveActivityClick(activityId: number) {
    const activity = this.activities.find(a => a.id === activityId);
    if (!activity) return;

    this.activityToLeave = activity;

    // CASO 1: Soy el Creador (Bloqueante)
    if (this.currentUserId === activity.created_by) {
      this.leaveModalConfig = {
        title: 'No puedes salir',
        message: 'Eres el organizador de esta actividad. No puedes salir de la actividad, pero puedes editarla desde los detalles.',
        type: 'info',
        confirmText: 'Entendido'
      };
    } 
    // CASO 2: Participante normal (Confirmación)
    else {
      this.leaveModalConfig = {
        title: `¿Quieres salir de la actividad "${activity.title}"?`,
        message: `¿Seguro que quieres dejar de participar en "${activity.title}"? Perderás tu plaza.`,
        type: 'danger',
        confirmText: 'Sí, quiero salir'
      };
    }

    this.showLeaveModal = true;
  }

  // Confirmación real
  confirmLeave() {
    // Si es solo info (creador), cerramos y ya
    if (this.leaveModalConfig.type === 'info') {
      this.showLeaveModal = false;
      return;
    }

    if (!this.activityToLeave) return;

    this.loadingActivityId = this.activityToLeave.id;
    
    this.activitiesService.leaveActivity(this.activityToLeave.id)
      .pipe(finalize(() => {
        this.loadingActivityId = null;
        this.showLeaveModal = false;
        this.activityToLeave = null;
      }))
      .subscribe({
        next: () => {
          this.showSnack('Te has dado de baja correctamente.');
          this.loadActivities();
        },
        error: () => this.showSnack('Error al salir de la actividad.')
      });
  }

  cancelLeave() {
    this.showLeaveModal = false;
    this.activityToLeave = null;
  }

  // --- Utilidades ---

  showSnack(message: string) {
    this.snackBar.open(message, 'OK', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['bg-gray-800', 'text-white'] // Clase simple si no usas estilos custom de material
    });
  }

  createActivity() { this.showCreateModal = true; }
  onCreateModalClose() { this.showCreateModal = false; }
  
  onActivityCreated() {
    this.showCreateModal = false;
    this.showSnack('¡Actividad creada con éxito!');
    this.loadActivities();
  }

  isActivityLoading(id: number): boolean { return this.loadingActivityId === id; }
  
  getMyActivities(): Activity[] {
    return this.filteredActivities.filter(a => a.is_participant);
  }

  getAvailableActivities(): Activity[] {
    return this.filteredActivities.filter(a => !a.is_participant);
  }

  goBack() { this.router.navigate(['/dashboard']); }
  
  trackByActivityId(index: number, activity: Activity): number { return activity.id; }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}