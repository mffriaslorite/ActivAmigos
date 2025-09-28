import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { PasswordHint } from '../../../../core/models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  showPassword = false;
  showPasswordHint = true; // Siempre mostrar la pista
  passwordHint: PasswordHint | null = null;
  animalsList: string[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
      remember_me: [false]
    });
  }

  ngOnInit() {
    // Load animals list for password hints
    this.authService.getAnimalsList().subscribe({
      next: (response) => {
        this.animalsList = response.animals;
        // Set up the password hint to show animals by default
        this.passwordHint = {
          hint_available: true,
          hint_type: 'ANIMAL_LIST',
          animals: response.animals
        };
      },
      error: (err) => {
        console.error('Error loading animals list:', err);
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }


  onSubmit() {
    if (this.loginForm.invalid) return;

    const credentials = this.loginForm.value;
    this.authService.login(credentials).subscribe({
      next: (res) => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('Error en login:', err.message);
      }
    });
  }


  goBack() {
    this.router.navigate(['/']);
  }

}