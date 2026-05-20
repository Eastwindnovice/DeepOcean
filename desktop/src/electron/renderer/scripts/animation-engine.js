class AnimationEngine {
  constructor() {
    this.animations = new Map();
    this.isRunning = false;
  }
  
  // 注册动画
  register(name, animationFn) {
    this.animations.set(name, animationFn);
  }
  
  // 播放动画
  play(name, ...args) {
    const animation = this.animations.get(name);
    if (animation) {
      animation(...args);
    }
  }
  
  // 停止所有动画
  stopAll() {
    this.animations.forEach((animation, name) => {
      if (typeof animation.stop === 'function') {
        animation.stop();
      }
    });
  }
  
  // 演示状态切换（用于测试）
  demoStateTransition() {
    // 显示面板
    window.overlayPanel.show();
    
    // 2 秒后切换到处理状态
    setTimeout(() => {
      window.overlayPanel.setState('processing');
      window.overlayPanel.typeText('打开环境变量设置');
    }, 2000);
    
    // 5 秒后切换到执行状态
    setTimeout(() => {
      window.overlayPanel.setState('executing');
      window.overlayPanel.setTranscription('正在打开环境变量...');
    }, 5000);
    
    // 8 秒后自动关闭
    setTimeout(() => {
      window.overlayPanel.hide();
    }, 8000);
  }
}

// 导出实例
window.animationEngine = new AnimationEngine();
