import { Component, DoCheck, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ChatMessage {
  sender: 'bot' | 'user';
  text: string;
  time: string;
  options?: ChatOption[];
  productPreview?: ProductPreview;
}

interface ChatOption {
  label: string;
  nextStepId: string;
}

interface ChatStep {
  id: string;
  text: string;
  options: ChatOption[];
  productPreview?: ProductPreview;
}

interface ProductPreview {
  title: string;
  subtitle: string;
  priceText: string;
  imageUrl: string;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.css'
})
export class ChatbotComponent implements DoCheck {
  @ViewChild('chatBody')
  private chatBody?: ElementRef<HTMLDivElement>;

  isOpen = false;
  isTyping = false;
  inputText = '';
  private authSnapshot = this.getAuthSnapshot();

  private readonly steps: ChatStep[] = [
    {
      id: 'start',
      text: 'Hey! I am your Hotel Support Assistant. How may I help you?',
      options: [
        { label: 'I need to book a room', nextStepId: 'book-room' },
        { label: 'Edit or cancel my booking', nextStepId: 'manage-booking' },
        { label: 'Get my bill or invoice', nextStepId: 'invoice' },
        { label: 'Something else', nextStepId: 'other' }
      ]
    },
    {
      id: 'book-room',
      text: 'To book a room: go to Rooms, choose dates, open a room, and click Book Now. You can complete booking after login.',
      productPreview: {
        title: 'Deluxe Room',
        subtitle: '2 Guests • Free Breakfast',
        priceText: 'From Rs 3200 / night',
        imageUrl: '/images/lobby.jpg'
      },
      options: [
        { label: 'No rooms are visible', nextStepId: 'no-rooms' },
        { label: 'How to login first?', nextStepId: 'login-help' },
        { label: 'Back to main help', nextStepId: 'start' }
      ]
    },
    {
      id: 'manage-booking',
      text: 'You can manage bookings from My Bookings. Choose what you need:',
      options: [
        { label: 'Edit booking details', nextStepId: 'edit-booking' },
        { label: 'Cancel a booking', nextStepId: 'cancel-booking' },
        { label: 'Back to main help', nextStepId: 'start' }
      ]
    },
    {
      id: 'invoice',
      text: 'Open My Bookings, select the booking, and download/print your invoice from booking details.',
      options: [
        { label: 'I cannot find my booking', nextStepId: 'missing-booking' },
        { label: 'Back to main help', nextStepId: 'start' }
      ]
    },
    {
      id: 'other',
      text: 'You can type your message below. I will guide you and also suggest options.',
      options: [
        { label: 'Back to main help', nextStepId: 'start' }
      ]
    },
    {
      id: 'no-rooms',
      text: 'Please try different dates, clear filters, and check again. Rooms may be sold out for selected dates.',
      options: [
        { label: 'Back to booking help', nextStepId: 'book-room' },
        { label: 'Back to main help', nextStepId: 'start' }
      ]
    },
    {
      id: 'login-help',
      text: 'Use Login from the navbar. If you do not have an account, open Signup first and then continue booking.',
      options: [
        { label: 'Back to booking help', nextStepId: 'book-room' },
        { label: 'Back to main help', nextStepId: 'start' }
      ]
    },
    {
      id: 'edit-booking',
      text: 'Go to My Bookings and click edit for the booking you want to modify.',
      options: [
        { label: 'Back to booking management', nextStepId: 'manage-booking' },
        { label: 'Back to main help', nextStepId: 'start' }
      ]
    },
    {
      id: 'cancel-booking',
      text: 'Go to My Bookings, open the booking card, and use cancel option. Confirm cancellation when prompted.',
      options: [
        { label: 'Back to booking management', nextStepId: 'manage-booking' },
        { label: 'Back to main help', nextStepId: 'start' }
      ]
    },
    {
      id: 'missing-booking',
      text: 'Please check if you are logged in with the same email used for booking. Then refresh My Bookings.',
      options: [
        { label: 'Back to invoice help', nextStepId: 'invoice' },
        { label: 'Back to main help', nextStepId: 'start' }
      ]
    }
  ];

  messages: ChatMessage[] = this.createInitialMessages();

  ngDoCheck(): void {
    const currentSnapshot = this.getAuthSnapshot();
    if (currentSnapshot !== this.authSnapshot) {
      this.authSnapshot = currentSnapshot;
      this.resetConversation();
    }
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;

    if (this.isOpen) {
      this.scrollToBottomSoon();
    }
  }

  ask(option: ChatOption): void {
    this.messages.push({
      sender: 'user',
      text: option.label,
      time: this.getCurrentTime()
    });

    this.showTypingThen(() => this.pushBotStep(option.nextStepId));
    this.scrollToBottomSoon();
  }

  sendTypedMessage(): void {
    const text = this.inputText.trim();

    if (!text) {
      return;
    }

    this.messages.push({ sender: 'user', text, time: this.getCurrentTime() });
    const matchedStepId = this.getIntentStepId(text);

    this.showTypingThen(() => {
      if (matchedStepId) {
        this.pushBotStep(matchedStepId);
        return;
      }

      this.messages.push({
        sender: 'bot',
        text: 'I could not fully understand that yet. Please choose one option below so I can help quickly.',
        time: this.getCurrentTime(),
        options: this.getStepOptions('start')
      });
    });

    this.inputText = '';
    this.scrollToBottomSoon();
  }

