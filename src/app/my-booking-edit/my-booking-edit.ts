import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-my-booking-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './my-booking-edit.html',
  styleUrl: './my-booking-edit.css'
})
export class MyBookingEditComponent implements OnInit {
  form: any = {
    id: null,
    roomId: null,
    roomLabel: '',
    checkInDate: '',
    checkOutDate: '',
    guests: 1
  };

  // Maximum guests allowed for this room (from backend)
  roomCapacity: number | null = null;

  loading = false;
  message = '';
  error = '';
  readonly today = new Date().toISOString().split('T')[0];
  activeDateField: 'checkInDate' | 'checkOutDate' | null = null;
  calendarMonth = this.startOfMonth(new Date());
  readonly weekDayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  bookedRanges: Array<{ start: Date; end: Date }> = [];

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.auth.isAdmin()) {
      this.router.navigate(['/admin/bookings']);
      return;
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'Invalid booking id.';
      return;
    }

    this.loadBooking(id);
  }

  private get authHeaders(): Record<string, string | string[]> | undefined {
    const token = localStorage.getItem('token');
    if (!token) {
      return undefined;
    }

    return { Authorization: `Bearer ${token}` };
  }

  loadBooking(id: string): void {
    this.loading = true;
    this.error = '';

    this.http.get(`http://localhost:8080/api/bookings/${id}`, {
      headers: this.authHeaders
    }).subscribe({
      next: (data: any) => {
        if (this.getBookingEmail(data) !== this.auth.getUserEmail().toLowerCase()) {
          this.error = 'You can only edit your own bookings.';
          this.loading = false;
          return;
        }

        this.form.id = data.id;
        this.form.roomId = Number(data.room?.id || data.roomId || null);
        this.form.roomLabel = data.room?.name || data.roomName || (data.roomId ? `Room #${data.roomId}` : 'Room');
        this.form.checkInDate = (data.checkInDate || '').substring(0, 10);
        this.form.checkOutDate = (data.checkOutDate || '').substring(0, 10);
        this.form.guests = data.guests ?? 1;

        const capacity = Number(
          data.room?.capacity ??
          (data.roomCapacity as number | undefined) ??
          (data.capacity as number | undefined) ??
          NaN
        );
        this.roomCapacity = Number.isFinite(capacity) && capacity > 0 ? capacity : null;
        this.loadBookedRanges();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = err?.error?.message || 'Failed to load booking.';
        this.loading = false;
      }
    });
  }

  updateBooking(): void {
    if (!this.form.id) {
      return;
    }

    this.message = '';
    this.error = '';

    if (this.stayNights <= 0) {
      this.error = 'Check-out date must be at least one day after check-in date.';
      return;
    }

    if (Number(this.form.guests) < 1) {
      this.error = 'Guests must be at least 1.';
      return;
    }

    if (this.roomCapacity !== null && Number(this.form.guests) > this.roomCapacity) {
      this.error = `Guests cannot exceed room capacity (max ${this.roomCapacity}).`;
      return;
    }

    const body = {
      checkInDate: this.form.checkInDate,
      checkOutDate: this.form.checkOutDate,
      guests: this.form.guests
    };

    this.http.put(`http://localhost:8080/api/bookings/${this.form.id}`, body, {
      headers: this.authHeaders
    }).subscribe({
      next: () => {
        this.router.navigate(['/my-bookings'], {
          state: { message: 'Booking updated successfully.' }
        });
      },
      error: (err) => {
        console.error(err);
        if (err?.status === 403) {
          this.error = 'Room already booked for selected dates.';
          return;
        }

        this.error = err?.error?.message || 'Failed to update booking.';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/my-bookings']);
  }

  get minCheckOutDate(): string {
    if (!this.form.checkInDate) {
      return this.today;
    }

    return this.addDays(this.form.checkInDate, 1);
  }

  get stayNights(): number {
    if (!this.form.checkInDate || !this.form.checkOutDate) {
      return 0;
    }

    const checkIn = new Date(`${this.form.checkInDate}T00:00:00`);
    const checkOut = new Date(`${this.form.checkOutDate}T00:00:00`);
    const diff = checkOut.getTime() - checkIn.getTime();
    return diff > 0 ? Math.floor(diff / 86400000) : 0;
  }

  get canSubmitUpdate(): boolean {
    return !!this.form.checkInDate
      && !!this.form.checkOutDate
      && this.stayNights > 0
      && Number(this.form.guests) >= 1
      && (this.roomCapacity === null || Number(this.form.guests) <= this.roomCapacity);
  }

  onCheckInDateChange(): void {
    if (this.form.checkOutDate && this.stayNights <= 0) {
      this.form.checkOutDate = '';
    }

    this.error = '';
  }

  onCheckOutDateChange(): void {
    this.error = '';
  }

  openDatePicker(field: 'checkInDate' | 'checkOutDate', event?: Event): void {
    event?.stopPropagation();
    this.activeDateField = field;
    const selected = this.form[field];
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
      this.form.checkInDate = iso;
      this.onCheckInDateChange();
      if (this.form.checkOutDate && this.stayNights <= 0) {
        this.form.checkOutDate = '';
      }
    } else {
      this.form.checkOutDate = iso;
      this.onCheckOutDateChange();
    }

    this.closeDatePicker();
  }

  isDateSelected(day: Date): boolean {
    if (!this.activeDateField) {
      return false;
    }

    const selectedValue = this.form[this.activeDateField];
    return !!selectedValue && this.toIsoDate(day) === selectedValue;
  }

  isDateDisabled(day: Date, field: 'checkInDate' | 'checkOutDate'): boolean {
    const iso = this.toIsoDate(day);

    if (iso < this.today) {
      return true;
    }

    if (field === 'checkOutDate' && this.form.checkInDate && iso <= this.form.checkInDate) {
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

  private getBookingEmail(booking: any): string {
    return String(booking.user?.email || booking.userEmail || booking.email || '').toLowerCase();
  }

  private addDays(dateString: string, days: number): string {
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return this.today;
    }

    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  private loadBookedRanges(): void {
    this.http.get<any[]>('http://localhost:8080/api/bookings', {
      headers: this.authHeaders
    }).subscribe({
      next: (data) => {
        const bookings = Array.isArray(data) ? data : [];
        const roomId = Number(this.form.roomId);
        const currentBookingId = Number(this.form.id);

        this.bookedRanges = bookings
          .filter((booking) => Number(booking?.id) !== currentBookingId)
          .filter((booking) => Number(booking?.room?.id || booking?.roomId) === roomId)
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