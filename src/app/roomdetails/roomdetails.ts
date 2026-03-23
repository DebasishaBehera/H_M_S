import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-roomdetails',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './roomdetails.html',
  styleUrl: './roomdetails.css'
})
export class RoomdetailsComponent implements OnInit {
  roomId!: number;
  room: any;
  loading = true;
  message = '';

  booking = {
    checkInDate: '',
    checkOutDate: '',
    guests: 1
  };

  readonly today = new Date().toISOString().split('T')[0];
  activeDateField: 'checkInDate' | 'checkOutDate' | null = null;
  calendarMonth = this.startOfMonth(new Date());
  readonly weekDayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  bookedRanges: Array<{ start: Date; end: Date }> = [];

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.roomId = Number(this.route.snapshot.paramMap.get('id'));
    this.fetchRoomDetails();
  }

  get minCheckoutDate(): string {
    return this.addDays(this.booking.checkInDate || this.today, 1);
  }

  get stayNights(): number {
    if (!this.booking.checkInDate || !this.booking.checkOutDate) {
      return 0;
    }

    const checkIn = new Date(this.booking.checkInDate);
    const checkOut = new Date(this.booking.checkOutDate);
    const diff = checkOut.getTime() - checkIn.getTime();
    return diff > 0 ? Math.ceil(diff / 86400000) : 0;
  }

  get estimatedTotal(): number {
    return this.stayNights * Number(this.room?.pricePerNight || 0);
  }

  get canSubmitBooking(): boolean {
    return !!this.booking.checkInDate
      && !!this.booking.checkOutDate
      && this.stayNights > 0
      && this.booking.guests > 0
      && this.booking.guests <= Number(this.room?.capacity || this.booking.guests);
  }

  get messageTone(): 'success' | 'error' | 'info' {
    if (!this.message) {
      return 'info';
    }

    return this.message === 'Booking successful' ? 'success' : 'error';
  }

  fetchRoomDetails() {
    const token = localStorage.getItem('token');

    this.http.get(`http://localhost:8080/api/rooms/${this.roomId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).subscribe({
      next: (data) => {
        this.room = data;
        this.loadBookedRanges();
        this.loading = false;
      },
      error: () => {
        this.message = 'Room not found!';
        this.loading = false;
      }
    });
  }

  bookRoom(form: NgForm) {
    if (form.invalid) {
      this.message = 'Please fill in the required dates.';
      Object.values(form.controls).forEach(control => control.markAsTouched());
      return;
    }

    if (this.stayNights <= 0) {
      this.message = 'Check-out date must be after check-in date.';
      return;
    }

    if (this.booking.guests > Number(this.room?.capacity || 0)) {
      this.message = 'Selected guests exceed this room capacity.';
      return;
    }

    if (!this.auth.isLoggedIn()) {
      alert('Please login to continue booking.');
      this.router.navigate(['/login']);
      return;
    }

    // Match backend DTO: roomId + userEmail + dates + guests
    const bookingData = {
      roomId: this.roomId,
      userEmail: localStorage.getItem('email'),
      checkInDate: this.booking.checkInDate,
      checkOutDate: this.booking.checkOutDate,
      guests: this.booking.guests
    };

    this.http.post('http://localhost:8080/api/bookings', bookingData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    }).subscribe({
      next: () => {
        this.message = 'Booking successful';
        this.resetForm();
      },
      error: (err) => {
        console.log(err);
        // For this UI, always show a clear duplicate-dates style message
        this.message = 'Room already booked for selected dates';
      }
    });
  }

  onCheckInChange(): void {
    if (this.booking.checkOutDate && this.stayNights <= 0) {
      this.booking.checkOutDate = '';
    }

    this.message = '';
  }

  onCheckOutChange(): void {
    this.message = '';
  }

  openDatePicker(field: 'checkInDate' | 'checkOutDate', event?: Event): void {
    event?.stopPropagation();
    this.activeDateField = field;

    const selected = this.booking[field];
    this.calendarMonth = this.startOfMonth(selected ? this.parseIsoDate(selected) : new Date());
  }

  closeDatePicker(): void {
    this.activeDateField = null;
  }

  navigateMonth(offset: number, event?: Event): void {
    event?.stopPropagation();
    const next = new Date(this.calendarMonth);
    next.setMonth(next.getMonth() + offset);
    this.calendarMonth = this.startOfMonth(next);
  }

  get calendarMonthLabel(): string {
    return this.calendarMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }

  get calendarDays(): Array<Date | null> {
    const days: Array<Date | null> = [];
    const monthStart = this.startOfMonth(this.calendarMonth);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

    for (let i = 0; i < monthStart.getDay(); i += 1) {
      days.push(null);
    }

    for (let day = 1; day <= monthEnd.getDate(); day += 1) {
      days.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), day));
    }

    return days;
  }

  selectDate(day: Date, event?: Event): void {
    event?.stopPropagation();

    if (!this.activeDateField || this.isDateDisabled(day, this.activeDateField)) {
      return;
    }

    const iso = this.toIsoDate(day);

    if (this.activeDateField === 'checkInDate') {
      this.booking.checkInDate = iso;
      this.onCheckInChange();

      if (this.booking.checkOutDate && this.stayNights <= 0) {
        this.booking.checkOutDate = '';
      }
    } else {
      this.booking.checkOutDate = iso;
      this.onCheckOutChange();
    }

    this.closeDatePicker();
  }

  isDateSelected(day: Date): boolean {
    if (!this.activeDateField) {
      return false;
    }

    const selectedValue = this.booking[this.activeDateField];
    if (!selectedValue) {
      return false;
    }

    return this.toIsoDate(day) === selectedValue;
  }

  isDateDisabled(day: Date, field: 'checkInDate' | 'checkOutDate'): boolean {
    const iso = this.toIsoDate(day);

    if (iso < this.today) {
      return true;
    }

    if (field === 'checkOutDate' && this.booking.checkInDate && iso <= this.booking.checkInDate) {
      return true;
    }

    return this.isDateBooked(day);
  }

  isDateBooked(day: Date): boolean {
    return this.bookedRanges.some((range) => {
      const time = day.getTime();
      return time >= range.start.getTime() && time <= range.end.getTime();
    });
  }

  formatDateDisplay(value: string): string {
    if (!value) {
      return '';
    }

    const [year, month, day] = value.split('-');
    if (!year || !month || !day) {
      return value;
    }

    return `${day}-${month}-${year}`;
  }

  increaseGuests(): void {
    const capacity = Number(this.room?.capacity || this.booking.guests + 1);
    if (this.booking.guests < capacity) {
      this.booking.guests += 1;
    }
    this.message = '';
  }

  decreaseGuests(): void {
    if (this.booking.guests > 1) {
      this.booking.guests -= 1;
    }
    this.message = '';
  }

  resetForm() {
    this.booking = {
      checkInDate: '',
      checkOutDate: '',
      guests: 1
    };
  }

  private addDays(dateInput: string, days: number): string {
    const baseDate = new Date(`${dateInput}T00:00:00`);
    if (Number.isNaN(baseDate.getTime())) {
      return this.today;
    }

    baseDate.setDate(baseDate.getDate() + days);
    return baseDate.toISOString().split('T')[0];
  }

  private loadBookedRanges(): void {
    const token = localStorage.getItem('token');

    this.http.get<any[]>('http://localhost:8080/api/bookings', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).subscribe({
      next: (data) => {
        const bookings = Array.isArray(data) ? data : [];
        this.bookedRanges = bookings
          .filter((booking) => Number(booking?.room?.id || booking?.roomId) === this.roomId)
          .map((booking) => {
            const start = this.parseIsoDate(String(booking?.checkInDate || '').substring(0, 10));
            const end = this.parseIsoDate(String(booking?.checkOutDate || '').substring(0, 10));
            return { start, end };
          })
          .filter((range) => !Number.isNaN(range.start.getTime()) && !Number.isNaN(range.end.getTime()));
      },
      error: () => {
        this.bookedRanges = [];
      }
    });
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseIsoDate(value: string): Date {
    const [year, month, day] = value.split('-').map((part) => Number(part));
    return new Date(year, (month || 1) - 1, day || 1);
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.date-picker-wrap')) {
      this.closeDatePicker();
    }
  }
}
