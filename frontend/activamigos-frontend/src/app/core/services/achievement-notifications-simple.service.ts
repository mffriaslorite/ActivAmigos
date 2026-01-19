import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AchievementService } from './achievements.service';
import { Achievement } from '../models/achivement.model';

@Injectable({
  providedIn: 'root'
})
export class AchievementNotificationsSimpleService {
  // Estado: ¿Hay logros sin ver? (Para el punto rojo)
  private hasUnreadAchievementsSubject = new BehaviorSubject<boolean>(false);
  hasUnreadAchievements$ = this.hasUnreadAchievementsSubject.asObservable();

  constructor(private achievementService: AchievementService) {
    this.startListening();
  }

  private startListening() {
    // Escuchamos logros desbloqueados en tiempo real
    this.achievementService.achievementUnlocked$.subscribe((achievement: Achievement) => {
      if (achievement) {
        console.log('🏆 Logro silencioso desbloqueado:', achievement.title);
        this.notifyNewAchievement();
      }
    });
  }

  // Activa el punto rojo
  notifyNewAchievement() {
    this.hasUnreadAchievementsSubject.next(true);
  }

  // Apaga el punto rojo (se llamará al entrar al perfil)
  clearNotification() {
    this.hasUnreadAchievementsSubject.next(false);
  }
}