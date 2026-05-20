"""
千问 API 客户端模块

提供与千问大模型 API 交互的客户端实现，包含重试机制和超时处理。
"""

import os
import asyncio
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

import httpx
from dashscope import Generation


@dataclass
class QwenAPIResponse:
    """千问 API 响应数据"""
    text: str
    request_id: str
    output: Dict[str, Any]


class QwenAPIClient:
    """
    千问 API 客户端
    
    封装千问大模型 API 调用逻辑，提供重试机制和超时处理。
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "qwen-plus",
        timeout: float = 10.0,
        max_retries: int = 3,
        backoff_factor: float = 2.0
    ):
        """
        初始化千问 API 客户端
        
        Args:
            api_key: DashScope API Key，从环境变量读取
            model: 使用的模型名称，默认为 qwen-plus
            timeout: 请求超时时间（秒），默认为 10 秒
            max_retries: 最大重试次数，默认为 3 次
            backoff_factor: 指数退避因子，默认为 2.0
        """
        self.api_key = api_key or os.getenv("DASHSCOPE_API_KEY")
        if not self.api_key:
            raise ValueError("DASHSCOPE_API_KEY environment variable is not set")
        
        self.model = model
        self.timeout = timeout
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor
        
        # 配置 HTTPS 连接
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(timeout),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
        )

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1024
    ) -> QwenAPIResponse:
        """
        调用千问聊天完成 API
        
        Args:
            messages: 对话消息列表，格式为 [{"role": "user", "content": "..."}]
            temperature: 温度参数，控制生成文本的随机性（0.0-1.0）
            max_tokens: 最大生成 token 数量
            
        Returns:
            QwenAPIResponse: API 响应数据
            
        Raises:
            ValueError: 当 API Key 无效或请求参数错误时
            httpx.TimeoutException: 当请求超时时
            httpx.RequestError: 当网络请求失败时
        """
        async def make_request():
            """执行单次 API 请求"""
            response = await self._client.post(
                url="https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
                json={
                    "model": self.model,
                    "input": {
                        "messages": messages
                    },
                    "parameters": {
                        "temperature": temperature,
                        "max_tokens": max_tokens
                    }
                }
            )
            response.raise_for_status()
            data = response.json()
            
            # 解析响应
            text = data.get("output", {}).get("text", "")
            request_id = data.get("request_id", "")
            output = data.get("output", {})
            
            return QwenAPIResponse(
                text=text,
                request_id=request_id,
                output=output
            )

        return await self._retry_request(make_request)

    async def speech_to_text(self, audio_data: bytes, format: str = "webm") -> str:
        """
        调用千问语音识别 API (使用 DashScope SDK)
        
        Args:
            audio_data: 音频数据（字节流）
            format: 音频格式，支持 wav, mp3, pcm, webm 等
            
        Returns:
            str: 识别出的文本
            
        Raises:
            ValueError: 当 API Key 无效或请求参数错误时
            Exception: 当语音识别失败时
        """
        import tempfile
        import os
        import time
        from pathlib import Path
        from dashscope.audio.asr import Recognition
        
        # 使用项目目录下的 temp 文件夹
        temp_dir = Path(__file__).parent.parent / "temp"
        temp_dir.mkdir(exist_ok=True)
        
        # 生成唯一的临时文件名
        timestamp = int(time.time() * 1000)
        temp_file_path = str(temp_dir / f"audio_{timestamp}.{format}")
        
        # 保存音频数据
        with open(temp_file_path, 'wb') as f:
            f.write(audio_data)
        
        converted_file = None
        
        try:
            # 如果是 webm 格式，需要转换为 wav
            if format.lower() in ['webm', 'ogg']:
                try:
                    from pydub import AudioSegment
                    
                    audio = AudioSegment.from_file(temp_file_path, format=format)
                    # 转换为 16kHz 单声道 WAV
                    audio = audio.set_frame_rate(16000).set_channels(1)
                    
                    converted_file = str(temp_dir / f"audio_{timestamp}.wav")
                    audio.export(converted_file, format='wav')
                    
                    # 使用转换后的文件
                    recognition_file = converted_file
                    recognition_format = 'wav'
                    
                except ImportError:
                    raise Exception("需要安装 pydub 来转换音频格式: uv pip install pydub")
            else:
                recognition_file = temp_file_path
                recognition_format = format
            
            # 使用 DashScope SDK 进行语音识别
            recognition = Recognition(
                model='paraformer-realtime-v2',
                format=recognition_format,
                sample_rate=16000,
                callback=None
            )
            
            result = recognition.call(recognition_file)
            
            # 检查结果
            if result.status_code == 200:
                # 提取识别文本
                if hasattr(result.output, 'sentence'):
                    text = result.output.sentence.get('text', '')
                elif hasattr(result.output, 'text'):
                    text = result.output.text
                else:
                    text = str(result.output)
                
                return text
            else:
                raise Exception(f"语音识别失败: {result.message}")
                
        finally:
            # 延迟删除临时文件，避免文件被占用
            import asyncio
            
            async def cleanup_files():
                await asyncio.sleep(1)  # 等待 1 秒
                try:
                    if os.path.exists(temp_file_path):
                        os.remove(temp_file_path)
                    if converted_file and os.path.exists(converted_file):
                        os.remove(converted_file)
                except Exception as e:
                    print(f"清理临时文件失败: {e}")
            
            # 异步清理，不阻塞主流程
            asyncio.create_task(cleanup_files())

    async def _retry_request(
        self,
        func,
        max_retries: Optional[int] = None,
        backoff_factor: Optional[float] = None
    ) -> QwenAPIResponse:
        """
        带指数退避的重试机制
        
        Args:
            func: 要执行的异步函数
            max_retries: 最大重试次数，覆盖实例默认值
            backoff_factor: 指数退避因子，覆盖实例默认值
            
        Returns:
            QwenAPIResponse: API 响应数据
            
        Raises:
            httpx.TimeoutException: 当请求超时且重试耗尽时
            httpx.RequestError: 当网络请求失败且重试耗尽时
        """
        max_retries = max_retries if max_retries is not None else self.max_retries
        backoff_factor = backoff_factor if backoff_factor is not None else self.backoff_factor
        
        last_exception = None
        
        for attempt in range(max_retries):
            try:
                return await func()
            except (httpx.TimeoutException, httpx.RequestError) as e:
                last_exception = e
                if attempt < max_retries - 1:
                    # 指数退避等待
                    wait_time = backoff_factor ** attempt
                    await asyncio.sleep(wait_time)
                else:
                    raise
        
        # 理论上不会执行到这里，但为了类型安全保留
        raise last_exception

    async def close(self):
        """关闭 HTTP 客户端连接"""
        await self._client.aclose()

    async def __aenter__(self):
        """异步上下文管理器入口"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """异步上下文管理器出口"""
        await self.close()
