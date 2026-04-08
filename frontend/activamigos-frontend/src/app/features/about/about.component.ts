import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

type AboutPerson = {
  role: string;
  name: string;
  shortBio: string;
  githubUrl: string;
  initials: string;
  accentClass: string;
};

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent {
  readonly people: AboutPerson[] = [
    {
      role: 'Creador del proyecto',
      name: 'Tu nombre aquí',
      shortBio: 'Estudiante y desarrollador principal de ActivAmigos. Sustituye este texto por una presentación breve, cercana y clara.',
      githubUrl: 'https://github.com/tu-usuario',
      initials: 'TN',
      accentClass: 'about-avatar--indigo'
    },
    {
      role: 'Tutor académico',
      name: 'Nombre del tutor aquí',
      shortBio: 'Profesor y tutor del trabajo. Puedes usar este espacio para explicar su papel en la guía del proyecto y la parte académica.',
      githubUrl: 'https://github.com/usuario-del-tutor',
      initials: 'TT',
      accentClass: 'about-avatar--emerald'
    }
  ];
}
