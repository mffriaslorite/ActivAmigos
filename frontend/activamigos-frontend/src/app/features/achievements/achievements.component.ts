import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';
import { forkJoin } from 'rxjs';
import { AchievementService } from '../../core/services/achievements.service';
import { Achievement, GamificationState } from '../../core/models/achivement.model';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-achievements',
  standalone: true,
  imports: [CommonModule, BottomNavComponent],
  templateUrl: './achievements.component.html',
  styleUrls: ['./achievements.component.scss']
})
export class AchievementsComponent implements OnInit {
  // Lista completa para mostrar
  allAchievements: Achievement[] = [];
  
  // IDs de los que ya tengo
  unlockedAchievementIds: Set<number> = new Set();
  
  // Estado del usuario
  myState: GamificationState | null = null;
  
  isLoading = true;

  constructor(
    private achievementsService: AchievementService,
    public location: Location
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    
    // Llamamos a los dos endpoints a la vez
    forkJoin({
      catalog: this.achievementsService.getAllAchievements(),
      myState: this.achievementsService.getGamificationState()
    }).subscribe({
      next: (response) => {
        this.allAchievements = response.catalog;
        this.myState = response.myState;
        
        // Creamos un Set con los IDs obtenidos para búsqueda rápida
        this.unlockedAchievementIds = new Set(
          response.myState.earned_achievements.map(ua => ua.achievement_id) // Ojo: achievement_id o achievement.id según venga del backend
        );
        
        // Parche de seguridad: si el array viene vacío (mapper), intentamos map manual
        if (this.unlockedAchievementIds.size === 0 && response.myState.earned_achievements.length > 0) {
             response.myState.earned_achievements.forEach(ua => {
                 // A veces viene el objeto entero 'achievement'
                 if (ua.achievement && ua.achievement.id) this.unlockedAchievementIds.add(ua.achievement.id);
                 // O a veces la ID directa
                 else if (ua.achievement_id) this.unlockedAchievementIds.add(ua.achievement_id);
             });
        }

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando logros:', err);
        this.isLoading = false;
      }
    });
  }

  isUnlocked(achievementId: number): boolean {
    return this.unlockedAchievementIds.has(achievementId);
  }

  // Obtener fecha de obtención (si existe)
  getUnlockDate(achievementId: number): string | null {
    if (!this.myState) return null;
    const found = this.myState.earned_achievements.find(ua => 
        (ua.achievement && ua.achievement.id === achievementId) || 
        ua.achievement_id === achievementId
    );
    return found ? found.date_earned : null;
  }
}