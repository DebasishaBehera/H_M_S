import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { trigger, transition, style, animate, query, group } from '@angular/animations';
import { Navbar } from './navbar/navbar';
import { Footer } from './footer/footer';
import { ChatbotComponent } from './chatbot/chatbot';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Navbar, Footer, ChatbotComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  animations: [
    trigger('authRouteTransition', [
      transition('login <=> signup, login <=> admin-login, signup <=> admin-login', [
        query(':leave', [
          style({
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            width: '100%'
          })
        ], { optional: true }),
        group([
          query(':leave', [
            animate('360ms cubic-bezier(0.22, 0.61, 0.36, 1)', style({ opacity: 0, transform: 'translateY(18px)' }))
          ], { optional: true }),
          query(':enter', [
            style({ opacity: 0, transform: 'translateY(-14px)' }),
            animate('460ms 80ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
          ], { optional: true })
        ])
      ])
    ])
  ]
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('angular-frontend');
  protected readonly showStartupLoader = signal(true);
  protected readonly isLoaderClosing = signal(false);

  private readonly minLoaderDurationMs = 4000;
  private readonly maxLoaderDurationMs = 12000;
  private readonly loaderExitDurationMs = 650;
  private minDurationElapsed = false;
  private pageLoaded = false;
  private minimumTimerId?: number;
  private fallbackTimerId?: number;
  private hideTimerId?: number;
  private loadListener = () => {
    this.pageLoaded = true;
    this.tryHideLoader();
  };

  ngOnInit(): void {
    this.minimumTimerId = window.setTimeout(() => {
      this.minDurationElapsed = true;
      this.tryHideLoader();
    }, this.minLoaderDurationMs);

    this.fallbackTimerId = window.setTimeout(() => {
      this.startHideLoader();
    }, this.maxLoaderDurationMs);

    if (document.readyState === 'complete') {
      this.pageLoaded = true;
      this.tryHideLoader();
      return;
    }

    window.addEventListener('load', this.loadListener, { once: true });
  }

  ngOnDestroy(): void {
    if (this.minimumTimerId !== undefined) {
      window.clearTimeout(this.minimumTimerId);
    }
    if (this.fallbackTimerId !== undefined) {
      window.clearTimeout(this.fallbackTimerId);
    }
    if (this.hideTimerId !== undefined) {
      window.clearTimeout(this.hideTimerId);
    }
    window.removeEventListener('load', this.loadListener);
  }

  prepareRoute(outlet: RouterOutlet): string {
    return outlet?.activatedRouteData?.['animation'] ?? '';
  }

  private tryHideLoader(): void {
    if (!this.showStartupLoader()) {
      return;
    }
    if (this.pageLoaded && this.minDurationElapsed) {
      this.startHideLoader();
      if (this.fallbackTimerId !== undefined) {
        window.clearTimeout(this.fallbackTimerId);
      }
    }
  }

  private startHideLoader(): void {
    if (!this.showStartupLoader() || this.isLoaderClosing()) {
      return;
    }

    this.isLoaderClosing.set(true);
    this.hideTimerId = window.setTimeout(() => {
      this.showStartupLoader.set(false);
      this.isLoaderClosing.set(false);
    }, this.loaderExitDurationMs);
  }
}
