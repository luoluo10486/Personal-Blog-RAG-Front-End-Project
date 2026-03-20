# remand.md（前端）

## 当前目标

- 维护前端登录/注册页面
- 与 member-backend 的认证接口保持一致

## 约定

- 登录注册页面组件：`src/views/LoginView.vue`
- 基础接口前缀通过 `VITE_API_BASE_URL` 控制
- 文案默认中文

## 常用命令

```bash
npm run dev
npm run build
```

## 联调检查项

1. `/login` 与 `/register` 页面切换正常
2. 发送验证码倒计时正常
3. 登录成功后 token 可写入本地存储（若后端返回）
