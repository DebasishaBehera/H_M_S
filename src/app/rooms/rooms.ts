import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth';
import { Room } from '../models/room';

@Component({
  selector: 'app-rooms',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './rooms.html',
  styleUrl: './rooms.css'
})
export class RoomsComponent implements OnInit {
  rooms: Room[] = [];
  loading = true;
  error = '';

  checkInDate = '';
  checkOutDate = '';
  searchTerm = '';
  selectedType = 'all';
  sortBy = 'recommended';

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetchRooms();
  }

  get roomTypes(): string[] {
    return Array.from(
      new Set(
        this.rooms
          .map((room) => this.getRoomType(room))
          .filter((type) => !!type)
      )
    );
  }

  get displayedRooms(): Room[] {
    const normalizedSearch = this.searchTerm.trim().toLowerCase();

    const filteredRooms = this.rooms.filter((room) => {
      const roomName = this.getRoomName(room).toLowerCase();
      const roomType = this.getRoomType(room).toLowerCase();
      const roomDescription = this.getRoomDescription(room).toLowerCase();
      const matchesSearch = !normalizedSearch
        || roomName.includes(normalizedSearch)
        || roomType.includes(normalizedSearch)
        || roomDescription.includes(normalizedSearch);
      const matchesType = this.selectedType === 'all'
        || roomType === this.selectedType.toLowerCase();

      return matchesSearch && matchesType;
    });

    return filteredRooms.sort((first, second) => {
      if (this.sortBy === 'price-low') {
        return this.getRoomPrice(first) - this.getRoomPrice(second);
      }

      if (this.sortBy === 'price-high') {
        return this.getRoomPrice(second) - this.getRoomPrice(first);
      }

      if (this.sortBy === 'name') {
        return this.getRoomName(first).localeCompare(this.getRoomName(second));
      }

      return 0;
    });
  }

  get hasDateFilter(): boolean {
    return !!(this.checkInDate || this.checkOutDate);
  }

  get averageRoomPrice(): number {
    if (!this.displayedRooms.length) {
      return 0;
    }

    const total = this.displayedRooms.reduce((sum, room) => sum + this.getRoomPrice(room), 0);
    return Math.round(total / this.displayedRooms.length);
  }

  get canSearchDates(): boolean {
    return !!this.checkInDate && !!this.checkOutDate;
  }

  fetchRooms() {
    const token = localStorage.getItem('token');

    this.http.get('http://localhost:8080/api/rooms', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).subscribe({
      next: (data: any) => {
        console.log('Rooms from API:', data);
        this.rooms = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Unable to load rooms. Please try again later.';
        this.loading = false;
      }
    });
  }

  findRooms() {
    if (!this.checkInDate || !this.checkOutDate) {
      this.error = 'Please select both check-in and check-out dates.';
      return;
    }

    if (this.checkOutDate <= this.checkInDate) {
      this.error = 'Check-out date must be after check-in date.';
      return;
    }

    this.loading = true;
    this.error = '';

    const url = `http://localhost:8080/api/rooms/available?checkIn=${this.checkInDate}&checkOut=${this.checkOutDate}`;

    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        this.rooms = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Unable to find available rooms. Please try again later.';
        this.loading = false;
      }
    });
  }

  clearFilter() {
    this.checkInDate = '';
    this.checkOutDate = '';
    this.error = '';
    this.loading = true;
    this.fetchRooms();
  }

  clearViewFilters(): void {
    this.searchTerm = '';
    this.selectedType = 'all';
    this.sortBy = 'recommended';
  }

  getRoomName(room: Room): string {
    return room.name || room.type || `Room ${room.room_number}`;
  }

  getRoomDescription(room: Room): string {
    return room.description || `Room number ${room.room_number}`;
  }

  getRoomType(room: Room): string {
    return room.type || '';
  }

  getRoomPrice(room: Room): number {
    return Number(room.pricePerNight || room.price || 0);
  }

  openRoomBooking(room: Room): void {
    if (room?.id === undefined || room?.id === null) {
      return;
    }

    this.router.navigate(['/rooms', room.id]);
  }
}
