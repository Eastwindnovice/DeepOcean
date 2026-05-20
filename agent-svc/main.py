"""
Python 服务主模块

提供 FastAPI 应用和所有服务组件的初始化。
"""

import os
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path

# 首先加载环境变量（使用绝对路径）
from dotenv import load_dotenv

# 获取当前文件所在目录
current_dir = Path(__file__).parent
env_path = current_dir / ".env"

# 加载环境变量
load_dotenv(dotenv_path=env_path)

# 验证 API Key 是否加载
api_key = os.getenv("DASHSCOPE_API_KEY")
print(f"[INFO] API Key 已加载: {'是' if api_key else '否'}")
if api_key:
    print(f"[INFO] API Key 前缀: {api_key[:10]}...")
else:
    print(f"[ERROR] 未找到 API Key！.env 文件路径: {env_path}")
    print(f"[ERROR] .env 文件是否存在: {env_path.exists()}")

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from services.qwen_client import QwenAPIClient
from services.intent_recognition import IntentRecognitionService
from services.command_execution import CommandExecutionService

# 创建 FastAPI 应用
app = FastAPI(
    title="DeepOcean AI Service",
    description="AI Agent 语音控制服务",
    version="1.0.0"
)

# 配置 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源（生产环境应限制）
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化服务
qwen_client = QwenAPIClient()
intent_service = IntentRecognitionService()
command_service = CommandExecutionService()


class TextCommandRequest(BaseModel):
    """文本命令请求模型"""
    text: str


class CommandResponse(BaseModel):
    """命令响应模型"""
    success: bool
    message: str
    intent: Dict[str, Any] = None
    execution_result: Optional[Dict[str, Any]] = None


# 健康检查端点
@app.get("/api/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "services": {
            "qwen_api": "connected",
            "command_executor": "ready"
        }
    }


@app.post("/api/voice-command", response_model=CommandResponse)
async def process_voice_command(audio: UploadFile = File(...)):
    """
    处理语音命令
    
    1. 接收音频文件
    2. 调用千问语音识别API转换为文本
    3. 识别用户意图
    4. 执行对应的系统命令
    
    Args:
        audio: 上传的音频文件（支持 wav, mp3, pcm 等格式）
        
    Returns:
        CommandResponse: 包含执行结果的响应
    """
    try:
        # 1. 读取音频数据
        audio_data = await audio.read()
        
        # 获取音频格式
        file_extension = audio.filename.split(".")[-1] if "." in audio.filename else "wav"
        
        # 2. 语音识别
        transcript = await qwen_client.speech_to_text(audio_data, format=file_extension)
        
        if not transcript:
            raise HTTPException(status_code=400, detail="语音识别失败，未能识别出文本")
        
        # 3. 意图识别
        intent_result = intent_service.recognize_intent(transcript)
        
        # 检查是否需要澄清
        if intent_service.needs_clarification(intent_result):
            return CommandResponse(
                success=False,
                message=f"意图不够明确（置信度: {intent_result.confidence:.2f}），请重新表述您的指令",
                intent={
                    "intent": intent_result.intent,
                    "target": intent_result.target,
                    "summary": intent_result.summary,
                    "confidence": intent_result.confidence
                }
            )
        
        # 4. 执行命令
        execution_result = await command_service.execute_command(
            command_type=intent_result.intent,
            target=intent_result.target,
            platform=sys.platform
        )
        
        return CommandResponse(
            success=execution_result["success"],
            message=execution_result["message"],
            intent={
                "intent": intent_result.intent,
                "target": intent_result.target,
                "summary": intent_result.summary,
                "confidence": intent_result.confidence,
                "transcript": transcript
            },
            execution_result=execution_result
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理语音命令时出错: {str(e)}")


@app.post("/api/text-command", response_model=CommandResponse)
async def process_text_command(request: TextCommandRequest):
    """
    处理文本命令（用于测试和调试）
    
    1. 接收文本输入
    2. 识别用户意图
    3. 返回意图信息等待用户确认（不执行命令）
    
    Args:
        request: 包含文本命令的请求
        
    Returns:
        CommandResponse: 包含意图识别结果的响应
    """
    try:
        print(f"[DEBUG] 收到文本命令: {request.text}")
        
        # 1. 意图识别
        try:
            intent_result = intent_service.recognize_intent(request.text)
            print(f"[DEBUG] 意图识别结果: {intent_result}")
        except Exception as e:
            print(f"[ERROR] 意图识别失败: {str(e)}")
            raise HTTPException(status_code=500, detail=f"意图识别失败: {str(e)}")
        
        # 检查是否需要澄清
        if intent_service.needs_clarification(intent_result):
            return CommandResponse(
                success=False,
                message=f"意图不够明确（置信度: {intent_result.confidence:.2f}），请重新表述您的指令",
                intent={
                    "intent": intent_result.intent,
                    "target": intent_result.target,
                    "summary": intent_result.summary,
                    "confidence": intent_result.confidence
                }
            )
        
        # 2. 返回意图信息，等待用户确认（不执行命令）
        print(f"[DEBUG] 意图识别成功，等待用户确认")
        return CommandResponse(
            success=True,
            message="意图识别成功，等待用户确认",
            intent={
                "intent": intent_result.intent,
                "target": intent_result.target,
                "summary": intent_result.summary,
                "confidence": intent_result.confidence,
                "transcript": request.text
            },
            execution_result=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] 处理文本命令时出错: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"处理文本命令时出错: {str(e)}")


@app.post("/api/execute-command", response_model=CommandResponse)
async def execute_confirmed_command(request: TextCommandRequest):
    """
    执行已确认的命令
    
    用户点击确认按钮后调用此接口执行命令
    
    Args:
        request: 包含文本命令的请求
        
    Returns:
        CommandResponse: 包含执行结果的响应
    """
    try:
        print(f"[DEBUG] 用户确认执行命令: {request.text}")
        
        # 1. 重新识别意图（确保一致性）
        try:
            intent_result = intent_service.recognize_intent(request.text)
            print(f"[DEBUG] 意图识别结果: {intent_result}")
        except Exception as e:
            print(f"[ERROR] 意图识别失败: {str(e)}")
            raise HTTPException(status_code=500, detail=f"意图识别失败: {str(e)}")
        
        # 2. 执行命令
        try:
            execution_result = await command_service.execute_command(
                command_type=intent_result.intent,
                target=intent_result.target,
                platform=sys.platform
            )
            print(f"[DEBUG] 命令执行结果: {execution_result}")
        except Exception as e:
            print(f"[ERROR] 命令执行失败: {str(e)}")
            raise HTTPException(status_code=500, detail=f"命令执行失败: {str(e)}")
        
        return CommandResponse(
            success=execution_result["success"],
            message=execution_result["message"],
            intent={
                "intent": intent_result.intent,
                "target": intent_result.target,
                "summary": intent_result.summary,
                "confidence": intent_result.confidence,
                "transcript": request.text
            },
            execution_result=execution_result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] 执行命令时出错: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"执行命令时出错: {str(e)}")


@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时清理资源"""
    await qwen_client.close()
