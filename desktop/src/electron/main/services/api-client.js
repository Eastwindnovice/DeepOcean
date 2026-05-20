const axios = require('axios');

/**
 * API Client for communicating with Python FastAPI service
 */
class APIClient {
  constructor(baseURL = 'http://127.0.0.1:8000', timeout = 10000) {
    this.baseURL = baseURL;
    this.timeout = timeout;
    
    // Create axios instance with default configuration
    this.client = axios.create({
      baseURL: baseURL,
      timeout: timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this._handleError(error)
    );
  }

  /**
   * Handle HTTP errors and timeouts
   * @param {Error} error - The error object from axios
   * @returns {Promise<never>} - Rejects with a formatted error
   */
  _handleError(error) {
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error(`Request timeout after ${this.timeout}ms`));
    }
    
    if (error.code === 'ECONNREFUSED') {
      return Promise.reject(new Error(`Connection refused. Python service may not be running at ${this.baseURL}`));
    }
    
    if (error.code === 'ENOTFOUND') {
      return Promise.reject(new Error(`Service not found. Check if Python service is running at ${this.baseURL}`));
    }
    
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      const errorMessage = data?.error?.message || data?.message || `HTTP Error ${status}`;
      return Promise.reject(new Error(errorMessage));
    }
    
    return Promise.reject(new Error(`Network error: ${error.message}`));
  }

  /**
   * Recognize user intent from transcript
   * @param {string} transcript - The user's voice transcript
   * @returns {Promise<Object>} - The recognized intent result
   */
  async recognizeIntent(transcript) {
    if (!transcript || typeof transcript !== 'string') {
      return Promise.reject(new Error('Invalid transcript: must be a non-empty string'));
    }

    const response = await this.client.post('/api/intent/recognize', {
      transcript: transcript
    });

    return response.data;
  }

  /**
   * Execute a system command
   * @param {Object} command - The command to execute
   * @param {string} command.command - The command type (e.g., 'open_application')
   * @param {string} command.target - The target of the command (e.g., 'chrome')
   * @param {string} command.platform - The platform (e.g., 'win32', 'darwin', 'linux')
   * @param {Object} [command.parameters={}] - Additional command parameters
   * @returns {Promise<Object>} - The command execution result
   */
  async executeCommand(command) {
    if (!command || typeof command !== 'object') {
      return Promise.reject(new Error('Invalid command: must be an object'));
    }

    if (!command.command || !command.target || !command.platform) {
      return Promise.reject(new Error('Invalid command: missing required fields (command, target, platform)'));
    }

    const response = await this.client.post('/api/command/execute', {
      command: command.command,
      target: command.target,
      platform: command.platform,
      parameters: command.parameters || {}
    });

    return response.data;
  }

  /**
   * Check health status of Python service
   * @returns {Promise<Object>} - The health check result
   */
  async healthCheck() {
    const response = await this.client.get('/api/health');
    return response.data;
  }

  /**
   * Get the base URL of the Python service
   * @returns {string} - The base URL
   */
  getBaseURL() {
    return this.baseURL;
  }

  /**
   * Get the timeout value
   * @returns {number} - The timeout in milliseconds
   */
  getTimeout() {
    return this.timeout;
  }
}

module.exports = APIClient;
