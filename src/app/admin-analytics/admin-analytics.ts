import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../services/auth';

interface AnalyticsRoom {
  id: number;
  name: string;
  pricePerNight: number;
  capacity: number;
  type: string;
}

interface AnalyticsBooking {
  id: number;
  roomId: number | null;
  roomName: string;
  checkInDate: Date;
  checkOutDate: Date;
  guests: number;
  nights: number;
  revenue: number;
  nightlyRate: number;
}

interface MonthlySnapshot {
  key: string;
  label: string;
  revenue: number;
  bookedNights: number;
  bookingCount: number;
  occupancyRate: number;
}

interface ChartPoint {
  x: number;
  y: number;
  label: string;
  value: number;
  bookedNights: number;
}

interface ChartAxisLabel {
  y: number;
  value: number;
}

interface RoomPerformance {
  name: string;
  revenue: number;
  bookings: number;
  nights: number;
  share: number;
}

interface CheckInDayProfile {
  day: string;
  fullName: string;
  count: number;
  percent: number;
}

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-analytics.html',
  styleUrls: ['../admin/admin.css', './admin-analytics.css']
})
export class AdminAnalyticsComponent implements OnInit {
  chartMode: 'past' | 'upcoming' = 'past';
  loading = false;
  error = '';

  rooms: AnalyticsRoom[] = [];
  bookings: AnalyticsBooking[] = [];
  monthlySnapshots: MonthlySnapshot[] = [];
  pastMonthlySnapshots: MonthlySnapshot[] = [];
  upcomingMonthlySnapshots: MonthlySnapshot[] = [];
  revenueChartPoints = '';
  revenueAreaPoints = '';
  revenueDots: ChartPoint[] = [];
  chartAxisLabels: ChartAxisLabel[] = [];
  roomPerformance: RoomPerformance[] = [];
  strategicSignals: string[] = [];

  stayDurationProfile = {
    short: { count: 0, percent: 0 },
    medium: { count: 0, percent: 0 },
    long: { count: 0, percent: 0 },
  };
  checkInDays: CheckInDayProfile[] = [];
  peakCheckInDay = '';

  totalRevenue = 0;
  totalBookedNights = 0;
  totalGuests = 0;
  currentMonthRevenue = 0;
  previousMonthRevenue = 0;
  currentMonthOccupancy = 0;
  currentMonthBookedNights = 0;
  revenueDelta = 0;
  revenueGrowthRate = 0;
  averageDailyRate = 0;
  averageStayLength = 0;
  performanceStatus = 'Stable';
  performanceNarrative = 'Revenue is flat against the previous month.';
  growthLabel = '0%';
  growthNarrative = 'No revenue change against the previous month.';

