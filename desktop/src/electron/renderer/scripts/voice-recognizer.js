/**
 * 语音识别模块（使用 Web Speech API）
 * 
 * 提供实时语音识别功能，无需后端音频处理
 */

class VoiceRecognizer {
  constructor() {
    this.recognition = null;
    this.isRecognizing = false;
    this.finalTranscript = '';
    this.interimTranscript = '';
    
    // 检查浏览器支持
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('浏览器不支持语音识别');
      this.supported = false;
      return;
    }
    
    this.supported = true;
    this.initRecognition();
  }

  /**
   * 初始化语音识别
   */
  initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    // 配置
    this.recognition.continuous = true;        // 持续识别
    this.recognition.interimResults = true;    // 返回临时结果
    this.recognition.lang = 'zh-CN';           // 中文识别
    this.recognition.maxAlternatives = 1;      // 只返回最佳结果
    
    // 监听识别结果
    this.recognition.onresult = (event) => {
      this.interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          // 最终结果
          this.finalTranscript += transcript;
          console.log('最终识别:', transcript);
          
          // 触发回调
          if (this.onFinalResult) {
            this.onFinalResult(transcript);
          }
        } else {
          // 临时结果
          this.interimTranscript += transcript;
          console.log('临时识别:', transcript);
          
          // 触发回调
          if (this.onInterimResult) {
            this.onInterimResult(transcript);
          }
        }
      }
    };
    
    // 监听错误
    this.recognition.onerror = (event) => {
      console.error('语音识别错误:', event.error);
      
      if (this.onError) {
        this.onError(event.error);
      }
    };
    
    // 监听结束
    this.recognition.onend = () => {
      console.log('语音识别结束');
      this.isRecognizing = false;
      
      if (this.onEnd) {
        this.onEnd(this.finalTranscript);
      }
    };
    
    // 监听开始
    this.recognition.onstart = () => {
      console.log('语音识别开始');
      this.isRecognizing = true;
      
      if (this.onStart) {
        this.onStart();
      }
    };
  }

  /**
   * 开始识别
   */
  start() {
    if (!this.supported) {
      throw new Error('浏览器不支持语音识别');
    }
    
    if (this.isRecognizing) {
      console.warn('语音识别已在运行');
      return;
    }
    
    this.finalTranscript = '';
    this.interimTranscript = '';
    
    try {
      this.recognition.start();
    } catch (error) {
      console.error('启动语音识别失败:', error);
      throw error;
    }
  }

  /**
   * 停止识别
   */
  stop() {
    if (!this.isRecognizing) {
      return;
    }
    
    this.recognition.stop();
  }

  /**
   * 取消识别
   */
  abort() {
    if (!this.isRecognizing) {
      return;
    }
    
    this.recognition.abort();
    this.finalTranscript = '';
    this.interimTranscript = '';
  }

  /**
   * 获取识别状态
   */
  getRecognitionState() {
    return this.isRecognizing;
  }

  /**
   * 获取最终文本
   */
  getFinalTranscript() {
    return this.finalTranscript;
  }

  /**
   * 获取临时文本
   */
  getInterimTranscript() {
    return this.interimTranscript;
  }
}

// 导出全局实例
window.voiceRecognizer = new VoiceRecognizer();
