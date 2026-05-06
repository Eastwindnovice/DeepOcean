class OverlayPanel {
  constructor() {
    this.panel = document.getElementById('overlay-panel');
    this.stateText = document.getElementById('state-text');
    this.transcription = document.getElementById('transcription');
    this.loadingSpinner = document.getElementById('loading-spinner');
    this.confirmationButtons = document.getElementById('confirmation-buttons');
    this.confirmYesBtn = document.getElementById('confirm-yes');
    this.confirmNoBtn = document.getElementById('confirm-no');
    this.isVisible = false;
    
    this.states = {
      LISTENING: 'listening',
      PROCESSING: 'processing',
      EXECUTING: 'executing',
      CONFIRMING: 'confirming'  // 新增：等待用户确认状态
    };
    
    this.currentState = this.states.LISTENING;
    
    // 绑定按钮事件（仅UI演示，不实现实际功能）
    this.confirmYesBtn.addEventListener('click', () => {
      this.hideConfirmationButtons();
      this.setState(this.states.EXECUTING);
      // TODO: 这里将来会调用实际的执行逻辑
      console.log('用户确认执行');
    });
    
    this.confirmNoBtn.addEventListener('click', () => {
      this.hideConfirmationButtons();
      this.setState(this.states.LISTENING);
      this.transcription.textContent = '';
      // TODO: 这里将来会取消执行
      console.log('用户取消执行');
    });
    
    // 监听点击事件（点击面板外部关闭）
    document.addEventListener('click', (e) => {
      if (this.isVisible && !this.panel.contains(e.target)) {
        this.hide();
      }
    });
    
    // 监听 ESC 键
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  }
  
  show() {
    if (this.isVisible) return;
    
    this.isVisible = true;
    this.panel.classList.remove('hidden', 'hide');
    this.panel.classList.add('show');
    
    // 设置鼠标事件
    window.electronAPI.setIgnoreMouseEvents(false);
    
    // 启动动画
    window.centerAnimation.start();
    window.borderGlow.start();
    
    // 默认进入监听状态
    this.setState(this.states.LISTENING);
  }
  
  hide() {
    if (!this.isVisible) return;
    
    this.isVisible = false;
    this.panel.classList.remove('show');
    this.panel.classList.add('hide');
    
    // 隐藏确认按钮
    this.hideConfirmationButtons();
    
    // 停止动画
    window.centerAnimation.reset();
    window.borderGlow.stop();
    
    // 动画结束后隐藏
    setTimeout(() => {
      this.panel.classList.add('hidden');
      this.panel.classList.remove('hide');
      
      // 恢复鼠标穿透
      window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
      
      // 通知主进程隐藏窗口
      window.electronAPI.hideWindow();
    }, 300);
  }
  
  setState(state) {
    this.currentState = state;
    
    switch (state) {
      case this.states.LISTENING:
        this.stateText.textContent = '正在聆听...';
        this.loadingSpinner.classList.add('hidden');
        this.transcription.textContent = '';
        this.hideConfirmationButtons();
        break;
        
      case this.states.PROCESSING:
        this.stateText.textContent = '正在理解...';
        this.loadingSpinner.classList.remove('hidden');
        this.hideConfirmationButtons();
        break;
        
      case this.states.CONFIRMING:
        this.stateText.textContent = '请确认您的指令';
        this.loadingSpinner.classList.add('hidden');
        this.showConfirmationButtons();
        break;
        
      case this.states.EXECUTING:
        this.stateText.textContent = '正在执行...';
        this.loadingSpinner.classList.remove('hidden');
        this.hideConfirmationButtons();
        break;
    }
  }
  
  setTranscription(text) {
    this.transcription.textContent = text;
  }
  
  // 模拟打字机效果
  typeText(text, speed = 50) {
    this.transcription.textContent = '';
    let index = 0;
    
    const type = () => {
      if (index < text.length) {
        this.transcription.textContent += text.charAt(index);
        index++;
        setTimeout(type, speed);
      }
    };
    
    type();
  }
  
  // 显示确认按钮
  showConfirmationButtons() {
    this.confirmationButtons.classList.add('show');
  }
  
  // 隐藏确认按钮
  hideConfirmationButtons() {
    this.confirmationButtons.classList.remove('show');
  }
  
  // 演示方法：模拟完整的语音识别流程（仅用于测试UI）
  demoFlow() {
    // 1. 显示面板，进入聆听状态
    this.show();
    
    // 2. 2秒后模拟识别到文本
    setTimeout(() => {
      this.setTranscription('打开环境变量设置');
      this.setState(this.states.PROCESSING);
    }, 2000);
    
    // 3. 3秒后进入确认状态
    setTimeout(() => {
      this.setState(this.states.CONFIRMING);
    }, 5000);
  }
}

// 导出实例
window.overlayPanel = new OverlayPanel();
