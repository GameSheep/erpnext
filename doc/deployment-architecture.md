# ERPNext 项目与部署架构说明

本文档基于当前仓库的 develop 分支整理，包含项目概览、技术栈、启动方式、数据位置、资源需求，以及“香港入口服务器 + 美国应用服务器”的部署方案。

> 当前仓库是 ERPNext 17.0.0-dev 开发版本，不建议直接作为长期生产版本。正式部署时应固定到匹配的稳定 Frappe/ERPNext 发布分支或版本。

## 1. 项目概览

ERPNext 是一个开源企业资源计划（ERP）系统。当前仓库主要是 ERPNext 业务应用，运行在 Frappe Framework 之上，不是一个可以直接执行 python main.py 的独立服务。

主要业务模块包括：

- 财务会计：总账、应收应付、资产、成本中心
- 销售和采购：客户、供应商、报价、订单、发票
- 库存：物料、仓库、批次、序列号、库存估值
- 制造：BOM、生产计划、工单、工作站
- 项目：项目、任务、工时
- CRM、客服、质量管理、维护、分包、EDI、电话等

Frappe Framework 负责提供：

- DocType 数据模型和 ORM
- 用户、角色、权限和认证
- Desk 管理界面
- REST/RPC API
- 后台任务队列
- 定时任务和实时通知
- 文件附件、打印和报表能力

参考：

- [项目 README](../README.md)
- [ERPNext 版本](../erpnext/__init__.py)
- [业务模块清单](../erpnext/modules.txt)

## 2. 技术栈

| 层次 | 技术 |
| --- | --- |
| 应用框架 | Frappe Framework |
| 后端 | Python、Frappe ORM、DocType、REST/RPC API |
| 管理前端 | Frappe Desk JavaScript |
| Banking 前端 | React、TypeScript、Vite、Tailwind |
| 数据库 | 默认 MariaDB；代码包含 PostgreSQL 兼容逻辑 |
| 缓存和队列 | Redis |
| 运行和部署 | Frappe Bench、Docker Compose、Nginx |
| 页面和打印 | Jinja、HTML、JavaScript |

当前项目要求：

- Python >= 3.14
- Frappe >= 17.0.0-dev, < 18.0.0
- Node/Yarn 用于构建前端资源

版本和 Bench 依赖见 [pyproject.toml](../pyproject.toml)。Banking 是一个前端子项目，但生产环境会把它构建成 ERPNext 静态资源，不需要单独运行一台前端服务器，详见 [banking/package.json](../banking/package.json)。

## 3. 本地开发启动

### 3.1 推荐环境

Windows 下建议使用 WSL2 Ubuntu 或 Docker。Frappe 的原生安装主要面向 Linux/macOS，当前开发分支还要求 Python 3.14。

以下命令假设 Bench、MariaDB、Redis、Node.js 和 Yarn 已经安装完成：

~~~bash
cd ~
bench init --frappe-branch develop frappe-bench

cd ~/frappe-bench
bench get-app https://github.com/GameSheep/erpnext.git --branch develop

bench new-site erpnext.localhost
bench --site erpnext.localhost install-app erpnext
bench use erpnext.localhost

bench start
~~~

访问：

~~~text
http://erpnext.localhost:8000/app
~~~

bench start 适合开发环境。生产环境应使用 Docker Compose，或使用 Bench 生成的 Nginx/Supervisor 配置。

### 3.2 Docker 快速体验

项目 README 推荐使用官方 frappe_docker：

~~~bash
git clone https://github.com/frappe/frappe_docker
cd frappe_docker
docker compose -f pwd.yml up -d
~~~

该方式适合快速体验，不会自动使用当前 GameSheep/erpnext fork，也不适合作为正式生产配置。使用当前 fork 做开发或生产镜像时，需要在 Frappe Docker 中构建自定义应用镜像。

## 4. 运行时服务

ERPNext 不是只有一个“前端”和一个“后端”，运行时通常包含以下服务：

| 服务 | 作用 |
| --- | --- |
| Nginx/Frontend | HTTPS、静态文件、反向代理 |
| Frappe Backend | 页面、API 和业务逻辑 |
| MariaDB | 业务数据和 DocType 数据 |
| Redis | 缓存、队列和实时通信 |
| Queue Worker | 执行报表、库存重算、批量任务 |
| Scheduler | 执行定时任务 |
| WebSocket/Socket.IO | 实时通知和进度更新 |

官方 Docker 配置通常会拆成 frontend、backend、websocket、queue-short、queue-long、scheduler、db、redis-cache 和 redis-queue 等容器。它们可以运行在同一台机器上，也可以按需要拆分到多台机器。

## 5. 推荐的两服务器部署

当前可用的服务器：

- 香港 CN2：4 GB 内存
- 美国：8 GB 内存

推荐部署方式：

~~~mermaid
flowchart LR
    U["用户浏览器"] --> HK["香港服务器<br/>Nginx / HTTPS / 反向代理"]
    HK --> US["美国服务器<br/>Frappe Backend"]
    US --> DB[("MariaDB")]
    US --> R[("Redis")]
    US --> W["Queue Worker / Scheduler"]
    HK -. "WebSocket 反向代理" .-> WS["Socket.IO"]
    US --> WS
~~~

### 5.1 香港服务器：入口和网页网关

只运行：

- Nginx 或 Traefik
- HTTPS 证书
- 到美国 Backend 的反向代理
- 可选的静态资源缓存