  private getIntentStepId(userText: string): string | null {
    const text = this.normalizeForMatch(userText);

    if (this.matchesAny(text, ['book', 'booking', 'reserve', 'reservation', 'room', 'rooms'])) {
      return 'book-room';
    }

    if (this.matchesAny(text, ['edit', 'change booking', 'modify', 'update booking', 'reschedule'])) {
      return 'edit-booking';
    }

    if (this.matchesAny(text, ['cancel', 'cancellation', 'refund'])) {
      return 'cancel-booking';
    }

    if (this.matchesAny(text, ['invoice', 'bill', 'receipt', 'payment proof'])) {
      return 'invoice';
    }

    if (this.matchesAny(text, ['login', 'log in', 'signin', 'sign in', 'signup', 'sign up'])) {
      return 'login-help';
    }

    if (this.matchesAny(text, ['no room', 'not available', 'sold out', 'unavailable'])) {
      return 'no-rooms';
    }

    if (this.matchesAny(text, ['booking not found', 'cannot find booking', 'missing booking', 'not showing'])) {
      return 'missing-booking';
    }

    if (this.matchesAny(text, ['hello', 'hi', 'hey'])) {
      return 'start';
    }

    return null;
  }

  private matchesAny(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => this.containsKeyword(text, keyword));
  }

  private containsKeyword(normalizedText: string, keyword: string): boolean {
    const normalizedKeyword = this.normalizeForMatch(keyword);

    if (!normalizedKeyword) {
      return false;
    }

    if (normalizedText.includes(normalizedKeyword)) {
      return true;
    }

    if (normalizedKeyword.includes(' ')) {
      return this.matchesPhrase(normalizedText, normalizedKeyword);
    }

    return this.matchesWord(normalizedText, normalizedKeyword);
  }

  private matchesPhrase(normalizedText: string, normalizedPhrase: string): boolean {
    const words = normalizedPhrase.split(' ').filter((word) => !!word);
    if (!words.length) {
      return false;
    }

    return words.every((word) => this.matchesWord(normalizedText, word));
  }

  private matchesWord(normalizedText: string, keyword: string): boolean {
    const tokens = normalizedText.split(' ').filter((token) => !!token);
    const threshold = this.getDistanceThreshold(keyword);

    return tokens.some((token) => {
      if (token === keyword) {
        return true;
      }

      if (token.startsWith(keyword) || keyword.startsWith(token)) {
        return true;
      }

      return this.getEditDistance(token, keyword) <= threshold;
    });
  }

  private getDistanceThreshold(keyword: string): number {
    if (keyword.length <= 4) {
      return 1;
    }

    return 2;
  }

  private normalizeForMatch(value: string): string {
    return value
      .toLowerCase()
      .replace(/(.)\1{2,}/g, '$1$1')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getEditDistance(first: string, second: string): number {
    const rows = first.length + 1;
    const cols = second.length + 1;
    const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

    for (let row = 0; row < rows; row++) {
      matrix[row][0] = row;
    }

    for (let col = 0; col < cols; col++) {
      matrix[0][col] = col;
    }

    for (let row = 1; row < rows; row++) {
      for (let col = 1; col < cols; col++) {
        const cost = first[row - 1] === second[col - 1] ? 0 : 1;

        matrix[row][col] = Math.min(
          matrix[row - 1][col] + 1,
          matrix[row][col - 1] + 1,
          matrix[row - 1][col - 1] + cost
        );
      }
    }

    return matrix[rows - 1][cols - 1];
  }

  private pushBotStep(stepId: string): void {
    const step = this.steps.find((item) => item.id === stepId);

    if (!step) {
      return;
    }

    this.messages.push({
      sender: 'bot',
      text: step.text,
      time: this.getCurrentTime(),
      productPreview: step.productPreview
    });

    if (step.options.length) {
      const followUpText = step.id === 'start'
        ? 'How may I help you?'
        : 'Can I help you with anything else?';

      this.messages.push({
        sender: 'bot',
        text: followUpText,
        time: this.getCurrentTime(),
        options: step.options
      });
    }
  }

  private showTypingThen(callback: () => void): void {
    this.isTyping = true;
    this.scrollToBottomSoon();

    setTimeout(() => {
      this.isTyping = false;
      callback();
      this.scrollToBottomSoon();
    }, 700);
  }

  private getStepOptions(stepId: string): ChatOption[] {
    const step = this.steps.find((item) => item.id === stepId);
    return step?.options || [];
  }

  private getCurrentTime(): string {
    return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  }

  private getDisplayName(): string {
    const email = localStorage.getItem('email') || '';
    const baseName = email.split('@')[0] || '';

    if (!baseName) {
      return 'Guest';
    }

    return baseName
      .replace(/[._-]+/g, ' ')
      .split(' ')
      .filter((part) => !!part)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  private createInitialMessages(): ChatMessage[] {
    const userName = this.getDisplayName();

    return [
      {
        sender: 'bot',
        text: 'Please excuse any mistakes. Do not share personal information in this chat.',
        time: this.getCurrentTime()
      },
      {
        sender: 'bot',
        text: `Hey ${userName}, I am your Hotel Support Assistant.`,
        time: this.getCurrentTime()
      },
      {
        sender: 'bot',
        text: 'How may I help you?',
        time: this.getCurrentTime(),
        options: this.getStepOptions('start')
      }
    ];
  }

  private resetConversation(): void {
    this.messages = this.createInitialMessages();
    this.inputText = '';
    this.isTyping = false;

    if (this.isOpen) {
      this.scrollToBottomSoon();
    }
  }

  private getAuthSnapshot(): string {
    const email = localStorage.getItem('email') || '';
    const role = localStorage.getItem('role') || '';
    const token = localStorage.getItem('token') || '';

    return `${email}|${role}|${token}`;
  }

  private scrollToBottomSoon(): void {
    setTimeout(() => {
      const container = this.chatBody?.nativeElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
  }
}
