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
  showPasswordHint = false;
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
      },
      error: (err) => {
        console.error('Error loading animals list:', err);
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  showPasswordHintModal() {
    const email = this.loginForm.get('username')?.value;
    if (!email || !email.includes('@')) {
      alert('Por favor, introduce tu email para ver la pista de contraseña');
      return;
    }

    this.authService.getPasswordHint(email).subscribe({
      next: (hint) => {
        this.passwordHint = hint;
        this.showPasswordHint = true;
      },
      error: (err) => {
        console.error('Error getting password hint:', err);
        alert('No se pudo obtener la pista de contraseña');
      }
    });
  }

  closePasswordHint() {
    this.showPasswordHint = false;
    this.passwordHint = null;
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