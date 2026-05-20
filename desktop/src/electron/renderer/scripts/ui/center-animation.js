class CenterAnimation {
  constructor() {
    this.container = document.getElementById('center-animation');
    this.waves = this.container.querySelectorAll('.wave');
    this.isPlaying = false;
    this.hideTimeout = null;
    this.currentIntensity = 0; // 0: idle, 1: listening, 2: processing, 3: executing, 4: completed
  }
  
  // 设置波形强度
  setIntensity(intensity) {
    this.currentIntensity = intensity;
    
    // 移除所有强度类
    this.waves.forEach(wave => {
      wave.classList.remove('intensity-1', 'intensity-2', 'intensity-3', 'intensity-4');
    });
    
    // 根据状态设置波形强度
    if (intensity > 0) {
      this.waves.forEach((wave, index) => {
        // 每个波浪使用不同的强度类
        const intensityClass = `intensity-${Math.min(intensity, 4)}`;
        wave.classList.add(intensityClass);
      });
    }
  }
  
  start() {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.container.style.display = 'flex';
    
    // 默认进入聆听状态（活跃波形）
    this.setIntensity(1);
    
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
      this.setIntensity(0); // 重置为空闲状态
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
  
  // 状态控制方法
  setListening() {
    this.setIntensity(1); // 活跃波形
  }
  
  setProcessing() {
    this.setIntensity(2); // 处理中（脉动波形）
  }
  
  setExecuting() {
    this.setIntensity(3); // 执行中（更强脉动）
  }
  
  setCompleted() {
    this.setIntensity(4); // 完成（静态波形）
  }
  
  setError() {
    this.setIntensity(0); // 错误时停止动画
    this.stop();
  }
}

// 导出实例
window.centerAnimation = new CenterAnimation();
