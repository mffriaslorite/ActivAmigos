import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  // Asegúrate de que environment.apiUrl sea 'http://localhost:5000/api'
private apiUrl = `${environment.apiUrl}/api`;

  constructor() {}

  /**
   * Genera la URL para la imagen de perfil de un usuario.
   * Añadimos un timestamp falso (?t=...) si quisiéramos evitar caché, 
   * pero para listas de grupos mejor dejar que el navegador cachee.
   */
  getProfileImageUrl(userId: number): string {
    // Ajusta '/users/' según el prefix de tu backend (user o users)
    return `${this.apiUrl}/user/${userId}/image`;
  }
}