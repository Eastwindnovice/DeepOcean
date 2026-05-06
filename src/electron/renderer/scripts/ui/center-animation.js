class CenterAnimation {
  constructor() {
    this.container = document.getElementById('center-animation');
    this.isPlaying = false;
    this.hideTimeout = null;
  }
  
  start() {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.container.style.display = 'flex';
    
    // 2 秒后隐藏中央动画
    this.hideTimeout = setTimeout(() => {
      this.stop();
    }, 2000);
  }
  
  stop() {
    this.isPlaying = false;
    
    // 淡出动画
    this.container.style.transition = 'opacity 0.5s ease-out';
    this.container.style.opacity = '0';
    
    setTimeout(() => {
      this.container.style.display = 'none';
      this.container.style.opacity = '1';
      this.container.style.transition = '';
    }, 500);
    
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }
  
  reset() {
    this.stop();
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }
}

// 导出实例
window.centerAnimation = new CenterAnimation();
