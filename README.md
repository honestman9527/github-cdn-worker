# Universal GitHub CDN Worker

这是一个部署在 Cloudflare Workers 上的高性能、通用型 GitHub 内容加速代理。它可以安全地访问并缓存您任何公共或私有仓库中的文件，为您提供一个稳定、高速的私有 CDN 服务。

## ✨ 核心功能

- **通用代理**：通过 URL 动态指定要访问的仓库，无需修改代码即可支持任意数量的项目。
- **性能卓越**：直接代理 GitHub 的原始文件 (`raw.githubusercontent.com`)，无不必要的编解码开销。
- **安全可靠**：支持多种 Token 认证方式，并以安全为先，推荐使用 HTTP 请求头传递密钥。
- **高度可配置**：通过环境变量灵活配置缓存时间、Token 等参数。
- **边缘缓存**：利用 Cloudflare 的全球网络缓存您的文件，为全球用户提供极速访问体验。
- **用户友好**：提供清晰的根路径引导页面和友好的错误提示。

## 🚀 使用方法

部署成功后，您的 Worker 会获得一个唯一的 URL，例如 `https://my-cdn.username.workers.dev`。

要通过此 Worker 访问您 GitHub 仓库中的文件，请使用以下格式的 URL：

```
https://<Your-Worker-URL>/<仓库所有者>/<仓库名>/<分支名>/<文件路径>
```

**示例**：
访问用户 `some-user` 的 `my-images` 仓库 `main` 分支下的 `avatars/cat.png` 文件：
```
https://my-cdn.username.workers.dev/some-user/my-images/main/avatars/cat.png
```

## 🔒 访问私有仓库

要访问私有仓库，您必须提供一个具有相应权限的 GitHub 个人访问令牌。脚本支持以下三种方式获取 Token（按推荐顺序排列）：

1.  **HTTP 请求头 (最推荐)**: 在您的客户端请求中添加 `X-GitHub-Token` 请求头。
    ```
    X-GitHub-Token: ghp_YourGitHubTokenHere
    ```

2.  **Worker 环境变量 (推荐)**: 在 Cloudflare Worker 的设置中配置一个名为 `GITHUB_TOKEN` 的 Secret 变量。这是最简单的全局配置方式。

3.  **URL 查询参数 (不推荐，需手动开启)**: 在 URL 末尾附加 `?token=ghp_YourToken`。
    -   **安全警告**：这种方式可能导致您的 Token 泄露在服务器日志、浏览器历史记录中。
    -   要启用此功能，您必须在 Worker 的环境变量中添加一个名为 `ALLOW_QUERY_PARAM_TOKEN` 的变量，并将其值设为 `true`。

## 部署与配置

1.  **创建 Worker**:
    -   登录 Cloudflare 控制台，进入 **Workers & Pages**。
    -   创建一个新的 Worker 服务。

2.  **部署代码**:
    -   点击 **Edit code**，将本项目中的 `cdn-worker.js` 文件内容完整地粘贴到编辑器中。
    -   点击 **Save and deploy**。

3.  **配置环境变量**:
    -   进入 Worker 的 **Settings** -> **Variables** 页面。
    -   根据您的需求配置以下环境变量：

    | 变量名 | 是否必须 | 描述 |
    | :--- | :---: | :--- |
    | `GITHUB_TOKEN` | **是** | 您的 GitHub 个人访问令牌。建议加密 (Encrypt)。 |
    | `ALLOW_QUERY_PARAM_TOKEN` | 否 | 设为 `true` 以允许通过 URL 参数传递 Token。 |
    | `CACHE_TIME` | 否 | 自定义缓存时间（秒），默认为 `86400` (一天)。 |

## 🤝 结合图床应用

您可以将拼接好的、符合此 Worker 格式的 URL 手动用于博客或文档中，也可以在支持高级自定义链接格式的图床工具中进行配置。 