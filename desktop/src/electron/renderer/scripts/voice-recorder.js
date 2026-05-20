/**
 * 语音录制模块
 * 
 * 提供语音录制、停止、发送到后端API的功能
 */

class VoiceRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.stream = null;
  }

  /**
   * 开始录音
   */
  async startRecording() {
    try {
      // 请求麦克风权限
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // 创建 MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.audioChunks = [];

      // 监听数据可用事件
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // 开始录音
      this.mediaRecorder.start();
      this.isRecording = true;

      console.log('开始录音...');
      return true;
    } catch (error) {
      console.error('启动录音失败:', error);
      throw new Error('无法访问麦克风，请检查权限设置');
    }
  }

  /**
   * 停止录音
   * @returns {Promise<Blob>} 返回录音的 Blob 对象
   */
  async stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('当前没有正在进行的录音'));
        return;
      }

      // 监听停止事件
      this.mediaRecorder.onstop = () => {
        // 创建音频 Blob
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        
        // 停止所有音频轨道
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
        }

        this.isRecording = false;
        console.log('录音已停止');
        
        resolve(audioBlob);
      };

      // 停止录音
      this.mediaRecorder.stop();
    });
  }

  /**
   * 发送音频到后端API
   * @param {Blob} audioBlob - 音频数据
   * @returns {Promise<Object>} API响应
   */
  async sendToAPI(audioBlob) {
    try {
      // 将 webm 转换为 wav（如果需要）
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      // 调用后端API
      const response = await fetch('http://127.0.0.1:8000/api/voice-command', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '服务器错误');
      }

      const result = await response.json();
      console.log('API响应:', result);
      
      return result;
    } catch (error) {
      console.error('发送音频到API失败:', error);
      throw error;
    }
  }

  /**
   * 取消录音
   */
  cancelRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.audioChunks = [];
      
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
      }
      
      this.isRecording = false;
      console.log('录音已取消');
    }
  }

  /**
   * 获取录音状态
   */
  getRecordingState() {
    return this.isRecording;
  }
}

// 导出全局实例
window.voiceRecorder = new VoiceRecorder();
