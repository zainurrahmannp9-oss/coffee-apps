import { Component, ElementRef, ViewChild } from '@angular/core';
import { ApiService } from '../services/api.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage {
  
  user: any = { coins: 0, xp: 0, level: 1, energy: 100, maxEnergy: 100, clickPower: 50, autoClicker: 0 };
  progress: number = 0;
  isRequesting: boolean = false;
  
  isShaking: boolean = false;
  floatingTexts: any[] = [];
  
  isShopOpen: boolean = false;
  showWelcomePopup: boolean = false;
  offlineReward: number = 0;
  offlineTime: number = 0;

  // Audio
  popSound = new Audio('https://actions.google.com/sounds/v1/water/water_drop.ogg');
  buySound = new Audio('https://actions.google.com/sounds/v1/cartoon/clank.ogg');

  autoClickInterval: any;

  constructor(private api: ApiService) {}

  async ionViewWillEnter() {
    try {
      this.user = await lastValueFrom(this.api.getUser());
      
      const res: any = await lastValueFrom(this.api.idle());
      if (res.diffSeconds > 60 && res.reward > 0) {
        this.offlineReward = res.reward;
        this.offlineTime = Math.floor(res.diffSeconds / 60);
        this.showWelcomePopup = true;
      }
      
      this.user.coins += res.reward;
      this.user.energy = res.energy;
      
      if (this.user.energy === undefined || this.user.energy === null) this.user.energy = 100;
      if (this.user.maxEnergy === undefined || this.user.maxEnergy === null) this.user.maxEnergy = 100;
      if (this.user.clickPower === undefined || this.user.clickPower === null) this.user.clickPower = 50;
      if (this.user.autoClicker === undefined || this.user.autoClicker === null) this.user.autoClicker = 0;
      
      this.startAutoClicker();

    } catch (e) {
      console.error('Error fetching user', e);
    }
  }
  
  ionViewWillLeave() {
    if (this.autoClickInterval) clearInterval(this.autoClickInterval);
  }

  startAutoClicker() {
    if (this.autoClickInterval) clearInterval(this.autoClickInterval);
    
    this.autoClickInterval = setInterval(async () => {
      if (this.user.autoClicker > 0) {
        if (this.isRequesting) return;
        const basePower = this.user.clickPower || 50;
        const autoReward = Math.floor(basePower / 5) * this.user.autoClicker;
        this.user.coins += autoReward;
        
        const id = Date.now() + Math.random();
        this.floatingTexts.push({ id, x: 100 + Math.random()*20, y: 100, text: `+${autoReward} 🤖` });
        setTimeout(() => { this.floatingTexts = this.floatingTexts.filter(t => t.id !== id); }, 800);
      }
    }, 1000);
  }

  tapCoffee(event: any) {
    if (this.isRequesting) return;
    if (this.user.energy <= 0) {
      alert("Energi Habis! Tunggu sebentar agar pulih otomatis.");
      return;
    }
    
    let pop = this.popSound.cloneNode() as HTMLAudioElement;
    pop.volume = 0.5;
    pop.play().catch(e => console.log('Audio error:', e));

    const rect = event.target.getBoundingClientRect();
    const x = (event.clientX - rect.left) - 20 + Math.random() * 40;
    const y = (event.clientY - rect.top) - 20;
    
    const id = Date.now() + Math.random();
    this.floatingTexts.push({ id, x, y, text: `+${this.user.clickPower}` });
    
    setTimeout(() => {
      this.floatingTexts = this.floatingTexts.filter(t => t.id !== id);
    }, 800);
    
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
      const oldLevel = this.user.level;
      
      this.user = res.user;
      this.user.clickPower = res.clickPower;
      
      if (this.user.level > oldLevel) {
        let clank = this.buySound.cloneNode() as HTMLAudioElement;
        clank.play().catch(e => console.log(e));
      }
    } catch (e: any) {
      console.error('Error playing game', e);
      if(e.error && e.error.error) alert(e.error.error);
    } finally {
      this.isRequesting = false;
    }
  }

  closeWelcome() {
    this.showWelcomePopup = false;
  }
  
  toggleShop() {
    this.isShopOpen = !this.isShopOpen;
  }
  
  async buyUpgrade(type: string) {
    if (this.isRequesting) return;
    this.isRequesting = true;
    
    try {
      this.user = await lastValueFrom(this.api.upgrade(type));
      let clank = this.buySound.cloneNode() as HTMLAudioElement;
      clank.play().catch(e => console.log(e));
      
      if (type === 'robot') {
        this.startAutoClicker();
      }
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
  
  getCoffeeEmoji(): string {
    const lvl = this.user?.level || 1;
    if (lvl < 3) return "☕";
    if (lvl < 5) return "🍵";
    if (lvl < 10) return "🧋";
    return "🏆";
  }
}
