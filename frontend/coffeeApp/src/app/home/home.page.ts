import { Component } from '@angular/core';
import { ApiService } from '../services/api.service';
import { lastValueFrom } from 'rxjs';

interface Recipe {
  id: string;
  name: string;
  ingredients: string[];
  baseReward: number;
  baseXp: number;
  minLevel: number;
}

const RECIPES: Recipe[] = [
  { id: 'black', name: 'Kopi Hitam', ingredients: ['☕'], baseReward: 20, baseXp: 10, minLevel: 1 },
  { id: 'latte', name: 'Cafe Latte', ingredients: ['☕', '🥛'], baseReward: 50, baseXp: 25, minLevel: 1 },
  { id: 'ice_coffee', name: 'Es Kopi', ingredients: ['☕', '🧊'], baseReward: 60, baseXp: 30, minLevel: 2 },
  { id: 'ice_latte', name: 'Es Latte', ingredients: ['☕', '🥛', '🧊'], baseReward: 100, baseXp: 50, minLevel: 3 },
  { id: 'frappe', name: 'Frappuccino', ingredients: ['☕', '🥛', '🧊', '🍯'], baseReward: 150, baseXp: 80, minLevel: 5 },
  { id: 'caramel', name: 'Caramel Macchiato', ingredients: ['☕', '🥛', '🍯'], baseReward: 120, baseXp: 60, minLevel: 4 },
];

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage {
  
  user: any = { coins: 0, xp: 0, level: 1, energy: 100, maxEnergy: 100, clickPower: 50, autoClicker: 0 };
  isRequesting: boolean = false;
  
  isShopOpen: boolean = false;
  showWelcomePopup: boolean = false;
  offlineReward: number = 0;
  offlineTime: number = 0;

  // Audio
  popSound = new Audio('https://actions.google.com/sounds/v1/water/water_drop.ogg');
  buySound = new Audio('https://actions.google.com/sounds/v1/cartoon/clank.ogg');
  wrongSound = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
  
  autoClickInterval: any;

  // Gameplay State
  currentCustomer: Recipe | null = null;
  currentCup: string[] = [];
  customerMood: 'happy' | 'angry' | 'neutral' = 'neutral';
  floatingTexts: any[] = [];
  customerFaces = ['👨‍💼', '👩‍⚕️', '👮‍♂️', '👩‍🏫', '🕵️‍♀️', '👨‍🎤'];
  currentFace = '👨‍💼';

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
      
      this.generateCustomer();
      this.startAutoClicker();

    } catch (e) {
      console.error('Error fetching user', e);
    }
  }
  
  ionViewWillLeave() {
    if (this.autoClickInterval) clearInterval(this.autoClickInterval);
  }

  generateCustomer() {
    this.currentCup = [];
    this.customerMood = 'neutral';
    this.currentFace = this.customerFaces[Math.floor(Math.random() * this.customerFaces.length)];
    
    const availableRecipes = RECIPES.filter(r => r.minLevel <= (this.user.level || 1));
    this.currentCustomer = availableRecipes[Math.floor(Math.random() * availableRecipes.length)];
  }

  addIngredient(item: string) {
    if (this.customerMood !== 'neutral') return; 
    
    if (this.currentCup.length < 5) {
      this.currentCup.push(item);
      let pop = this.popSound.cloneNode() as HTMLAudioElement;
      pop.volume = 0.5;
      pop.play().catch(e => console.log('Audio error:', e));
    }
  }

  clearCup() {
    this.currentCup = [];
    let pop = this.popSound.cloneNode() as HTMLAudioElement;
    pop.volume = 0.3;
    pop.play().catch(e => console.log('Audio error:', e));
  }

  async serveOrder() {
    if (this.isRequesting || !this.currentCustomer) return;
    
    const isCorrect = this.currentCup.length === this.currentCustomer.ingredients.length &&
                      this.currentCup.every((val, index) => val === this.currentCustomer!.ingredients[index]);

    this.isRequesting = true;

    try {
      if (isCorrect) {
        this.customerMood = 'happy';
        let clank = this.buySound.cloneNode() as HTMLAudioElement;
        clank.play().catch(e => console.log(e));
        
        const powerMult = (this.user.clickPower || 50) / 50; 
        const rewardCoins = Math.floor(this.currentCustomer.baseReward * powerMult);
        const rewardXp = this.currentCustomer.baseXp;
        const energyCost = 10;
        
        const res: any = await lastValueFrom(this.api.play(rewardCoins, rewardXp, energyCost));
        this.user = res.user;
        this.user.clickPower = res.clickPower;
        
        this.spawnFloatingText(`+${rewardCoins} 💰`, '#4CAF50');
        this.spawnFloatingText(`+${rewardXp} ⭐`, '#2196F3', 50);

      } else {
        this.customerMood = 'angry';
        let beep = this.wrongSound.cloneNode() as HTMLAudioElement;
        beep.play().catch(e => console.log(e));
        
        const res: any = await lastValueFrom(this.api.play(0, 0, 15));
        this.user = res.user;
        this.user.clickPower = res.clickPower;
        
        this.spawnFloatingText(`Salah! -15 ⚡`, '#F44336');
      }
    } catch (e: any) {
      console.error('Error playing game', e);
      if(e.error && e.error.error) alert(e.error.error);
    } finally {
      this.isRequesting = false;
      setTimeout(() => {
        this.generateCustomer();
      }, 1500); 
    }
  }
  
  spawnFloatingText(text: string, color: string, offset = 0) {
    const id = Date.now() + Math.random();
    this.floatingTexts.push({ id, x: window.innerWidth / 2 - 50 + offset, y: window.innerHeight / 2 - 100, text, color });
    setTimeout(() => { this.floatingTexts = this.floatingTexts.filter(t => t.id !== id); }, 1500);
  }

  startAutoClicker() {
    if (this.autoClickInterval) clearInterval(this.autoClickInterval);
    
    // Sync with backend every 10 seconds to get auto-clicker rewards & energy regen
    this.autoClickInterval = setInterval(async () => {
      try {
        const res: any = await lastValueFrom(this.api.idle());
        if (res.reward > 0) {
          this.user.coins += res.reward;
          this.user.energy = res.energy;
          
          if (this.user.autoClicker > 0) {
            const id = Date.now() + Math.random();
            this.floatingTexts.push({ id, x: 10 + Math.random()*50, y: window.innerHeight - 150, text: `+${res.reward} 🤖`, color: '#ffeb3b' });
            setTimeout(() => { this.floatingTexts = this.floatingTexts.filter(t => t.id !== id); }, 1000);
          }
        } else if (res.energy > this.user.energy) {
          this.user.energy = res.energy; // Just update energy if no coin reward
        }
      } catch(e) {
        console.error("Auto-sync error", e);
      }
    }, 10000); 
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
}