香港服务器不运行 MariaDB、Redis 或后台 Worker。4 GB 内存用于入口网关已经足够。

公网只开放：

~~~text
80/tcp
443/tcp
~~~

### 5.2 美国服务器：完整 ERPNext

运行：

- Frappe Backend
- WebSocket
- MariaDB
- Redis
- Scheduler
- Queue Worker
- ERPNext 代码、站点配置和附件

美国服务器只允许香港服务器或 VPN 网段访问 Backend 和 WebSocket 端口。MariaDB 和 Redis 不应暴露到公网。

### 5.3 端口建议

| 端口 | 服务 | 建议访问范围 |
| --- | --- | --- |
| 80/443 | 香港 Nginx | 公网 |
| 8000 | Frappe Backend | 仅香港服务器/VPN |
| 9000 | WebSocket | 仅香港服务器/VPN |
| 3306 | MariaDB | 仅美国本机或美国内部 |
| 6379 | Redis | 仅美国本机或美国内部 |

香港 Nginx 需要同时代理普通 HTTP 请求和 WebSocket 请求。WebSocket 代理必须支持 HTTP/1.1 的 Upgrade 和 Connection 请求头。

## 6. 香港到美国的网络考虑

香港 CN2 通常有利于中国大陆用户访问香港入口，但不能保证“香港到美国”一定比“中国大陆到美国”更快。最终体验取决于：

- 美国服务器所在地区
- 香港和美国两家云厂商的互联线路
- 高峰期拥塞和丢包
- 动态请求需要经过香港到美国的额外一跳

建议使用内网互联或 WireGuard VPN，避免把数据库和 Redis 暴露在公网。

在香港服务器测试到美国服务器：

~~~bash
mtr -rwzc 100 美国服务器IP
ping -c 100 美国服务器IP
~~~

如果需要测试实际吞吐，可以临时使用 iperf3，并限制防火墙只允许香港服务器访问测试端口。

经验判断：

- 丢包接近 0%、延迟 150 ms 内：较好
- 延迟 150–220 ms：可以使用，但动态页面会有延迟感
- 丢包超过 1% 或延迟抖动明显：不建议作为主要链路

## 7. 数据存储位置

源码目录不保存业务数据。Bench 典型目录如下：

~~~text
frappe-bench/
├── apps/
│   └── erpnext/                     # 应用源码
├── sites/
│   ├── common_site_config.json      # 全局配置
│   └── erpnext.example.com/
│       ├── site_config.json         # 站点配置
│       ├── public/files/            # 公开附件
│       ├── private/files/           # 私有附件
│       └── private/backups/         # 站点备份
└── logs/                            # 运行日志
~~~

数据分类：

- 业务单据、用户、权限和 DocType 数据：MariaDB
- 公开附件：sites/<site>/public/files
- 私有附件：sites/<site>/private/files
- 站点配置和加密密钥：sites/<site>/site_config.json
- 缓存和队列：Redis
- 数据库备份：sites/<site>/private/backups

数据库、附件和站点配置都需要备份。备份不应只放在美国应用服务器上，建议复制到第三个存储位置。

## 8. 内存和资源建议

### 香港 4 GB

适合运行：

- Nginx
- HTTPS
- 反向代理
- 少量缓存

不建议在香港服务器运行数据库或后台任务。

### 美国 8 GB

适合小型生产环境，将以下服务放在同一台机器：

- Frappe Backend
- MariaDB
- Redis
- WebSocket
- 1 个 Queue Worker
- 1 个 Scheduler

建议保留 1–2 GB 内存余量，并配置 2–4 GB swap。用户量增加或频繁执行库存重算、制造计划和大型报表时，再把 Worker 拆到第三台服务器。

源码模块数量不会直接对应相同数量的常驻进程。真正影响内存的是 Backend Worker、Queue Worker、MariaDB 缓存和实际运行的后台任务。

当前 ERPNext 中较重的后台任务主要包括：

- 库存估值重算
- BOM 成本更新
- 生产计划
- 批量交易和批量付款
- 银行对账
- 大型财务报表
- 折旧和账务维护

这些调度任务配置在 [erpnext/hooks.py](../erpnext/hooks.py)。

## 9. 生产部署注意事项

1. 当前仓库是 develop 开发版本，正式环境应固定到稳定版本。
2. 香港只做公网入口，美国服务器保存业务数据。
3. MariaDB、Redis、Backend 端口不直接暴露公网。
4. 所有 Backend、Worker、Scheduler 必须使用匹配的 Frappe/ERPNext 代码版本。
5. Backend 和 Worker 必须共享同一套站点配置和附件存储。
6. WebSocket 反向代理必须正确转发升级请求。
7. 数据库、附件、site_config.json 和加密密钥都需要纳入备份。
8. 部署完成后用 free -h、docker stats 或 supervisorctl status 观察实际资源占用。

## 10. 官方参考

- [ERPNext 项目 README](../README.md)
- [Frappe Framework 安装文档](https://docs.frappe.io/framework/user/en/installation)
- [Frappe Framework 架构](https://docs.frappe.io/framework/user/en/basics/architecture)
- [Frappe 后台服务](https://docs.frappe.io/framework/user/en/bench/resources/background-services)
- [Frappe 生产部署](https://docs.frappe.io/framework/user/en/production-setup)
- [Frappe Docker 服务架构](https://github.com/frappe/frappe_docker/blob/main/docs/getting-started.md)
