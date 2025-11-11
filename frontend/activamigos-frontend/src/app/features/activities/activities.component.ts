import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { CreateActivityModalComponent } from './create-activity-modal/create-activity-modal.component';
import { ActivityCardComponent } from './activity-card/activity-card.component';
import { ActivitiesService } from '../../core/services/activities.service';
import { Activity } from '../../core/models/activity.model';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [CommonModule, BottomNavComponent, CreateActivityModalComponent, ActivityCardComponent],
  templateUrl: './activities.component.html',
  styleUrls: ['./activities.component.scss']
})
export class ActivitiesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  activities: Activity[] = [];
  filteredActivities: Activity[] = [];
  searchTerm = '';
  isLoading = false;
  showCreateModal = false;
  isCreatingActivity = false;
  loadingActivityId: number | null = null;
  errorMessage = '';

  constructor(
    private router: Router,
    private activitiesService: ActivitiesService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadActivities();
    
    // Subscribe to activities changes
    this.activitiesService.activities$
      .pipe(takeUntil(this.destroy$))
      .subscribe(activities => {
        this.activities = activities;
        this.filterActivities();
      });

    // Subscribe to loading state
    this.activitiesService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.isLoading = loading;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadActivities() {
    this.errorMessage = '';
    this.activitiesService.getActivities()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          this.errorMessage = 'Error al cargar las actividades. Inténtalo de nuevo.';
          console.error('Error loading activities:', error);
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
      this.filteredActivities = this.activities.filter(activity =>
        activity.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (activity.description && activity.description.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (activity.location && activity.location.toLowerCase().includes(this.searchTerm.toLowerCase()))
      );
    }
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  createActivity() {
    this.showCreateModal = true;
  }

  onCreateModalClose() {
    this.showCreateModal = false;
  }

  onActivityCreated() {
    this.showCreateModal = false;
    this.loadActivities();
  }

  navigateToActivity(activityId: number) {
    this.router.navigate(['/activities', activityId]);
  }

  onJoinActivity(activityId: number) {
    this.loadingActivityId = activityId;
    this.errorMessage = '';
    
    this.activitiesService.joinActivity(activityId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loadingActivityId = null;
          console.log('Joined activity:', response.message);
        },
        error: (error) => {
          this.loadingActivityId = null;
          this.errorMessage = 'Error al unirse a la actividad. Inténtalo de nuevo.';
          console.error('Error joining activity:', error);
          this.snackBar.open('Error al unirse a la actividad: ' + error.message, 'Cerrar', {
            duration: 3000,
          });
        }
      });
  }

  onLeaveActivity(activityId: number) {
    this.loadingActivityId = activityId;
    this.errorMessage = '';
    
    this.activitiesService.leaveActivity(activityId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loadingActivityId = null;
          console.log('Left activity:', response.message);
        },
        error: (error) => {
          this.loadingActivityId = null;
          this.errorMessage = 'Error al salir de la actividad. Inténtalo de nuevo.';
          console.error('Error leaving activity:', error);
          this.snackBar.open('Error al salir de la actividad: ' + error.message, 'Cerrar', {
            duration: 3000,
          });
        }
      });
  }

  isActivityLoading(activityId: number): boolean {
    return this.loadingActivityId === activityId;
  }

  retryLoad() {
    this.loadActivities();
  }

  getMyActivities(): Activity[] {
    return this.filteredActivities.filter(activity => activity.is_participant);
  }

  getAvailableActivities(): Activity[] {
    return this.filteredActivities.filter(activity => !activity.is_participant);
  }

  trackByActivityId(index: number, activity: Activity): number {
    return activity.id;
  }
}