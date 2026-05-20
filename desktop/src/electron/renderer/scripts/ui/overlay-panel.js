class OverlayPanel {
  constructor() {
    this.panel = document.getElementById('overlay-panel');
    this.stateText = document.getElementById('state-text');
    this.transcription = document.getElementById('transcription');
    this.loadingSpinner = document.getElementById('loading-spinner');
    this.confirmationButtons = document.getElementById('confirmation-buttons');
    this.confirmYesBtn = document.getElementById('confirm-yes');
    this.confirmNoBtn = document.getElementById('confirm-no');
    this.textInput = document.getElementById('text-input');
    this.sendBtn = document.getElementById('send-btn');
    this.textInputContainer = document.getElementById('text-input-container');
    this.isVisible = false;
    this.isRecording = false;
    this.currentIntentData = null;
    
    this.states = {
      LISTENING: 'listening',
      PROCESSING: 'processing',
      EXECUTING: 'executing',
      CONFIRMING: 'confirming'
    };
    
    this.currentState = this.states.LISTENING;
    
    // 绑定发送按钮事件
    this.sendBtn.addEventListener('click', () => {
      this.handleTextInput();
    });
    
    // 绑定回车键事件
    this.textInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleTextInput();
      }
    });
    
    // 绑定按钮事件
    this.confirmYesBtn.addEventListener('click', () => {
      this.hideConfirmationButtons();
      this.setState(this.states.EXECUTING);
      this.executeCommand();
    });
    
    this.confirmNoBtn.addEventListener('click', () => {
      this.hideConfirmationButtons();
      this.setState(this.states.LISTENING);
      this.transcription.textContent = '';
      this.currentIntentData = null;
      console.log('用户取消执行');
      
      // 重新开始
      this.setState(this.states.LISTENING);
      this.textInput.focus();
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
    // 强制重置状态，确保可以重复显示
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
    
    // 聚焦到输入框
    setTimeout(() => {
      this.textInput.focus();
    }, 300);
  }
  
  /**
   * 处理文本输入
   */
  async handleTextInput() {
    const text = this.textInput.value.trim();
    
    if (!text) {
      return;
    }
    
    // 清空输入框
    this.textInput.value = '';
    
    // 显示输入的文本
    this.transcription.textContent = text;
    
    // 进入处理状态
    this.setState(this.states.PROCESSING);
    
    try {
      // 发送到后端进行意图识别
      const response = await fetch('http://127.0.0.1:8000/api/text-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });
      
      if (!response.ok) {
        throw new Error('服务器响应错误');
      }
      
      const result = await response.json();
      
      // 处理API响应
      this.handleAPIResponse(result);
      
    } catch (error) {
      console.error('处理命令失败:', error);
      this.setError(error.message || '处理失败');
      
      // 3秒后重新开始
      setTimeout(() => {
        this.setState(this.states.LISTENING);
        this.transcription.textContent = '';
        this.textInput.focus();
      }, 3000);
    }
  }
  
  /**
   * 开始语音识别
   */
  async startVoiceRecognition() {
    try {
      if (!window.voiceRecognizer.supported) {
        this.setError('浏览器不支持语音识别');
        return;
      }
      
      this.isRecording = true;
      
      // 设置回调
      window.voiceRecognizer.onInterimResult = (text) => {
        // 实时显示临时识别结果
        this.transcription.textContent = text;
      };
      
      window.voiceRecognizer.onFinalResult = (text) => {
        // 显示最终识别结果
        this.transcription.textContent = text;
      };
      
      window.voiceRecognizer.onError = (error) => {
        console.error('语音识别错误:', error);
        this.setError('语音识别失败');
      };
      
      // 开始识别
      window.voiceRecognizer.start();
      
      this.setState(this.states.LISTENING);
      this.stateText.textContent = '正在聆听... (按空格键停止)';
      this.transcription.textContent = '🎤 请说话...';
      
      console.log('开始语音识别...');
    } catch (error) {
      console.error('启动语音识别失败:', error);
      this.setError('无法启动语音识别');
    }
  }
  
  /**
   * 停止语音识别并处理
   */
  async stopVoiceRecognition() {
    if (!this.isRecording) return;
    
    try {
      this.isRecording = false;
      
      // 停止识别
      window.voiceRecognizer.stop();
      
      // 获取识别文本
      const transcript = window.voiceRecognizer.getFinalTranscript();
      
      if (!transcript || transcript.trim() === '') {
        this.setError('未识别到语音');
        setTimeout(() => {
          this.setState(this.states.LISTENING);
          this.startVoiceRecognition();
        }, 2000);
        return;
      }
      
      this.setState(this.states.PROCESSING);
      
      // 发送到后端进行意图识别
      const response = await fetch('http://127.0.0.1:8000/api/text-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: transcript
        })
      });
      
      const result = await response.json();
      
      // 处理API响应
      this.handleAPIResponse(result);
      
    } catch (error) {
      console.error('处理语音失败:', error);
      this.setError(error.message || '处理失败');
      
      // 3秒后重新开始
      setTimeout(() => {
        this.setState(this.states.LISTENING);
        this.startVoiceRecognition();
      }, 3000);
    }
  }
  
  /**
   * 处理API响应
   */
  handleAPIResponse(result) {
    if (!result.success) {
      // 如果是置信度不足，显示识别结果但不执行
      if (result.intent && result.intent.confidence < 0.7) {
        this.setTranscription(result.intent.transcript || '');
        this.setError(`意图不明确 (${(result.intent.confidence * 100).toFixed(0)}%)`);
        
        // 3秒后重新开始
        setTimeout(() => {
          this.setState(this.states.LISTENING);
          this.transcription.textContent = '';
          this.textInput.focus();
        }, 3000);
      } else {
        this.setError(result.message);
        
        // 3秒后重新开始
        setTimeout(() => {
          this.setState(this.states.LISTENING);
          this.startVoiceRecognition();
        }, 3000);
      }
      return;
    }
    
    // 保存意图数据
    this.currentIntentData = result.intent;
    
    // 显示识别的文本
    if (result.intent && result.intent.transcript) {
      this.setTranscription(result.intent.transcript);
    }
    
    // 显示意图摘要并请求确认
    if (result.intent && result.intent.summary) {
      this.stateText.textContent = result.intent.summary;
    }
    
    // 进入确认状态
    this.setState(this.states.CONFIRMING);
  }
  
  /**
   * 执行命令
   */
  async executeCommand() {
    if (!this.currentIntentData) {
      this.setError('没有可执行的命令');
      return;
    }
    
    try {
      this.setState(this.states.EXECUTING);
      
      // 调用新的执行接口
      const response = await fetch('http://127.0.0.1:8000/api/execute-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: this.currentIntentData.transcript
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.setCompleted();
      } else {
        this.setError(result.message);
        
        // 3秒后重新开始
        setTimeout(() => {
          this.setState(this.states.LISTENING);
          this.transcription.textContent = '';
          this.currentIntentData = null;
          this.textInput.focus();
        }, 3000);
      }
      
    } catch (error) {
      console.error('执行命令失败:', error);
      this.setError('执行失败');
      
      // 3秒后重新开始
      setTimeout(() => {
        this.setState(this.states.LISTENING);
        this.transcription.textContent = '';
        this.currentIntentData = null;
        this.startVoiceRecognition();
        }, 3000);
    }
  }
  
  hide() {
    if (!this.isVisible) return;
    
    // 停止语音识别（如果正在进行）
    if (this.isRecording && window.voiceRecognizer) {
      window.voiceRecognizer.abort();
      this.isRecording = false;
    }
    
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
      
      // 重置状态，确保下次可以正常显示
      this.currentState = this.states.LISTENING;
      this.transcription.textContent = '';
      this.currentIntentData = null;
    }, 300);
  }
  
  setState(state) {
    this.currentState = state;
    
    switch (state) {
      case this.states.LISTENING:
        this.stateText.textContent = '请输入命令';
        this.loadingSpinner.classList.add('hidden');
        this.textInputContainer.style.display = 'flex';
        this.hideConfirmationButtons();
        window.centerAnimation.setListening();
        break;
        
      case this.states.PROCESSING:
        this.stateText.textContent = '正在思考...';
        this.loadingSpinner.classList.remove('hidden');
        this.textInputContainer.style.display = 'none';
        this.hideConfirmationButtons();
        window.centerAnimation.setProcessing();
        break;
        
      case this.states.CONFIRMING:
        this.stateText.textContent = '请确认您的指令';
        this.loadingSpinner.classList.add('hidden');
        this.textInputContainer.style.display = 'none';
        this.showConfirmationButtons();
        window.centerAnimation.setListening();
        break;
        
      case this.states.EXECUTING:
        this.stateText.textContent = '正在执行...';
        this.loadingSpinner.classList.remove('hidden');
        this.textInputContainer.style.display = 'none';
        this.hideConfirmationButtons();
        window.centerAnimation.setExecuting();
        break;
    }
  }
  
  setCompleted() {
    this.stateText.textContent = '完成';
    this.loadingSpinner.classList.add('hidden');
    this.hideConfirmationButtons();
    window.centerAnimation.setCompleted();
    
    // 2秒后重置
    setTimeout(() => {
      this.hide();
    }, 2000);
  }
  
  setError(message) {
    this.stateText.textContent = `错误: ${message}`;
    this.loadingSpinner.classList.add('hidden');
    this.transcription.textContent = '';
    this.hideConfirmationButtons();
    window.centerAnimation.setError();
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
