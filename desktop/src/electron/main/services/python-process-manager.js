const { spawn } = require('child_process');
const http = require('http');

/**
 * Python 进程管理器
 * 负责启动、停止和监控 Python FastAPI 服务进程
 */
class PythonProcessManager {
  constructor(config = {}) {
    // 配置参数
    this.pythonPath = config.pythonPath || 'python';
    this.scriptPath = config.scriptPath || './python_service/main.py';
    this.port = config.port || 8000;
    this.host = config.host || '127.0.0.1';
    this.startupTimeout = config.startupTimeout || 10000; // 10秒超时
    this.healthCheckInterval = config.healthCheckInterval || 30000; // 30秒
    this.maxRestartAttempts = config.maxRestartAttempts || 3;
    
    // 状态管理
    this.status = 'stopped'; // 'stopped', 'starting', 'running', 'error'
    this.process = null;
    this.restartAttempts = 0;
    this.startupTimer = null;
    this.healthCheckTimer = null;
    
    // 日志回调
    this.onLog = null;
    this.onError = null;
  }

  /**
   * 设置日志回调
   */
  setOnLog(callback) {
    this.onLog = callback;
  }

  /**
   * 设置错误回调
   */
  setOnError(callback) {
    this.onError = callback;
  }

  /**
   * 记录日志
   */
  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[PythonProcessManager] [${timestamp}] ${message}`;
    
    if (this.onLog) {
      this.onLog(logMessage);
    } else {
      console.log(logMessage);
    }
  }

  /**
   * 记录错误
   */
  error(message) {
    const errorMessage = `[PythonProcessManager] [${new Date().toISOString()}] ERROR: ${message}`;
    
    if (this.onError) {
      this.onError(errorMessage);
    } else {
      console.error(errorMessage);
    }
  }

  /**
   * 启动 Python 服务
   */
  async start() {
    if (this.status === 'running') {
      this.log('Python service is already running');
      return;
    }

    this.status = 'starting';
    this.log(`Starting Python service on ${this.host}:${this.port}...`);

    try {
      // 启动 Python 进程
      this.process = spawn(this.pythonPath, [
        '-m', 'uvicorn',
        this.scriptPath,
        '--host', this.host,
        '--port', this.port
      ], {
        cwd: process.cwd(),
        shell: true
      });

      // 捕获进程输出
      this.process.stdout.on('data', (data) => {
        const output = data.toString().trim();
        this.log(`Python stdout: ${output}`);
      });

      this.process.stderr.on('data', (data) => {
        const output = data.toString().trim();
        this.error(`Python stderr: ${output}`);
      });

      // 监听进程退出
      this.process.on('close', (code) => {
        this.log(`Python process exited with code ${code}`);
        this.handleProcessExit(code);
      });

      this.process.on('error', (error) => {
        this.error(`Failed to start Python process: ${error.message}`);
        this.status = 'error';
        if (this.onError) {
          this.onError(`Failed to start Python process: ${error.message}`);
        }
      });

      // 启动超时检测
      this.startupTimer = setTimeout(() => {
        if (this.status === 'starting') {
          this.error('Python service startup timeout (10 seconds)');
          this.stop();
          this.status = 'error';
          if (this.onError) {
            this.onError('Python service startup timeout');
          }
        }
      }, this.startupTimeout);

      // 等待服务就绪
      await this.waitForServiceReady();

    } catch (error) {
      this.error(`Error starting Python service: ${error.message}`);
      this.status = 'error';
      if (this.onError) {
        this.onError(`Error starting Python service: ${error.message}`);
      }
    }
  }

  /**
   * 等待服务就绪（健康检查）
   */
  async waitForServiceReady() {
    const maxAttempts = 20;
    const retryInterval = 500; // 500ms
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const isHealthy = await this.healthCheck();
        if (isHealthy) {
          this.log('Python service is ready');
          clearTimeout(this.startupTimer);
          this.status = 'running';
          this.restartAttempts = 0;
          
          // 启动定期健康检查
          this.startHealthCheck();
          return;
        }
      } catch (error) {
        // 忽略健康检查错误，继续重试
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }

    this.error('Python service failed to start within timeout');
    clearTimeout(this.startupTimer);
    this.stop();
    this.status = 'error';
    if (this.onError) {
      this.onError('Python service failed to start');
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    return new Promise((resolve) => {
      const options = {
        hostname: this.host,
        port: this.port,
        path: '/api/health',
        method: 'GET',
        timeout: 5000 // 5秒超时
      };

      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response.status === 'healthy');
          } catch (error) {
            resolve(false);
          }
        });
      });

      req.on('error', () => {
        resolve(false);
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  }

  /**
   * 启动定期健康检查
   */
  startHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      try {
        const isHealthy = await this.healthCheck();
        if (!isHealthy && this.status === 'running') {
          this.log('Health check failed, restarting service...');
          this.restart();
        }
      } catch (error) {
        this.log(`Health check error: ${error.message}`);
      }
    }, this.healthCheckInterval);
  }

  /**
   * 处理进程退出
   */
  handleProcessExit(code) {
    if (this.status === 'stopped') {
      // 正常停止
      return;
    }

    this.log(`Python process exited with code ${code}`);
    
    if (this.restartAttempts < this.maxRestartAttempts) {
      this.restartAttempts++;
      this.log(`Restarting Python service (attempt ${this.restartAttempts}/${this.maxRestartAttempts})...`);
      this.status = 'starting';
      setTimeout(() => this.start(), 1000);
    } else {
      this.error('Python service failed after maximum restart attempts');
      this.status = 'error';
      if (this.onError) {
        this.onError('Python service failed after maximum restart attempts');
      }
    }
  }

  /**
   * 停止 Python 服务
   */
  async stop() {
    if (this.status === 'stopped') {
      this.log('Python service is already stopped');
      return;
    }

    this.log('Stopping Python service...');
    
    // 停止健康检查
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // 停止启动超时计时器
    if (this.startupTimer) {
      clearTimeout(this.startupTimer);
      this.startupTimer = null;
    }

    if (this.process) {
      // 发送 SIGTERM 信号
      this.process.kill('SIGTERM');
      
      // 等待进程优雅退出
      await new Promise(resolve => {
        this.process.on('close', () => {
          resolve();
        });
        
        // 5秒后强制终止
        setTimeout(() => {
          this.process.kill('SIGKILL');
          resolve();
        }, 5000);
      });

      this.process = null;
    }

    this.status = 'stopped';
    this.log('Python service stopped');
  }

  /**
   * 重启 Python 服务
   */
  async restart() {
    await this.stop();
    await this.start();
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return this.status;
  }

  /**
   * 获取服务 URL
   */
  getServiceURL() {
    return `http://${this.host}:${this.port}`;
  }

  /**
   * 获取进程引用（用于调试）
   */
  getProcess() {
    return this.process;
  }
}

module.exports = PythonProcessManager;
