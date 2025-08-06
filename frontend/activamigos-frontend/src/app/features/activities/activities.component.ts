import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { CreateActivityModalComponent } from './create-activity-modal/create-activity-modal.component';
import { ActivityCardComponent } from './activity-card/activity-card.component';
import { ActivitiesService } from '../../core/services/activities.service';
import { Activity } from '../../core/models/activity.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [CommonModule, BottomNavComponent, CreateActivityModalComponent, ActivityCardComponent],
  templateUrl: './activities.component.html',
  styleUrls: ['./activities.component.scss']
})
export class ActivitiesComponent implements OnInit {
  activities$ = this.activitiesService.activities$;
  isLoading$ = this.activitiesService.isLoading$;
  showCreateModal = false;

  constructor(
    private router: Router,
    private activitiesService: ActivitiesService
  ) {}

  ngOnInit() {
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
        alert('Error al unirse a la actividad: ' + error.message);
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
        alert('Error al salir de la actividad: ' + error.message);
      }
    });
  }



  trackByActivityId(index: number, activity: Activity): number {
    return activity.id;
  }
}