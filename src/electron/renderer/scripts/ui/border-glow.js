class BorderGlow {
  constructor() {
    this.canvas = document.getElementById('border-glow-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.isActive = false;
    this.animationId = null;
    this.offset = 0;
    this.colorPhase = 0; // 颜色变换相位
    
    // 从 DeepOcean Logo 图片中精确提取的颜色（过滤掉深色背景）
    this.colorPalette = [
      { r:   4, g:  61, b: 139 }, // #043d8b - 深海蓝
      { r:   5, g:  82, b: 174 }, // #0552ae - 中蓝
      { r:   6, g: 113, b: 208 }, // #0671d0 - 亮蓝
      { r:  19, g: 160, b: 235 }, // #13a0eb - 天蓝
      { r:  67, g: 203, b: 242 }, // #43cbf2 - 亮青
      { r: 153, g: 227, b: 243 }, // #99e3f3 - 淡青
      { r:  73, g: 126, b: 181 }, // #497eb5 - 中蓝灰
      { r:  67, g:  66, b: 133 }, // #434285 - 深紫蓝
      { r: 161, g: 104, b: 140 }, // #a1688c - 紫粉
      { r: 139, g: 167, b: 195 }  // #8ba7c3 - 淡蓝灰
    ];
    
    this.borderWidth = 12;
    this.glowSize = 60;
    this.cornerRadius = 60; // 从 30 增加到 60，圆角更明显
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  
  start() {
    if (this.isActive) return;
    this.isActive = true;
    this.animate();
  }
  
  stop() {
    this.isActive = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.clear();
  }
  
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  animate() {
    if (!this.isActive) return;
    
    this.clear();
    // 去掉 offset 的增加，让边框静止
    // this.offset += 2;
    this.colorPhase += 0.0003; // 进一步减慢颜色变化速度，从 0.001 减慢到 0.0003
    
    // 绘制四边边框光影（带圆角）
    this.drawBorderWithRoundedCorners();
    
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  
  // 获取当前颜色（基于相位的颜色插值）
  getCurrentColor(position) {
    const paletteLength = this.colorPalette.length;
    const colorIndex = (position + this.colorPhase * 100) % paletteLength;
    const index1 = Math.floor(colorIndex);
    const index2 = (index1 + 1) % paletteLength;
    const blend = colorIndex - index1;
    
    // 使用缓动函数让颜色过渡更平滑（ease-in-out）
    const smoothBlend = blend < 0.5 
      ? 2 * blend * blend 
      : 1 - Math.pow(-2 * blend + 2, 2) / 2;
    
    const color1 = this.colorPalette[index1];
    const color2 = this.colorPalette[index2];
    
    return {
      r: Math.round(color1.r + (color2.r - color1.r) * smoothBlend),
      g: Math.round(color1.g + (color2.g - color1.g) * smoothBlend),
      b: Math.round(color1.b + (color2.b - color1.b) * smoothBlend)
    };
  }
  
  drawBorderWithRoundedCorners() {
    const { width, height } = this.canvas;
    const radius = this.cornerRadius;
    
    // 使用 Path2D 绘制连续的圆角矩形路径
    const path = new Path2D();
    
    // 从左上角开始，顺时针绘制圆角矩形
    path.moveTo(radius, 0);
    path.lineTo(width - radius, 0); // 顶边
    path.arcTo(width, 0, width, radius, radius); // 右上圆角
    path.lineTo(width, height - radius); // 右边
    path.arcTo(width, height, width - radius, height, radius); // 右下圆角
    path.lineTo(radius, height); // 底边
    path.arcTo(0, height, 0, height - radius, radius); // 左下圆角
    path.lineTo(0, radius); // 左边
    path.arcTo(0, 0, radius, 0, radius); // 左上圆角
    path.closePath();
    
    // 获取当前颜色
    const color = this.getCurrentColor(0);
    
    // 增强颜色亮度（让颜色更鲜艳）
    const enhancedColor = {
      r: Math.min(255, Math.round(color.r * 1.3)),
      g: Math.min(255, Math.round(color.g * 1.3)),
      b: Math.min(255, Math.round(color.b * 1.3))
    };
    
    // 设置线条样式 - 使用连续的线条而不是圆形重叠
    this.ctx.strokeStyle = `rgba(${enhancedColor.r}, ${enhancedColor.g}, ${enhancedColor.b}, 0.4)`; // 降低不透明度从 0.8 到 0.4
    this.ctx.lineWidth = this.borderWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    // 添加外发光效果（使用 shadow 而不是多个圆形）
    this.ctx.shadowColor = `rgba(${enhancedColor.r}, ${enhancedColor.g}, ${enhancedColor.b}, 0.3)`; // 降低阴影不透明度
    this.ctx.shadowBlur = this.glowSize;
    
    // 绘制路径
    this.ctx.stroke(path);
    
    // 重置阴影避免影响其他绘制
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
  }
}

// 导出实例
window.borderGlow = new BorderGlow();
