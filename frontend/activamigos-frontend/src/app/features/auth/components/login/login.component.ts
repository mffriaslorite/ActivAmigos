import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute ,RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  showPassword = false;
  showHint = false;
  hintData: { hint: string; animals: string[] } | null = null;
  errorMessage = '';
  isLoading = false;

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

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  showPasswordHint() {
    const username = this.loginForm.get('username')?.value;
    if (!username) {
      this.errorMessage = 'Por favor ingresa tu nombre de usuario o email primero';
      return;
    }

    // If username looks like email, use it directly, otherwise try to get hint
    const email = username.includes('@') ? username : '';
    
    if (email) {
      this.isLoading = true;
      this.authService.getPasswordHint(email).subscribe({
        next: (response) => {
          this.hintData = response;
          this.showHint = true;
          this.isLoading = false;
        },
        error: (err) => {
          // Show generic hint even if user not found for security
          this.hintData = { 
            hint: "¿Cuál es tu animal favorito?", 
            animals: ['gato', 'perro', 'elefante', 'león', 'tigre', 'oso', 'conejo', 'caballo', 'pájaro', 'pez']
          };
          this.showHint = true;
          this.isLoading = false;
        }
      });
    } else {
      // Show generic hint for username
      this.hintData = { 
        hint: "¿Cuál es tu animal favorito?", 
        animals: ['gato', 'perro', 'elefante', 'león', 'tigre', 'oso', 'conejo', 'caballo', 'pájaro', 'pez']
      };
      this.showHint = true;
    }
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';
    const credentials = this.loginForm.value;
    
    this.authService.login(credentials).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Error al iniciar sesión';
        console.error('Error en login:', err.message);
      }
    });
  }

  goBack() {
    this.router.navigate(['/']);
  }

}
