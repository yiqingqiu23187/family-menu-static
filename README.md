# 🍊 橘橘大王的御膳房

完全静态的家庭点菜网页。没有安装步骤、构建依赖、数据库或自建后端。

[打开橘橘大王的御膳房](https://yiqingqiu23187.github.io/family-menu-static/)

## 怎么用

1. 在主厨手机上打开 [Server酱 Turbo](https://sct.ftqq.com/)，绑定微信接收通道并取得 SCT 开头的 SendKey。
2. 在**点菜的那台手机**打开本网站，点击右上角「设置微信通知」，粘贴 SendKey 并保存。
3. 选择菜品、数量、午餐或晚餐，填写备注后点击「发给主厨」。
4. 页面显示「推送请求已受理」后，请主厨检查微信。它表示 Server酱接收了请求，不代表微信已送达。

SendKey 只保存在该网站域名下的当前浏览器 localStorage 中。不会被写入项目文件或 GitHub。换手机、换浏览器、换域名或清理浏览器数据后，需要重新填写。不要把 SendKey 提交到仓库。消息发送时，菜品、备注及 SendKey 会通过 HTTPS 发给 Server酱。

没有配置密钥时，也可以点击「复制菜单」后自行通过微信发送。网络超时或发送结果未知时，请先确认微信有没有收到，再决定是否手动重试；页面不会自动重发。同一份已受理的菜单禁止重复提交，改动菜品或备注后视为新订单。

免费额度和微信通道规则以 [Server酱官方说明](https://sct.ftqq.com/docs/getting-started/channels/) 为准。2026-10-23 查询时免费版每天最多 5 次请求。失败请求也可能计入额度。

## 修改菜单

修改 `menu.js` 中的 `categories` 和 `dishes`。照片放进 `images/`，使用相对路径；照片可选，未配照片的菜使用文字封面。每道菜有唯一 `id`，以后修改名称时尽量保留这个 ID。当前菜单包含 19 道菜，按牛肉、鸡肉排骨、海鲜、小炒时蔬分类，可随时增删。两种土豆炖牛肉分别选购。

## GitHub Pages 发布

将本目录所有文件放在一个 GitHub 仓库的根目录，在 Settings → Pages 中选择 Deploy from a branch，分支 `main`、目录 `/(root)`。本项目包含 `.nojekyll`，不需要构建命令。页面及菜单公开可访问。

本地查看可直接打开 `index.html`；更接近线上环境的预览方式是：

```sh
python3 -m http.server 8765
```

然后打开 `http://localhost:8765`。本地预览和线上网址的浏览器设置互相独立。

## 实现与边界

- 原生 HTML、CSS、JavaScript，所有页面资源随项目提供，无第三方运行时脚本或字体。
- 购物车、备注和当前发送状态只保存在本浏览器，不作为共享订单数据库。
- 通过 HTTPS、CORS、POST 调用 Server酱；不使用不透明的 `no-cors` 请求冒充成功。
- 一次最多 9 份同名菜品；支持网络异常提示、订单号、重复点击保护和复制菜单备用。
- HTTP 接口支持及错误分支已验证；用户已于 2026-10-23 实测确认微信能收到通知。

## 图片来源

起始菜品照片取自 [vinsonhi/family-food-menu](https://github.com/vinsonhi/family-food-menu) 的 `miniprogram/images/smaller/`（提交 `d2e572a`）。原仓库声明仅供学习使用、未经允许不得商用。此页面用于个人家庭使用；图片不纳入任何额外开源授权。用于其他场景时请换成自己的照片或取得相应授权。
