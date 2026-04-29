export class ChessSoundManager {
  private static instance: ChessSoundManager
  private audioContext: AudioContext | null = null
  private sounds: HTMLAudioElement[] = []
  private enabled: boolean = true

  private constructor() {
    this.initializeSounds()
  }

  static getInstance(): ChessSoundManager {
    if (!ChessSoundManager.instance) {
      ChessSoundManager.instance = new ChessSoundManager()
    }
    return ChessSoundManager.instance
  }

  private initializeSounds() {
    // Initialize only 2 chess move sounds
    const soundFiles = [
      '/sounds/chess-sound1.mp3',
      '/sounds/chess-sound2.mp3'
    ]

    this.sounds = soundFiles.map(file => {
      const audio = new Audio(file)
      audio.preload = 'auto'
      return audio
    })
  }

  playMoveSound(): void {
    if (!this.enabled || this.sounds.length === 0) return

    // Randomly select one of the 2 sound variations
    const randomIndex = Math.floor(Math.random() * this.sounds.length)
    const sound = this.sounds[randomIndex]
    
    // Reset audio to start if it's already playing
    sound.currentTime = 0
    
    // Play the sound
    sound.play().catch(error => {
      // Silently handle audio play errors (common in browsers)
      console.debug('Sound play failed:', error)
    })
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  isEnabled(): boolean {
    return this.enabled
  }

  // Test method to verify sounds are working
  async testSound(): Promise<boolean> {
    if (this.sounds.length === 0) return false
    
    try {
      const sound = this.sounds[0]
      sound.currentTime = 0
      await sound.play()
      return true
    } catch {
      return false
    }
  }
}

// Export singleton instance for easy use
export const chessSounds = ChessSoundManager.getInstance()
