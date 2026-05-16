// 主入口脚本

// 监听来自主进程的切换事件
window.electronAPI.onToggleAssistant(() => {
  // 切换面板的显示/隐藏状态
  if (window.overlayPanel.isVisible) {
    window.overlayPanel.hide();
  } else {
    window.overlayPanel.show();
  }
});

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('DeepOcean UI initialized');
  
  // 开发模式：自动演示（可选）
  // 取消注释下面的代码可以看到自动演示效果
  // setTimeout(() => {
  //   window.animationEngine.demoStateTransition();
  // }, 1000);
});

// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

// 防止默认的拖拽行为
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());