  private readonly currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  });

  private readonly compactCurrencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1
  });

  private readonly percentFormatter = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 1
  });

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.auth.isLoggedIn() || !this.auth.isAdmin()) {
      this.router.navigate(['/admin-login']);
      return;
    }

    this.loadAnalytics();
  }

  get chartTitle(): string {
    return this.chartMode === 'upcoming'
      ? 'Upcoming booked months revenue outlook'
      : 'Past 6 months revenue movement';
  }

  get chartSubtitle(): string {
    return this.chartMode === 'upcoming'
      ? 'Includes the current month plus future months that already have bookings in your system.'
      : 'Shows the most recent six-month revenue trend using booked nights already recorded.';
  }

  setChartMode(mode: 'past' | 'upcoming'): void {
    if (this.chartMode === mode) {
      return;
    }

    this.chartMode = mode;
    this.updateDisplayedChart();
  }

  get profitLossTone(): 'positive' | 'negative' | 'neutral' {
    if (this.revenueDelta > 0) {
      return 'positive';
    }

    if (this.revenueDelta < 0) {
      return 'negative';
    }

    return 'neutral';
  }

  get profitLossLabel(): string {
    if (this.previousMonthRevenue <= 0 && this.currentMonthRevenue > 0) {
      return 'New revenue signal';
    }

    if (this.revenueDelta > 0) {
      return 'Estimated profit trend';
    }

    if (this.revenueDelta < 0) {
      return 'Estimated loss trend';
    }

    return 'Break-even trend';
  }

  get profitLossMeterWidth(): number {
    if (!this.previousMonthRevenue && !this.currentMonthRevenue) {
      return 50;
    }

    const maxVisibleRevenue = Math.max(...this.monthlySnapshots.map((snapshot) => snapshot.revenue), 1);
    return Math.max(18, Math.min((this.currentMonthRevenue / maxVisibleRevenue) * 100, 100));
  }

  get occupancyGaugeStyle(): string {
    const fill = Math.max(0, Math.min(this.currentMonthOccupancy, 100));
    return `conic-gradient(#ff7a59 0 ${fill}%, rgba(255, 255, 255, 0.18) ${fill}% 100%)`;
  }

  formatCurrency(value: number, compact = false): string {
    return compact ? this.compactCurrencyFormatter.format(value) : this.currencyFormatter.format(value);
  }

  formatSignedCurrency(value: number): string {
    const prefix = value > 0 ? '+' : value < 0 ? '-' : '';
    return `${prefix}${this.currencyFormatter.format(Math.abs(value))}`;
  }

  formatSignedPercent(value: number): string {
    const prefix = value > 0 ? '+' : value < 0 ? '-' : '';
    return `${prefix}${this.percentFormatter.format(Math.abs(value))}%`;
  }

  private get authHeaders(): Record<string, string | string[]> | undefined {
    const token = localStorage.getItem('token');
    if (!token) {
      return undefined;
    }

    return { Authorization: `Bearer ${token}` };
  }

  private loadAnalytics(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      rooms: this.http.get<any[]>('http://localhost:8080/api/rooms', { headers: this.authHeaders }),
      bookings: this.http.get<any[]>('http://localhost:8080/api/bookings', { headers: this.authHeaders })
    }).subscribe({
      next: ({ rooms, bookings }) => {
        const normalizedRooms = (rooms || []).map((room) => this.normalizeRoom(room));
        const roomLookup = new Map(normalizedRooms.map((room) => [room.id, room]));
        const normalizedBookings = (bookings || [])
          .map((booking) => this.normalizeBooking(booking, roomLookup))
          .filter((booking): booking is AnalyticsBooking => booking !== null);

        this.rooms = normalizedRooms;
        this.bookings = normalizedBookings;
        this.buildAnalytics();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = err?.error?.message || 'Unable to load analytics from the current rooms and bookings data.';
        this.loading = false;
      }
    });
  }

  private buildAnalytics(): void {
    this.totalRevenue = this.bookings.reduce((sum, booking) => sum + booking.revenue, 0);
    this.totalBookedNights = this.bookings.reduce((sum, booking) => sum + booking.nights, 0);
    this.totalGuests = this.bookings.reduce((sum, booking) => sum + booking.guests, 0);
    this.averageDailyRate = this.totalBookedNights ? this.totalRevenue / this.totalBookedNights : 0;
    this.averageStayLength = this.bookings.length ? this.totalBookedNights / this.bookings.length : 0;

    const currentMonthStart = this.getMonthStart(new Date());
    const previousMonthStart = this.addMonths(currentMonthStart, -1);
    const chartEndMonth = this.getChartEndMonth(currentMonthStart);

    this.pastMonthlySnapshots = this.buildRollingMonthlySnapshots(currentMonthStart, -5, 0);
    this.upcomingMonthlySnapshots = this.buildRollingMonthlySnapshots(currentMonthStart, 0, this.getUpcomingMonthSpan(currentMonthStart, chartEndMonth));
    this.chartMode = 'past';

    const currentMonthSnapshot = this.buildSnapshotForMonth(currentMonthStart);
    const previousMonthSnapshot = this.buildSnapshotForMonth(previousMonthStart);

    this.currentMonthRevenue = currentMonthSnapshot.revenue;
    this.previousMonthRevenue = previousMonthSnapshot.revenue;
    this.currentMonthOccupancy = currentMonthSnapshot.occupancyRate;
    this.currentMonthBookedNights = currentMonthSnapshot.bookedNights;
    this.revenueDelta = this.currentMonthRevenue - this.previousMonthRevenue;
    this.revenueGrowthRate = this.previousMonthRevenue > 0
      ? (this.revenueDelta / this.previousMonthRevenue) * 100
      : 0;

    if (this.previousMonthRevenue <= 0 && this.currentMonthRevenue > 0) {
      this.growthLabel = 'New';
      this.growthNarrative = `No revenue was recorded last month. Current month revenue is ${this.formatCurrency(this.currentMonthRevenue, true)}.`;
    } else if (this.previousMonthRevenue <= 0 && this.currentMonthRevenue <= 0) {
      this.growthLabel = '0%';
      this.growthNarrative = 'No revenue was recorded in the current or previous month.';
    } else {
      this.growthLabel = this.formatSignedPercent(this.revenueGrowthRate);
      this.growthNarrative = `Current revenue ${this.formatCurrency(this.currentMonthRevenue, true)} vs previous ${this.formatCurrency(this.previousMonthRevenue, true)}.`;
    }

    if (this.previousMonthRevenue <= 0 && this.currentMonthRevenue > 0) {
      this.performanceStatus = 'Fresh revenue cycle';
      this.performanceNarrative = 'There was no booked revenue last month, and the current month has started generating revenue again.';
    } else if (this.revenueDelta > 0) {
      this.performanceStatus = 'Profit momentum';
      this.performanceNarrative = 'Booked revenue is ahead of the previous month, signalling stronger commercial performance.';
    } else if (this.revenueDelta < 0) {
      this.performanceStatus = 'Loss pressure';
      this.performanceNarrative = 'Booked revenue is below the previous month, signalling weaker demand or pricing pressure.';
    } else {
      this.performanceStatus = 'Stable runway';
      this.performanceNarrative = 'Booked revenue is holding steady against the previous month.';
    }

    this.roomPerformance = this.buildRoomPerformance();
    this.buildGuestPatterns();
    this.updateDisplayedChart();
    this.strategicSignals = this.buildSignals();
  }

  private updateDisplayedChart(): void {
    this.monthlySnapshots = this.chartMode === 'upcoming'
      ? this.upcomingMonthlySnapshots
      : this.pastMonthlySnapshots;
    this.buildRevenueChart();
  }

  private buildRollingMonthlySnapshots(anchorMonth: Date, startOffset: number, endOffset: number): MonthlySnapshot[] {
    const snapshots: MonthlySnapshot[] = [];

    for (let offset = startOffset; offset <= endOffset; offset += 1) {
      const start = this.addMonths(anchorMonth, offset);
      snapshots.push(this.buildSnapshotForMonth(start));
    }

    return snapshots;
  }

  private buildSnapshotForMonth(start: Date): MonthlySnapshot {
    const monthStart = this.getMonthStart(start);
    const monthEnd = this.addMonths(monthStart, 1);
    const daysInMonth = Math.max(1, this.daysBetween(monthStart, monthEnd));

    let revenue = 0;
    let bookedNights = 0;
    let bookingCount = 0;

    this.bookings.forEach((booking) => {
      const bookingEnd = this.addDays(booking.checkInDate, booking.nights);
      const overlapNights = this.getOverlapNights(booking.checkInDate, bookingEnd, monthStart, monthEnd);
      if (overlapNights <= 0) {
        return;
      }

      bookedNights += overlapNights;
      revenue += booking.nightlyRate * overlapNights;
      bookingCount += 1;
    });

    const totalRoomNights = Math.max(this.rooms.length * daysInMonth, 1);

    return {
      key: `${monthStart.getFullYear()}-${monthStart.getMonth()}`,
      label: monthStart.toLocaleString('en-IN', { month: 'short' }),
      revenue,
      bookedNights,
      bookingCount,
      occupancyRate: (bookedNights / totalRoomNights) * 100
    };
  }

  private buildRoomPerformance(): RoomPerformance[] {
    const totals = new Map<string, RoomPerformance>();

    this.bookings.forEach((booking) => {
      const key = booking.roomName;
      const current = totals.get(key) ?? {
        name: key,
        revenue: 0,
        bookings: 0,
        nights: 0,
        share: 0
      };

      current.revenue += booking.revenue;
      current.bookings += 1;
      current.nights += booking.nights;
      totals.set(key, current);
    });

    return Array.from(totals.values())
      .sort((first, second) => second.revenue - first.revenue)
      .slice(0, 5)
      .map((room) => ({
        ...room,
        share: this.totalRevenue > 0 ? (room.revenue / this.totalRevenue) * 100 : 0
      }));
  }

  private buildGuestPatterns(): void {
    let shortCount = 0;
    let mediumCount = 0;
    let longCount = 0;
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    this.bookings.forEach((b) => {
      if (b.nights <= 2) {
        shortCount++;
      } else if (b.nights <= 4) {
        mediumCount++;
      } else {
        longCount++;
      }

      const dayIndex = b.checkInDate.getDay();
      dayCounts[dayIndex]++;
    });

    const total = this.bookings.length || 1;
    this.stayDurationProfile = {
      short: { count: shortCount, percent: (shortCount / total) * 100 },
      medium: { count: mediumCount, percent: (mediumCount / total) * 100 },
      long: { count: longCount, percent: (longCount / total) * 100 },
    };

    const maxValue = Math.max(...dayCounts, 1);
    this.checkInDays = dayCounts.map((count, i) => ({
      day: dayNames[i].substring(0, 3),
      fullName: dayNames[i],
      count,
      percent: (count / maxValue) * 100
    }));

    const peakIndex = dayCounts.indexOf(Math.max(...dayCounts));
    this.peakCheckInDay = Math.max(...dayCounts) > 0 ? dayNames[peakIndex] : 'N/A';
  }

  private buildRevenueChart(): void {
    if (!this.monthlySnapshots.length) {
      this.revenueChartPoints = '';
      this.revenueAreaPoints = '';
      this.revenueDots = [];
      return;
    }

    const width = 620;
    const height = 220;
    const left = 22;
    const bottom = 190;
    const usableWidth = 576;
    const usableHeight = 140;
    const maxRevenue = Math.max(...this.monthlySnapshots.map((snapshot) => snapshot.revenue), 1);
    const step = this.monthlySnapshots.length > 1 ? usableWidth / (this.monthlySnapshots.length - 1) : usableWidth;

    this.chartAxisLabels = [1, 0.66, 0.33, 0].map((ratio) => ({
      y: bottom - ratio * usableHeight,
      value: maxRevenue * ratio
    }));

    this.revenueDots = this.monthlySnapshots.map((snapshot, index) => {
      const x = left + step * index;
      const y = bottom - (snapshot.revenue / maxRevenue) * usableHeight;
      return {
        x,
        y,
        label: snapshot.label,
        value: snapshot.revenue,
        bookedNights: snapshot.bookedNights
      };
    });

    this.revenueChartPoints = this.revenueDots.map((point) => `${point.x},${point.y}`).join(' ');
    this.revenueAreaPoints = `22,190 ${this.revenueChartPoints} ${left + step * (this.monthlySnapshots.length - 1)},190`;
  }

  private buildSignals(): string[] {
    const signals: string[] = [];
    const bestRoom = this.roomPerformance[0];

    if (bestRoom) {
      signals.push(`${bestRoom.name} is your strongest revenue driver, contributing ${this.percentFormatter.format(bestRoom.share)}% of booked revenue.`);
    }

    signals.push(`Average realized room rate is ${this.formatCurrency(this.averageDailyRate)} per booked night across ${this.totalBookedNights} booked nights.`);

    if (this.currentMonthOccupancy >= 65) {
      signals.push('Occupancy is healthy this month, so premium pricing and longer-stay offers are justified.');
    } else if (this.currentMonthOccupancy >= 40) {
      signals.push('Occupancy is moderate this month. Bundles or weekday offers could improve fill rate without heavy discounting.');
    } else {
      signals.push('Occupancy is soft this month. Focus on demand generation and conversion before reducing base rate too aggressively.');
    }

    signals.push('Profit or loss is shown as a revenue trend estimate versus last month because expense data is not available in the current backend API.');

    return signals;
  }

  private normalizeRoom(room: any): AnalyticsRoom {
    const id = Number(room?.id ?? room?.roomId ?? 0) || 0;
    const pricePerNight = Number(room?.pricePerNight ?? room?.price ?? 0) || 0;
    const capacity = Number(room?.capacity ?? room?.maxGuests ?? 1) || 1;

    return {
      id,
      name: room?.name || room?.roomName || `Room #${id || 'N/A'}`,
      pricePerNight,
      capacity,
      type: room?.type || 'ROOM'
    };
  }

  private normalizeBooking(booking: any, roomLookup: Map<number, AnalyticsRoom>): AnalyticsBooking | null {
    const roomId = Number(booking?.roomId ?? booking?.room?.id ?? 0) || null;
    const linkedRoom = roomId ? roomLookup.get(roomId) : undefined;
    const checkInDate = this.toDate(booking?.checkInDate);
    const checkOutDate = this.toDate(booking?.checkOutDate);

    if (!checkInDate || !checkOutDate || checkOutDate < checkInDate) {
      return null;
    }

    const nights = this.calculateStayNights(checkInDate, checkOutDate);
    const revenueFromPayload = Number(booking?.totalPrice ?? booking?.amount ?? booking?.totalAmount ?? 0);
    const nightlyRate = revenueFromPayload > 0
      ? revenueFromPayload / nights
      : Number(booking?.room?.pricePerNight ?? booking?.room?.price ?? linkedRoom?.pricePerNight ?? 0);

    return {
      id: Number(booking?.id ?? 0) || 0,
      roomId,
      roomName: booking?.room?.name || booking?.roomName || linkedRoom?.name || (roomId ? `Room #${roomId}` : 'Unassigned room'),
      checkInDate,
      checkOutDate,
      guests: Number(booking?.guests ?? booking?.numberOfGuests ?? 1) || 1,
      nights,
      revenue: nightlyRate * nights,
      nightlyRate
    };
  }

  private toDate(value: string | Date | undefined): Date | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      const datePart = value.split('T')[0];
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
      if (match) {
        const [, year, month, day] = match;
        return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
      }
    }

    const date = value instanceof Date ? new Date(value) : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private daysBetween(start: Date, end: Date): number {
    const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    return Math.round((endUtc - startUtc) / 86400000);
  }

  private calculateStayNights(checkInDate: Date, checkOutDate: Date): number {
    return Math.max(1, this.daysBetween(checkInDate, checkOutDate));
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12, 0, 0, 0);
  }

  private addMonths(date: Date, months: number): Date {
    return new Date(date.getFullYear(), date.getMonth() + months, 1, 12, 0, 0, 0);
  }

  private getMonthStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0);
  }

  private getChartEndMonth(currentMonthStart: Date): Date {
    if (!this.bookings.length) {
      return currentMonthStart;
    }

    return this.bookings.reduce((latestMonth, booking) => {
      const occupiedEnd = this.addDays(booking.checkInDate, Math.max(booking.nights - 1, 0));
      const bookingMonth = this.getMonthStart(occupiedEnd);
      return bookingMonth.getTime() > latestMonth.getTime() ? bookingMonth : latestMonth;
    }, currentMonthStart);
  }

  private getUpcomingMonthSpan(currentMonthStart: Date, chartEndMonth: Date): number {
    const monthSpan = (chartEndMonth.getFullYear() - currentMonthStart.getFullYear()) * 12
      + (chartEndMonth.getMonth() - currentMonthStart.getMonth());
    return Math.max(0, monthSpan);
  }

  private getOverlapNights(bookingStart: Date, bookingEnd: Date, periodStart: Date, periodEnd: Date): number {
    const start = Math.max(bookingStart.getTime(), periodStart.getTime());
    const end = Math.min(bookingEnd.getTime(), periodEnd.getTime());

    if (end <= start) {
      return 0;
    }

    return Math.round((end - start) / 86400000);
  }
}