import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { CreateActivityModalComponent } from './create-activity-modal/create-activity-modal.component';
import { ActivityCardComponent } from './activity-card/activity-card.component';
import { ActivitiesService } from '../../core/services/activities.service';
import { Activity } from '../../core/models/activity.model';
import { Observable } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [CommonModule, BottomNavComponent, CreateActivityModalComponent, ActivityCardComponent],
  templateUrl: './activities.component.html',
  styleUrls: ['./activities.component.scss']
})
export class ActivitiesComponent implements OnInit {
  
  constructor(
    private router: Router,
    private activitiesService: ActivitiesService,
    private snackBar: MatSnackBar
  ) {}

  activities$!: Observable<Activity[]>;
  isLoading$!: Observable<boolean>;
  showCreateModal = false;

  ngOnInit() {
    this.activities$ = this.activitiesService.activities$;
    this.isLoading$ = this.activitiesService.isLoading$;
    this.loadActivities();
  }

  loadActivities() {
    this.activitiesService.getActivities().subscribe({
      next: (activities) => {
        console.log('Activities loaded:', activities);
      },
      error: (error) => {
        console.error('Error loading activities:', error);
      }
    });
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
    this.activitiesService.joinActivity(activityId).subscribe({
      next: (response) => {
        console.log('Joined activity:', response.message);
      },
      error: (error) => {
        console.error('Error joining activity:', error);
        this.snackBar.open('Error al unirse a la actividad: ' + error.message, 'Cerrar', {
          duration: 3000,
        });
      }
    });
  }

  onLeaveActivity(activityId: number) {
    this.activitiesService.leaveActivity(activityId).subscribe({
      next: (response) => {
        console.log('Left activity:', response.message);
      },
      error: (error) => {
        console.error('Error leaving activity:', error);
        this.snackBar.open('Error al salir de la actividad: ' + error.message, 'Cerrar', {
          duration: 3000,
        });
      }
    });
  }



  trackByActivityId(index: number, activity: Activity): number {
    return activity.id;
  }
}