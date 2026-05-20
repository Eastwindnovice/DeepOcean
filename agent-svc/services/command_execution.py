"""
Command Execution Service for DeepOcean AI Voice Agent.

This module provides functionality to execute system commands based on recognized intents.
"""

import os
import sys
import asyncio
import subprocess
from typing import Dict, Any, List, Optional

# Application name mapping for different platforms
APPLICATION_MAPPING = {
    "chrome": {
        "win32": "chrome",
        "darwin": "Google Chrome",
        "linux": "google-chrome"
    },
    "firefox": {
        "win32": "firefox",
        "darwin": "Firefox",
        "linux": "firefox"
    },
    "vscode": {
        "win32": "code",
        "darwin": "Visual Studio Code",
        "linux": "code"
    },
    "bilibili": {
        "win32": "https://www.bilibili.com",
        "darwin": "https://www.bilibili.com",
        "linux": "https://www.bilibili.com"
    },
    "wechat": {
        "win32": "WeChat",
        "darwin": "WeChat",
        "linux": "wechat"
    },
    "qq": {
        "win32": "QQ",
        "darwin": "QQ",
        "linux": "qq"
    }
}

# Allowed commands whitelist
ALLOWED_COMMANDS = {
    "open_application": ["start", "open", "xdg-open"],
    "close_application": ["taskkill", "killall", "pkill"],
    "search_web": ["start", "open", "xdg-open"]
}

# Dangerous patterns to block
DANGEROUS_PATTERNS = [
    "rm -rf",
    "rm -r",
    "del /f /s /q",
    "format",
    "mkfs",
    "dd if=",
    "chmod 777",
    "chown -R",
    "sudo",
    "su -",
    "/etc/",
    "/sys/",
    "/dev/",
    "&&",
    "||",
    ";",
    "`",
    "$(",
    "|",
    ">"
]


class CommandExecutionService:
    """Service for executing system commands."""

    def __init__(self):
        """Initialize the command execution service."""
        self.platform = sys.platform

    def _map_application_name(self, app_name: str, platform: str) -> str:
        """Map application name to platform-specific executable name."""
        app_lower = app_name.lower().strip()
        
        # Check if app is in mapping
        if app_lower in APPLICATION_MAPPING:
            platform_mapping = APPLICATION_MAPPING[app_lower]
            return platform_mapping.get(platform, platform_mapping.get("win32", app_name))
        
        # Return as-is if not in mapping
        return app_name

    def _validate_command(self, command_parts: List[str]) -> bool:
        """Validate command against security whitelist."""
        if not command_parts:
            return False
        
        command = command_parts[0].lower()
        
        # Check if command is in whitelist
        for allowed_cmd in ALLOWED_COMMANDS.values():
            if command in allowed_cmd:
                break
        else:
            return False
        
        # Check for dangerous patterns in command
        full_command = " ".join(command_parts)
        for pattern in DANGEROUS_PATTERNS:
            if pattern in full_command:
                return False
        
        return True

    def _get_platform_command(self, command_type: str, target: str, platform: str) -> List[str]:
        """Get platform-specific command for the operation."""
        if command_type == "open_application":
            app_name = self._map_application_name(target, platform)
            
            if platform == "win32":
                return ["start", "", app_name]
            elif platform == "darwin":
                return ["open", "-a", app_name]
            elif platform == "linux":
                return ["xdg-open", app_name]
            else:
                return ["start", app_name]
                
        elif command_type == "close_application":
            app_name = self._map_application_name(target, platform)
            
            if platform == "win32":
                return ["taskkill", "/f", "/im", f"{app_name}.exe"]
            elif platform == "darwin":
                return ["killall", app_name]
            elif platform == "linux":
                return ["pkill", "-f", app_name]
            else:
                return ["taskkill", "/f", "/im", f"{app_name}.exe"]
                
        elif command_type == "search_web":
            search_query = target
            if platform == "win32":
                return ["start", "", f"https://www.google.com/search?q={search_query}"]
            elif platform == "darwin":
                return ["open", f"https://www.google.com/search?q={search_query}"]
            elif platform == "linux":
                return ["xdg-open", f"https://www.google.com/search?q={search_query}"]
            else:
                return ["start", "", f"https://www.google.com/search?q={search_query}"]
        
        return []

    async def execute_command(self, command_type: str, target: str, platform: str) -> Dict[str, Any]:
        """Execute system command based on intent."""
        print(f"[DEBUG] 开始执行命令 - 类型: {command_type}, 目标: {target}, 平台: {platform}")
        
        # Validate inputs
        if command_type not in ALLOWED_COMMANDS:
            return {
                "success": False,
                "message": f"Invalid command type: {command_type}",
                "error": "Command type not allowed"
            }
        
        if not target:
            return {
                "success": False,
                "message": "Target cannot be empty",
                "error": "Missing target"
            }
        
        # Get platform-specific command
        command_parts = self._get_platform_command(command_type, target, platform)
        print(f"[DEBUG] 生成的命令: {command_parts}")
        
        # Validate command
        if not self._validate_command(command_parts):
            return {
                "success": False,
                "message": "Command validation failed",
                "error": "Command contains dangerous patterns"
            }
        
        try:
            # Execute command
            if platform == "win32":
                # Windows 使用 cmd /c 来执行命令
                command_str = " ".join(command_parts)
                print(f"[DEBUG] 执行 Windows 命令: {command_str}")
                
                # 使用 subprocess.Popen 在后台执行（非阻塞）
                import subprocess
                process = subprocess.Popen(
                    command_str,
                    shell=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
                )
                
                # 不等待进程完成，立即返回
                print(f"[DEBUG] 命令已启动，进程 ID: {process.pid}")
                return {
                    "success": True,
                    "message": f"Command started successfully"
                }
            else:
                print(f"[DEBUG] 执行命令: {' '.join(command_parts)}")
                process = await asyncio.create_subprocess_exec(
                    *command_parts,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                # Wait for completion (with timeout)
                try:
                    stdout, stderr = await asyncio.wait_for(
                        process.communicate(), 
                        timeout=5.0
                    )
                    print(f"[DEBUG] 命令执行完成 - 返回码: {process.returncode}")
                except asyncio.TimeoutError:
                    print(f"[DEBUG] 命令超时（正常，应用已启动）")
                    return {
                        "success": True,
                        "message": f"Command started successfully"
                    }
                
                if process.returncode == 0 or process.returncode is None:
                    return {
                        "success": True,
                        "message": f"Successfully executed command"
                    }
                else:
                    error_msg = stderr.decode() if stderr else "Unknown error"
                    print(f"[ERROR] 命令执行失败: {error_msg}")
                    return {
                        "success": False,
                        "message": f"Command failed with exit code {process.returncode}",
                        "error": error_msg
                    }
                
        except FileNotFoundError as e:
            print(f"[ERROR] 文件未找到: {e}")
            return {
                "success": False,
                "message": f"Application not found: {target}",
                "error": f"Application '{target}' is not installed or not in PATH"
            }
        except Exception as e:
            print(f"[ERROR] 执行命令时出错: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "message": f"Failed to execute command: {str(e)}",
                "error": str(e)
            }


__all__ = ["CommandExecutionService"]
