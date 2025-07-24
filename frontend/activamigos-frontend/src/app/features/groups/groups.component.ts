import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';

@Component({
    selector: 'app-groups',
    standalone: true,
    imports: [CommonModule, BottomNavComponent],
    templateUrl: './groups.component.html',
    styleUrls: ['./groups.component.scss']
})
export class GroupsComponent {
    constructor(private router: Router) {}

    goBack() {
        this.router.navigate(['/dashboard']);
    }

    createGroup() {
        alert('Crear Nuevo Grupo - Funcionalidad próximamente');
    }
}