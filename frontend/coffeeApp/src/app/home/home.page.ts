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

  user: any = { coins: 0, xp: 0, level: 1, energy: 100, maxEnergy: 100, clickPower: 50 };
  progress: number = 0;
  isRequesting: boolean = false;
  
  // Animation properties
  isShaking: boolean = false;
  floatingTexts: any[] = [];
  
  // Shop properties
  isShopOpen: boolean = false;

  constructor(private api: ApiService) {}

  async ionViewWillEnter() {
    try {
      this.user = await lastValueFrom(this.api.getUser());
      // ensure defaults
      if (this.user.energy === undefined || this.user.energy === null) this.user.energy = 100;
      if (this.user.maxEnergy === undefined || this.user.maxEnergy === null) this.user.maxEnergy = 100;
      if (this.user.clickPower === undefined || this.user.clickPower === null) this.user.clickPower = 50;
    } catch (e) {
      console.error('Error fetching user', e);
    }
  }

  tapCoffee(event: any) {
    if (this.isRequesting) return;
    if (this.user.energy <= 0) {
      alert("Energi Habis! Klaim Idle Reward atau tunggu sebentar.");
      return;
    }
    
    // Add floating text
    const rect = event.target.getBoundingClientRect();
    // randomize x slightly around click
    const x = (event.clientX - rect.left) - 20 + Math.random() * 40;
    const y = (event.clientY - rect.top) - 20;
    
    const id = Date.now() + Math.random();
    this.floatingTexts.push({ id, x, y, text: `+${this.user.clickPower}` });
    
    // Remove text after animation
    setTimeout(() => {
      this.floatingTexts = this.floatingTexts.filter(t => t.id !== id);
    }, 800);
    
    // Shake animation
    this.isShaking = true;
    setTimeout(() => this.isShaking = false, 150);
    
    this.progress += 0.2;

    if (this.progress >= 0.99) {
      this.finishGame();
    }
  }

  async finishGame() {
    if (this.isRequesting) return;
    this.isRequesting = true;
    this.progress = 0; 
    
    try {
      const res: any = await lastValueFrom(this.api.play());
      this.user = res.user;
      this.user.clickPower = res.clickPower;
    } catch (e: any) {
      console.error('Error playing game', e);
      if(e.error && e.error.error) alert(e.error.error);
    } finally {
      this.isRequesting = false;
    }
  }

  async claimIdle() {
    if (this.isRequesting) return;
    this.isRequesting = true;

    try {
      const res: any = await lastValueFrom(this.api.idle());
      alert(`🎁 +${res.reward} Koin & Energi Dipulihkan!`);
      this.user.coins += res.reward; 
      this.user.energy = res.energy;
    } catch (e) {
      console.error('Error claiming idle reward', e);
    } finally {
      this.isRequesting = false;
    }
  }
  
  toggleShop() {
    this.isShopOpen = !this.isShopOpen;
  }
  
  async buyUpgrade(type: string) {
    if (this.isRequesting) return;
    this.isRequesting = true;
    
    try {
      this.user = await lastValueFrom(this.api.upgrade(type));
      alert("Upgrade Berhasil! 🎉");
    } catch (e: any) {
      console.error('Error upgrade', e);
      alert(e.error && e.error.error ? e.error.error : "Gagal upgrade. Koin tidak cukup?");
    } finally {
      this.isRequesting = false;
    }
  }
  
  getRequiredXp(): number {
    return (this.user?.level || 1) * 100 + (((this.user?.level || 1) - 1) * 50);
  }
}
