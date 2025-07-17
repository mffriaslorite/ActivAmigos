import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <!-- Hero Section -->
      <div class="relative overflow-hidden">
        <!-- Navigation -->
        <nav class="relative z-10 px-6 pt-6">
          <div class="mx-auto max-w-7xl flex items-center justify-between">
            <div class="flex items-center">
              <h1 class="text-2xl font-bold text-primary-900">ActivAmigos</h1>
            </div>
            <div class="flex space-x-4">
              <button 
                (click)="navigateToLogin()" 
                class="text-blue-700 hover:text-blue-900 font-medium px-4 py-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-all duration-200">
                Iniciar Sesión
              </button>
              <button 
                (click)="navigateToRegister()" 
                class="btn-primary">
                Registrarse
              </button>
            </div>
          </div>
        </nav>

        <!-- Hero Content -->
        <div class="relative z-10 px-6 py-20">
          <div class="mx-auto max-w-7xl">
            <div class="grid lg:grid-cols-2 gap-12 items-center">
              <!-- Left Content -->
              <div class="fade-in">
                <h2 class="text-5xl font-bold text-gray-900 mb-6">
                  Conecta, Actívate y 
                  <span class="text-blue-600">Haz Amigos</span>
                </h2>
                <p class="text-xl text-gray-700 mb-8 leading-relaxed">
                  La plataforma social diseñada especialmente para adultos que buscan mantenerse activos, 
                  conocer nuevas personas y disfrutar de actividades grupales en su comunidad.
                </p>
                <div class="flex flex-col sm:flex-row gap-4">
                  <button 
                    (click)="navigateToRegister()" 
                    class="btn-primary text-lg px-8 py-4">
                    Únete Ahora
                  </button>
                  <button 
                    (click)="scrollToFeatures()" 
                    class="btn-secondary text-lg px-8 py-4">
                    Descubre Más
                  </button>
                </div>
              </div>

              <!-- Right Content - Hero Image/Illustration -->
              <div class="slide-up">
                <div class="relative">
                  <div class="bg-blue-200 rounded-2xl p-8 h-96 flex items-center justify-center">
                    <div class="text-center">
                      <div class="text-6xl mb-4">🤝</div>
                      <p class="text-blue-800 font-medium text-lg">
                        Encuentra tu comunidad activa
                      </p>
                    </div>
                  </div>
                  <!-- Floating elements -->
                  <div class="absolute -top-4 -right-4 bg-blue-500 text-white p-3 rounded-full">
                    🏃‍♀️
                  </div>
                  <div class="absolute -bottom-4 -left-4 bg-green-500 text-white p-3 rounded-full">
                    🧘‍♂️
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Features Section -->
      <div id="features" class="py-20 bg-white">
        <div class="mx-auto max-w-7xl px-6">
          <div class="text-center mb-16">
            <h3 class="text-3xl font-bold text-gray-900 mb-4">
              ¿Por qué elegir ActivAmigos?
            </h3>
            <p class="text-xl text-gray-600 max-w-2xl mx-auto">
              Diseñado pensando en las necesidades de los adultos modernos que valoran la conexión social y el bienestar.
            </p>
          </div>

          <div class="grid md:grid-cols-3 gap-8">
            <!-- Feature 1 -->
            <div class="card text-center hover:shadow-lg transition-shadow duration-200">
              <div class="text-4xl mb-4">👥</div>
              <h4 class="text-xl font-semibold text-gray-900 mb-3">Grupos por Intereses</h4>
              <p class="text-gray-600">
                Únete a grupos basados en tus pasatiempos, deportes favoritos o actividades que te interesen.
              </p>
            </div>

            <!-- Feature 2 -->
            <div class="card text-center hover:shadow-lg transition-shadow duration-200">
              <div class="text-4xl mb-4">📅</div>
              <h4 class="text-xl font-semibold text-gray-900 mb-3">Eventos Locales</h4>
              <p class="text-gray-600">
                Descubre y participa en actividades cerca de ti, desde clases de yoga hasta torneos deportivos.
              </p>
            </div>

            <!-- Feature 3 -->
            <div class="card text-center hover:shadow-lg transition-shadow duration-200">
              <div class="text-4xl mb-4">🏆</div>
              <h4 class="text-xl font-semibold text-gray-900 mb-3">Metas Compartidas</h4>
              <p class="text-gray-600">
                Establece objetivos de bienestar y compártelos con amigos para mantener la motivación.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- CTA Section -->
      <div class="py-20 bg-blue-600">
        <div class="mx-auto max-w-7xl px-6 text-center">
          <h3 class="text-3xl font-bold text-white mb-4">
            ¿Listo para comenzar tu aventura social?
          </h3>
          <p class="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Únete a miles de adultos que ya están disfrutando de una vida más activa y conectada.
          </p>
          <button 
            (click)="navigateToRegister()" 
            class="bg-white text-blue-600 hover:bg-gray-100 font-medium py-4 px-8 rounded-lg text-lg transition-colors duration-200">
            Crear Cuenta Gratis
          </button>
        </div>
      </div>

      <!-- Footer -->
      <footer class="bg-gray-900 text-white py-12">
        <div class="mx-auto max-w-7xl px-6">
          <div class="text-center">
            <h4 class="text-2xl font-bold mb-4">ActivAmigos</h4>
            <p class="text-gray-400 mb-6">
              Conectando adultos a través de actividades y experiencias compartidas.
            </p>
            <div class="flex justify-center space-x-6">
              <a href="#" class="text-gray-400 hover:text-white transition-colors duration-200">Privacidad</a>
              <a href="#" class="text-gray-400 hover:text-white transition-colors duration-200">Términos</a>
              <a href="#" class="text-gray-400 hover:text-white transition-colors duration-200">Contacto</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: []
})
export class LandingComponent {
  constructor(private router: Router) {}

  navigateToLogin() {
    this.router.navigate(['/auth/login']);
  }

  navigateToRegister() {
    this.router.navigate(['/auth/register']);
  }

  scrollToFeatures() {
    const element = document.getElementById('features');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}