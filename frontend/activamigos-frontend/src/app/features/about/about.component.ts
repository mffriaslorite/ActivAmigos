import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

type AboutPerson = {
  role: string;
  name: string;
  shortBio: string;
  githubUrl: string;
  imagePath: string;
  imageAlt: string;
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
      name: 'Manuel Fco. Frías Lorite',
      shortBio: 'Estudiante y desarrollador principal de ActivAmigos, proyecto realizado como Trabajo Fin de Grado con foco en accesibilidad, participación social y uso sencillo desde móvil.',
      githubUrl: 'https://github.com/mffriaslorite',
      imagePath: 'img/about-manuel.jpg',
      imageAlt: 'Fotografía del desarrollador principal Manuel Fco. Frías Lorite',
      initials: 'MF',
      accentClass: 'about-avatar--indigo'
    },
    {
      role: 'Tutor académico',
      name: 'Miguel Gea Mejías',
      shortBio: 'Profesor y tutor académico del Trabajo Fin de Grado, encargado de la supervisión, orientación metodológica y seguimiento del desarrollo del proyecto.',
      githubUrl: 'https://github.com/mgea/',
      imagePath: 'img/about-tutor.jpg',
      imageAlt: 'Fotografía del tutor académico Miguel Gea Mejías',
      initials: 'MG',
      accentClass: 'about-avatar--emerald'
    }
  ];
}
