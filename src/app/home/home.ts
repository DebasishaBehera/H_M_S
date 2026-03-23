import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  hotelName = 'Grand Paradise Hotel';
  features = [
    { icon: '🛏️', title: 'Luxury Rooms', desc: 'Comfortable and spacious rooms for your stay.' },
    { icon: '🍽️', title: 'Restaurant', desc: 'Multi-cuisine dining experience with 24x7 service.' },
    { icon: '🏊', title: 'Swimming Pool', desc: 'Relax and refresh in our crystal clear pool.' },
    { icon: '🚗', title: 'Free Parking', desc: 'Secure parking for all guests.' }
  ];

  stayOptions = [
    {
      id: 'business',
      title: 'Business Comfort',
      tagline: 'Work-ready rooms with quiet focus zones.',
      details: 'High-speed Wi-Fi, ergonomic workspace, express laundry, and airport transfer support.'
    },
    {
      id: 'family',
      title: 'Family Escape',
      tagline: 'Spacious stays designed for shared moments.',
      details: 'Interconnected room options, kid-friendly meals, board games, and poolside evenings.'
    },
    {
      id: 'romantic',
      title: 'Romantic Retreat',
      tagline: 'Private, elegant, and memorable by design.',
      details: 'Candlelight dining setup, spa for couples, floral decor, and curated local experiences.'
    }
  ];

  selectedStay = this.stayOptions[0];

  spaces = [
    { icon: '💪', title: 'Fitness Studio', desc: 'Modern cardio and strength zone with coach support.' },
    { icon: '🧖', title: 'Spa & Wellness', desc: 'Aromatherapy, deep tissue care, and relaxation rituals.' },
    { icon: '💇', title: 'Style Parlor', desc: 'Salon services for grooming before meetings or events.' },
    { icon: '☕', title: 'Sky Lounge', desc: 'Sunset mocktails, snacks, and city-view corners.' },
    { icon: '🎮', title: 'Game Nook', desc: 'Indoor games and family entertainment all day.' },
    { icon: '🧺', title: 'Laundry Express', desc: 'Quick, same-day laundry and pressing assistance.' },
    { icon: '📚', title: 'Library Studio', desc: 'Quiet reading corner with a curated collection of books.' },
    { icon: '🧸', title: 'Kids Play Area', desc: 'Safe and engaging indoor play zones for toddlers.' }
  ];

  testimonials = [
    {
      name: 'Ritika S.',
      role: 'Weekend traveler',
      quote: 'The room ambiance, food quality, and staff behavior made our short trip feel premium.'
    },
    {
      name: 'Arjun M.',
      role: 'Business guest',
      quote: 'Strong Wi-Fi, smooth check-in, and peaceful workspaces. Exactly what I needed.'
    },
    {
      name: 'Neha & Kunal',
      role: 'Anniversary stay',
      quote: 'The spa and evening dining setup were beautiful. We are definitely coming back.'
    }
  ];

  faqs = [
    {
      question: 'What are check-in and check-out timings?',
      answer: 'Standard check-in is 2:00 PM and check-out is 11:00 AM. Early check-in can be requested based on availability.'
    },
    {
      question: 'Do you provide airport pickup and drop?',
      answer: 'Yes. We provide paid airport transfer. Share your travel details after booking for quick coordination.'
    },
    {
      question: 'Are gym, spa, and pool open for all guests?',
      answer: 'Yes. Gym and pool access are included for in-house guests. Spa services are available at additional charges.'
    },
    {
      question: 'Can I modify or cancel my reservation?',
      answer: 'You can edit or cancel from My Bookings, subject to your selected room policy and cancellation window.'
    }
  ];

  openFaqIndex = 0;

  chooseStay(stayId: string): void {
    const match = this.stayOptions.find((stay) => stay.id === stayId);
    if (match) {
      this.selectedStay = match;
    }
  }

  toggleFaq(index: number): void {
    this.openFaqIndex = this.openFaqIndex === index ? -1 : index;
  }
}
