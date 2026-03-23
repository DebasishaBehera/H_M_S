import { Component } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.html',
  styleUrls: ['./contact.css']
})
export class Contact {

  accessKey = "73e49380-3d07-4a14-9626-ff4c68e080bb";
  result = "";

  async onSubmit(form: NgForm) {
    if (form.invalid) return;

    this.result = "Sending...";

    const formData = new FormData();
    Object.keys(form.value).forEach(key => formData.append(key, form.value[key]));
    formData.append("access_key", this.accessKey);

    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (data.success) {
      this.result = "✅ Message sent successfully!";
      form.reset();
    } else {
      this.result = "❌ Something went wrong. Please try again.";
    }
  }
}
