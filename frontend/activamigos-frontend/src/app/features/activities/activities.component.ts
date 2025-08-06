import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { CreateActivityModalComponent } from './create-activity-modal/create-activity-modal.component';
import { ActivitiesService } from '../../core/services/activities.service';
import { Activity } from '../../core/models/activity.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [CommonModule, BottomNavComponent, CreateActivityModalComponent],
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

  joinActivity(activity: Activity, event: Event) {
    event.stopPropagation();
    
    if (activity.is_participant) {
      this.leaveActivity(activity);
    } else {
      this.activitiesService.joinActivity(activity.id).subscribe({
        next: (response) => {
          console.log('Joined activity:', response.message);
        },
        error: (error) => {
          console.error('Error joining activity:', error);
          alert('Error al unirse a la actividad: ' + error.message);
        }
      });
    }
  }

  leaveActivity(activity: Activity) {
    this.activitiesService.leaveActivity(activity.id).subscribe({
      next: (response) => {
        console.log('Left activity:', response.message);
      },
      error: (error) => {
        console.error('Error leaving activity:', error);
        alert('Error al salir de la actividad: ' + error.message);
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getActivityEmoji(title: string): string {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('deporte') || titleLower.includes('fútbol') || titleLower.includes('correr')) return '⚽';
    if (titleLower.includes('cocina') || titleLower.includes('cocinar') || titleLower.includes('comida')) return '🍳';
    if (titleLower.includes('arte') || titleLower.includes('pintar') || titleLower.includes('dibujo')) return '🎨';
    if (titleLower.includes('música') || titleLower.includes('cantar') || titleLower.includes('baile')) return '🎵';
    if (titleLower.includes('juego') || titleLower.includes('jugar')) return '🎮';
    if (titleLower.includes('lectura') || titleLower.includes('leer') || titleLower.includes('libro')) return '📚';
    if (titleLower.includes('cine') || titleLower.includes('película') || titleLower.includes('película')) return '🎬';
    if (titleLower.includes('parque') || titleLower.includes('naturaleza') || titleLower.includes('jardín')) return '🌳';
    return '🎯';
  }

  trackByActivityId(index: number, activity: Activity): number {
    return activity.id;
  }
}