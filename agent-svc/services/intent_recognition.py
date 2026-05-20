"""
Intent Recognition Service for DeepOcean AI Agent

This module provides AI-powered intent recognition using the Qwen API,
with support for multiple operation types and confidence-based clarification.
"""

import os
import json
from typing import Dict, Any, Optional
from enum import Enum

from pydantic import BaseModel, Field
from dashscope import Generation


class IntentType(Enum):
    """Supported intent types."""
    OPEN_APPLICATION = "open_application"
    CLOSE_APPLICATION = "close_application"
    SEARCH_WEB = "search_web"


class IntentResult(BaseModel):
    """Result model for intent recognition."""
    intent: str = Field(..., description="Recognized intent type")
    target: str = Field(..., description="Target application or search query")
    summary: str = Field(..., description="Human-readable intent description")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score (0-1)")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Additional parameters")


class IntentRecognitionService:
    """
    Service for recognizing user intent from voice transcripts using Qwen API.
    
    Features:
    - AI-powered intent recognition using DashScope Qwen API
    - Confidence-based clarification for ambiguous intents
    - Support for multiple operation types
    - Robust error handling and response parsing
    """
    
    # Intent recognition prompt template
    INTENT_RECOGNITION_PROMPT = """你是一个智能助手，负责理解用户的语音指令并识别其意图。

用户输入：{transcript}

请分析用户意图，并以 JSON 格式返回：
{{
  "intent": "操作类型（open_application/close_application/search_web）",
  "target": "目标对象（应用名称或搜索关键词）",
  "summary": "人类可读的意图描述",
  "confidence": 置信度（0-1之间的浮点数）
}}

支持的应用程序：Chrome, Firefox, VSCode, Bilibili, 微信, QQ, Edge, Safari 等常见应用。
如果用户意图不明确，请将 confidence 设置为较低值（< 0.7）。

请直接返回 JSON 对象，不要包含其他文本。"""

    def __init__(self):
        """Initialize the intent recognition service."""
        self.api_key = os.getenv("DASHSCOPE_API_KEY")
        self.model = os.getenv("QWEN_MODEL", "qwen-plus")
        self.timeout = int(os.getenv("API_TIMEOUT", "10"))
        
        if not self.api_key:
            raise ValueError("DASHSCOPE_API_KEY environment variable is not set")
    
    def _build_prompt(self, transcript: str) -> str:
        """
        Build the prompt for intent recognition.
        
        Args:
            transcript: User's voice transcript
        
        Returns:
            Formatted prompt string
        """
        return self.INTENT_RECOGNITION_PROMPT.format(transcript=transcript)
    
    def _parse_response(self, response: Dict[str, Any]) -> IntentResult:
        """
        Parse the AI response into an IntentResult object.
        
        Args:
            response: Raw response from Qwen API
        
        Returns:
            Parsed IntentResult object
        
        Raises:
            ValueError: If response cannot be parsed or is invalid
        """
        try:
            # Extract text from response
            text = response.get("output", {}).get("text", "")
            
            if not text:
                raise ValueError("Empty response from AI")
            
            # Try to parse JSON from response
            # Remove any markdown code blocks or extra text
            json_str = text.strip()
            if json_str.startswith("```json"):
                json_str = json_str[7:]
            if json_str.startswith("```"):
                json_str = json_str[3:]
            if json_str.endswith("```"):
                json_str = json_str[:-3]
            json_str = json_str.strip()
            
            data = json.loads(json_str)
            
            # Validate required fields
            required_fields = ["intent", "target", "summary", "confidence"]
            for field in required_fields:
                if field not in data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Validate intent type
            intent_value = data["intent"].lower()
            if intent_value not in ["open_application", "close_application", "search_web"]:
                raise ValueError(f"Invalid intent type: {intent_value}")
            
            # Validate confidence
            confidence = float(data["confidence"])
            if not (0.0 <= confidence <= 1.0):
                raise ValueError(f"Confidence must be between 0 and 1, got {confidence}")
            
            return IntentResult(
                intent=intent_value,
                target=str(data["target"]),
                summary=str(data["summary"]),
                confidence=confidence,
                parameters=data.get("parameters", {})
            )
            
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse AI response as JSON: {e}")
        except KeyError as e:
            raise ValueError(f"Missing expected field in AI response: {e}")
    
    def _call_qwen_api(self, prompt: str) -> Dict[str, Any]:
        """
        Call the Qwen API with the given prompt.
        
        Args:
            prompt: The prompt to send to Qwen API
        
        Returns:
            Raw response from Qwen API
        
        Raises:
            Exception: If API call fails
        """
        messages = [{"role": "user", "content": prompt}]
        
        response = Generation.call(
            model=self.model,
            messages=messages,
            temperature=0.3,
            max_tokens=512
        )
        
        return response
    
    def recognize_intent(self, transcript: str) -> IntentResult:
        """
        Recognize user intent from voice transcript.
        
        Args:
            transcript: User's voice transcript
        
        Returns:
            IntentResult with recognized intent details
        
        Raises:
            Exception: If intent recognition fails
        """
        # Build prompt
        prompt = self._build_prompt(transcript)
        
        # Call Qwen API
        response = self._call_qwen_api(prompt)
        
        # Parse response
        result = self._parse_response(response)
        
        return result
    
    def needs_clarification(self, result: IntentResult) -> bool:
        """
        Check if the recognized intent needs clarification.
        
        Args:
            result: IntentResult from recognition
        
        Returns:
            True if confidence is below threshold (0.7), False otherwise
        """
        return result.confidence < 0.7


# Global service instance
intent_recognition_service = IntentRecognitionService()
