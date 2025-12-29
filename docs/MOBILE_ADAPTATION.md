# Hapi 移动端适配指南

本文档介绍了 Hapi 项目的移动端适配工作，以及如何进一步优化移动体验。

## 当前状态

Hapi 项目作为 [Happy](https://github.com/slopus/happy) 的精简 Web 版本，原本缺少一些重要的移动端优化。现在已经实现了以下移动端适配：

### ✅ 已完成的优化

#### 1. 响应式布局系统
- **Tailwind 响应式断点配置** (`web/tailwind.config.ts`)
  - `xs: 320px` - 超小屏幕手机
  - `sm: 640px` - 小屏幕手机
  - `md: 768px` - 平板设备
  - `lg: 1024px` - 桌面设备
  - `xl: 1280px` - 大屏幕桌面
  - `2xl: 1536px` - 超大屏幕

- **安全区域支持**
  - 添加了 `safe-top`, `safe-bottom`, `safe-left`, `safe-right` 间距工具类
  - 正确处理 iPhone 刘海屏和底部手势条区域

- **最大宽度控制**
  - `max-w-content: 720px` - 标准内容宽度
  - `max-w-content-narrow: 500px` - 窄版内容
  - `max-w-content-wide: 1200px` - 宽版内容

#### 2. 触摸友好的交互
- **最小触摸目标尺寸** (`min-h-[44px]`, `min-w-[44px]`)
  - 符合 iOS Human Interface Guidelines 的 44pt 最小触摸尺寸
  - 所有按钮和可交互元素都满足这个标准
  
- **触摸反馈**
  - 为触摸设备添加 `active:` 状态样式
  - 移除了桌面端的 hover 效果在移动端的干扰

- **改进的组件**
  - `SessionList` - 会话列表项增大到 88px 高度
  - `SessionHeader` - 返回按钮和操作按钮都是 44px×44px
  - `ComposerButtons` - 所有按钮增大到 44px×44px
  - `Button` 组件 - 默认最小高度 44px

#### 3. 移动端排版优化
- **字体渲染**
  - 添加 `-webkit-font-smoothing: antialiased` 改善字体渲染
  - `-moz-osx-font-smoothing: grayscale` 用于 Firefox
  
- **字体大小**
  - 基础字体：`max(14px, 1rem)` 确保移动端可读性
  - 会话标题：`text-base` (16px) 在移动端，`sm:text-lg` 在大屏幕
  - 会话路径：`text-sm` (14px) 改善可读性
  
- **行高优化**
  - `leading-snug` - 紧凑行高用于标题
  - `leading-relaxed` - 宽松行高用于正文

- **代码块优化**
  - 移动端字体大小：`0.7rem`
  - 桌面端字体大小：`0.75rem`
  - 添加横向滚动和触摸滚动支持

#### 4. 对话框和模态框
- **响应式尺寸**
  - 移动端：`w-[calc(100vw-24px)]` 留出 24px 边距
  - 桌面端：`max-w-lg` 限制最大宽度
  
- **滚动支持**
  - `max-h-[85vh]` 限制最大高度
  - `overflow-y-auto` 支持内容滚动

- **间距调整**
  - 移动端：`p-4` 
  - 桌面端：`sm:p-6`

#### 5. CSS 改进
- **触摸目标自动调整**
  ```css
  @media (hover: none) and (pointer: coarse) {
      button, a, [role="button"] {
          min-height: 44px;
          min-width: 44px;
      }
  }
  ```

- **Markdown 内容优化**
  - 添加 `word-break: break-word` 防止长文本溢出
  - 表格支持横向滚动
  - 代码块支持触摸滚动

## 从哪里入手继续优化

### 🔧 推荐的下一步优化

#### 1. 虚拟键盘处理
当前 Hapi 使用了基础的 viewport 配置，但可以进一步优化：

**文件位置**: `web/index.html`

```html
<!-- 当前配置 -->
<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content" />
```

**可以改进的地方**:
- 添加键盘弹出时的输入框自动滚动
- 优化 `env(keyboard-inset-height)` 的使用（如果需要）

#### 2. 下拉刷新功能
**参考 Happy 项目的实现**:
- Happy 使用 React Native 的下拉刷新组件
- Web 版可以使用 [react-pull-to-refresh](https://www.npmjs.com/package/react-pull-to-refresh) 或自定义实现

**建议实现位置**: `web/src/components/SessionList.tsx` 和 `web/src/components/AssistantChat/HappyThread.tsx`

#### 3. 滑动手势
**可以添加的手势**:
- 左滑删除会话
- 右滑返回上一页
- 上滑查看更多消息

**推荐库**: 
- [react-swipeable](https://www.npmjs.com/package/react-swipeable)
- 或使用原生 `TouchEvent` API

#### 4. PWA 优化
当前已有基础 PWA 支持，可以进一步优化：

**文件位置**: `web/index.html` 和 `web/public/manifest.json`

**可以改进**:
- 优化离线体验
- 添加更多屏幕尺寸的启动画面
- 改善安装提示体验

#### 5. 性能优化
- **虚拟滚动**: 对于长列表（如会话列表、消息列表）实现虚拟滚动
- **图片懒加载**: 如果添加图片支持
- **代码分割**: 优化初始加载时间

## 技术参考

### Happy 项目的移动适配策略

Happy 项目使用 React Native + Expo，提供了以下移动特性：

1. **React Native Unistyles** - 响应式样式系统
   - 断点定义: `xs: 0, sm: 300, md: 500, lg: 800, xl: 1200`
   
2. **设备检测工具**
   ```typescript
   // sources/utils/responsive.ts
   - useDeviceType() - 检测手机/平板
   - useIsTablet() - 是否为平板
   - useIsLandscape() - 是否横屏
   - useHeaderHeight() - 动态计算标题栏高度
   ```

3. **布局约束**
   ```typescript
   // sources/components/layout.ts
   maxWidth: 720 // 类似 Hapi 的 max-w-content
   ```

4. **触摸优化**
   - 所有列表项最小高度 88pt
   - 按钮最小尺寸 44pt×44pt
   - 使用 React Native 的触摸反馈组件

### Hapi Web 版的适配策略

作为 Web 应用，Hapi 采用不同但等效的方案：

1. **Tailwind CSS 响应式系统**替代 Unistyles
2. **CSS 媒体查询**替代设备类型检测
3. **CSS 变量和 Telegram Mini App 主题**实现主题系统
4. **标准 Web 触摸事件**处理交互

## 测试移动体验

### 浏览器开发工具
1. Chrome DevTools - 设备模拟器
   - 快捷键: `Ctrl+Shift+M` / `Cmd+Shift+M`
   - 可以模拟各种移动设备
   
2. Firefox 响应式设计模式
   - 快捷键: `Ctrl+Shift+M` / `Cmd+Alt+M`

### 真机测试
1. **在移动设备上访问开发服务器**
   ```bash
   # 确保服务器监听在 0.0.0.0
   cd web && bun run dev -- --host 0.0.0.0
   
   # 然后在手机浏览器访问
   http://你的电脑IP:5173
   ```

2. **使用 Telegram Mini App 测试**
   - 设置 `WEBAPP_URL` 为公网可访问的 URL
   - 在 Telegram 中打开 Mini App

3. **PWA 安装测试**
   - 在移动浏览器中访问应用
   - 测试"添加到主屏幕"功能

## 常见问题

### Q: 为什么不直接移植 Happy 的代码？
A: Happy 使用 React Native，而 Hapi Web 版使用标准 React + Web 技术。代码无法直接移植，但可以借鉴设计思路和交互模式。

### Q: 如何调试移动端特有的问题？
A: 
1. 使用浏览器的远程调试功能
2. 在代码中添加 console.log 并在真机上查看
3. 使用 Eruda 等移动端调试工具

### Q: 触摸目标为什么要 44px？
A: 这是 Apple 的 Human Interface Guidelines 推荐的最小触摸目标尺寸，能够确保用户在移动设备上准确点击。Android Material Design 推荐 48dp，我们选择了 44px 作为通用标准。

## 相关文件

### 核心配置文件
- `web/tailwind.config.ts` - Tailwind 响应式配置
- `web/index.html` - viewport 和 PWA meta 标签
- `web/src/index.css` - 全局移动端样式

### 需要注意的组件
- `web/src/components/SessionList.tsx` - 会话列表
- `web/src/components/SessionHeader.tsx` - 会话头部
- `web/src/components/AssistantChat/ComposerButtons.tsx` - 聊天输入按钮
- `web/src/components/ui/button.tsx` - 通用按钮组件
- `web/src/components/ui/dialog.tsx` - 对话框组件
- `web/src/router.tsx` - 路由和页面布局

## 贡献指南

如果你想进一步优化移动体验：

1. **保持一致性**：确保所有交互元素都满足 44px 最小触摸目标
2. **测试多设备**：在不同尺寸的设备上测试
3. **性能优先**：移动设备性能有限，注意优化性能
4. **渐进增强**：确保基础功能在所有设备上都能工作
5. **遵循标准**：参考 iOS HIG 和 Material Design 指南

## 参考资源

- [iOS Human Interface Guidelines - Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Material Design - Touch targets](https://m3.material.io/foundations/interaction/states/applying-states#0e7583f7-2e62-4a59-b79d-7632f5ce0e5e)
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [PWA Design Patterns](https://web.dev/patterns/)
