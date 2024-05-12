# 使用官方 Nginx 镜像作为基础镜像
FROM nginx:alpine

# 将 dist 目录中的文件复制到容器的 Nginx 服务目录中
COPY ./dist /usr/share/nginx/html

# 将 Nginx 配置文件复制到容器的 Nginx 服务目录中  
COPY ./nginx.conf /etc/nginx/nginx.conf
# 暴露 80 端口
EXPOSE 80

# 启动 Nginx 服务
CMD ["nginx", "-g", "daemon off;"]

# 为 Nginx 配置文件添加执行权限
RUN chmod +x /etc/nginx/nginx.conf

# 使用 Nginx 作为静态文件服务器
CMD ["nginx", "-g", "daemon off;"]

# 使用默认的 Nginx 配置
# 如需自定义配置，可添加 COPY 指令复制配置文件到 /etc/nginx/nginx.conf
