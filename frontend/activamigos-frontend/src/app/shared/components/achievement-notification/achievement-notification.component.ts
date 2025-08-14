import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AchievementNotification } from '../../../core/services/achievement-notifications-simple.service';

@Component({
  selector: 'app-achievement-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="achievement-notification"
      [@slideIn]="animationState"
      [class.show]="isVisible"
      (click)="onNotificationClick()"
    >
      <div class="notification-content">
        <!-- Icon -->
        <div class="achievement-icon">
          <div class="icon-glow"></div>
          <span class="text-2xl">🏆</span>
        </div>
        
        <!-- Content -->
        <div class="notification-text">
          <div class="notification-title">
            ¡Logro Desbloqueado!
          </div>
          <div class="achievement-title">
            {{ notification.title }}
          </div>
          <div class="achievement-description">
            {{ notification.description }}
          </div>
          <div class="points-reward" *ngIf="notification.points > 0">
            +{{ notification.points }} puntos
          </div>
        </div>
        
        <!-- Close button -->
        <button 
          class="close-btn"
          (click)="onCloseClick($event)"
          aria-label="Cerrar notificación"
        >
          ×
        </button>
      </div>
      
      <!-- Progress bar for auto-dismiss -->
      <div class="progress-bar" [@progressBar]="animationState"></div>
    </div>
  `,
  styleUrls: ['./achievement-notification.component.scss'],
  animations: [
    trigger('slideIn', [
      state('hidden', style({
        transform: 'translateX(100%)',
        opacity: 0
      })),
      state('visible', style({
        transform: 'translateX(0)',
        opacity: 1
      })),
      transition('hidden => visible', [
        animate('300ms ease-out')
      ]),
      transition('visible => hidden', [
        animate('200ms ease-in')
      ])
    ]),
    trigger('progressBar', [
      state('hidden', style({
        width: '100%'
      })),
      state('visible', style({
        width: '0%'
      })),
      transition('visible => *', [
        animate('5000ms linear')
      ])
    ])
  ]
})
export class AchievementNotificationComponent implements OnInit, OnDestroy {
  @Input() notification!: AchievementNotification;
  @Input() autoDismiss: boolean = true;
  @Input() dismissAfter: number = 5000; // 5 seconds
  @Output() dismiss = new EventEmitter<string>();
  @Output() click = new EventEmitter<AchievementNotification>();

  isVisible = false;
  animationState: 'hidden' | 'visible' = 'hidden';
  private autoDismissTimer?: number;

  ngOnInit(): void {
    // Show notification after a brief delay
    setTimeout(() => {
      this.show();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
    }
  }

  private show(): void {
    this.isVisible = true;
    this.animationState = 'visible';

    if (this.autoDismiss) {
      this.autoDismissTimer = window.setTimeout(() => {
        this.hide();
      }, this.dismissAfter);
    }
  }

  private hide(): void {
    this.animationState = 'hidden';

    setTimeout(() => {
      this.isVisible = false;
      this.dismiss.emit(this.notification.id);
    }, 200);
  }

  onNotificationClick(): void {
    this.click.emit(this.notification);
  }

  onCloseClick(event: Event): void {
    event.stopPropagation();
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
    }
    this.hide();
  }
}