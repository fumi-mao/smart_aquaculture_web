# 第一阶段：构建 (Build Stage)
# 升级到 Node 20，因为 Vite 7 需要 Node 20+
FROM node:20-alpine AS builder

WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装所有依赖
RUN npm install

# 复制源代码
COPY . .

# 构建项目 (生成 dist 目录)
# 显式设置 NODE_ENV=production 以确保 Tailwind 优化生效
# 去掉了 --force，因为新容器环境本来就是干净的
RUN NODE_ENV=production npm run build

# 第二阶段：生产环境 (Production Stage)
FROM nginx:stable-alpine

# 复制构建产物到 Nginx 默认目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制自定义 Nginx 配置
COPY nginx-docker.conf /etc/nginx/conf.d/default.conf

# 修复权限问题
RUN chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /usr/share/nginx/html

# 暴露 80 端口
EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
