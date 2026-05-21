import { Component } from '@angular/core';
import { ApiService } from '../services/api.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage {

  user: any = { coins: 0, xp: 0, level: 1 };
  progress: number = 0;
  isRequesting: boolean = false;

  constructor(private api: ApiService) {}

  async ionViewWillEnter() {
    try {
      this.user = await lastValueFrom(this.api.getUser());
    } catch (e) {
      console.error('Error fetching user', e);
    }
  }

  tapCoffee() {
    if (this.isRequesting) return;
    
    this.progress += 0.2;

    if (this.progress >= 0.99) { // Using 0.99 for float safety
      this.finishGame();
    }
  }

  async finishGame() {
    if (this.isRequesting) return;
    
    this.isRequesting = true;
    this.progress = 0; // Reset immediately to prevent spam click
    
    try {
      this.user = await lastValueFrom(this.api.play());
    } catch (e) {
      console.error('Error playing game', e);
    } finally {
      this.isRequesting = false;
    }
  }

  async claimIdle() {
    if (this.isRequesting) return;
    this.isRequesting = true;

    try {
      const res: any = await lastValueFrom(this.api.idle());
      alert("💰 +" + res.reward);
      this.user.coins += res.reward; // Fix bug logic coins tidak diupdate
    } catch (e) {
      console.error('Error claiming idle reward', e);
    } finally {
      this.isRequesting = false;
    }
  }
}
