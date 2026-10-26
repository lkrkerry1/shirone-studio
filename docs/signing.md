# 签名安装包

Windows 上的"签名"指 **Authenticode**：用代码签名证书给 `.exe` / `.msi` 生成数字签名。签名后
Windows 能验证发布者、签名后文件被改动会失效，SmartScreen 的"未知发布者"提示也会随证书信誉
逐步消失。

Tauri 在 `tauri build` 时会自动签名应用 exe 和生成的安装包，只要 `tauri.conf.json` 里配好
`bundle.windows`。没有证书时构建照常进行，产物就是未签名的（当前 v0.1.0 就是这样）。

## 先选路线

签名没有"最好"，只有"匹配你的分发方式"。先回答三个问题：

1. **谁在下载？** 只有自己和朋友 → 可以不签；公开给陌生人 → 值得签；企业客户 → 必须签。
2. **谁来做签名？** 自己的电脑（插 token）→ 本机证书；GitHub Actions 自动发布 → 必须能"云端签"。
3. **证书上显示谁？** 开源免费项目 → 赞助方证书（显示 SignPath Foundation 等）；想要自己的名字 →
   自购 OV/EV 或 Azure Trusted Signing。

对照表：

| 方案 | 费用 | CI 自动签名 | 签名显示 | 适合 |
| --- | --- | --- | --- | --- |
| 不签 | 0 | — | 无（"未知发布者"） | 自用、早期项目 |
| 开源赞助计划（SignPath Foundation、Certum Open Source） | 0 | 可以（SignPath 有 GitHub Action） | 赞助方 / 项目名 | **公开的开源项目，首选** |
| Azure Trusted Signing | 约 $10/月起 | 原生支持（值得分签名次数） | 你自己（需通过身份验证） | 有 Azure 订阅、能过核验的个人/组织 |
| 自购 OV 证书 | 约 $200–400/年 | 需云 HSM / 云签名服务，USB token 不行 | 你自己 / 公司 | 持续分发、想掌控证书 |
| EV 证书 | 更贵（约 $300–600/年） | 同上，且多用硬件 token | 你自己 / 公司 | 面向大量用户的商业软件 |
| 自签证书 | 0 | 可以 | 自定义（对方不信任） | 只在本地测试 |

几个容易踩的认知：

- **OV/EV 证书从 2023 年 6 月起不能是裸 pfx**：私钥必须放在 FIPS 140-2 Level 2 的硬件里
  （USB token 或云 HSM）。所以"买 pfx 丢进 CI"这条路对新证书已经不存在，要么云端签，要么
  把 token 插在构建机上。
- **EV 不等于立刻没有 SmartScreen 提示**：EV 只是更容易积累信誉，微软现在的口径是信誉看下载量
  与时间，不看证书等级。
- **签名 ≠ 不会被报毒**：杀毒误报和 SmartScreen 是两套机制，签名只解决"发布者是谁"。

## 1. 先拿到证书

| 类型 | 形式 | 特点 |
| --- | --- | --- |
| OV（Organization Validation） | USB token 或云 HSM（新证书不再发 pfx） | 最常用，价格较低，签发前要核验身份，通常几天 |
| EV（Extended Validation） | 硬件 token / 云 HSM | 核验更严，信誉积累更快，私钥不可导出 |
| Azure Trusted Signing | 云服务，按签名次数计费 | 不用自管证书，CI 里最省事；需要 Azure 订阅与身份核验 |
| 开源赞助计划 | 由赞助方代签 | 免费，但签名显示赞助方（如 SignPath Foundation）；需要申请并被接受 |

**开源项目优先看这两种**（本项目是 MIT 协议，符合条件）：

- **SignPath Foundation**：面向开源项目的免费 Authenticode 签名，提供 GitHub Actions 集成，
  签名者显示为 "SignPath Foundation"。需要提交项目申请。
- **Certum Open Source Code Signing**：面向开源项目的免费证书，通过 SimplySign 云签名，
  有调用次数限制，需要项目核验。

两者的共同点：免费、云端签、能进 CI；代价是签名者不是你本人，且需要人工审核。若你想显示自己的
名字，再考虑 Azure Trusted Signing 或自购 OV。

签发机构（DigiCert、Sectigo、SSL.com、Certum 等）都会给出 token 或云签名入口。**EV 与新的
OV 证书都不能导出成 pfx**，只能走下面的"方案 B"。

## 2. 方案 A：本机证书 + 内置 signtool

适用于：证书已经装在本机的证书存储里（老 pfx，或 token 厂商安装的 CSP/KSP 让 private key 可
通过 `CurrentUser\My` 访问），且签名就在这台机器上做。

### 导入证书（只做一次）

```powershell
# 导入到当前用户的个人证书存储
certutil -f -p "<pfx 密码>" -importPFX My "codesign.pfx"

# 查看 SHA1 指纹（Tauri 用的是这个 SHA1，不是 SHA256）
Get-ChildItem Cert:\CurrentUser\My |
  Where-Object { $_.Subject -like "*你的公司或名字*" } |
  Format-List Subject, Thumbprint, NotAfter
```

### 配置 Tauri

```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "A1B2C3D4E5F6...（去掉空格的 SHA1）",
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.digicert.com",
      "tsp": false
    }
  }
}
```

- `timestampUrl` 必填：没有时间戳，证书到期后旧签名会失效。
- 用 RFC 3161 时间戳服务（如 SSL.com）时把 `tsp` 设为 `true`。
- `digestAlgorithm` 用 `sha256`；`sha1` 已被浏览器和 SmartScreen 淘汰。

配好后直接 `pnpm tauri build`，exe、MSI、NSIS 安装包都会被签。

## 3. 方案 B：自定义 `signCommand`

EV token、云 HSM、Azure Trusted Signing，或者用 `osslsigncode` 跨平台签名时，用自定义命令。
`%1` 会被替换成待签名文件路径：

```json
{
  "bundle": {
    "windows": {
      "signCommand": {
        "cmd": "signtool.exe",
        "args": [
          "sign",
          "/fd", "sha256",
          "/tr", "http://timestamp.digicert.com",
          "/td", "sha256",
          "/sha1", "<EV token 里证书的 SHA1>",
          "%1"
        ]
      }
    }
  }
}
```

也可以用字符串简写（会按空格拆分，路径含空格时要改用对象写法）：

```json
"signCommand": "signtool sign /fd sha256 /tr http://timestamp.digicert.com /td sha256 /sha1 <SHA1> %1"
```

Azure Trusted Signing 用它的 CLI（`TrustedSigningClientTool.exe` 或官方 signtool dlib）替换
`cmd` 即可；具体参数见 Azure 文档。

## 4. 手动签名与验证

不经过 Tauri，直接签已有产物：

```powershell
signtool sign /fd sha256 /tr http://timestamp.digicert.com /td sha256 `
  /sha1 <SHA1 指纹> "path\to\Shirone Studio_0.1.0_x64-setup.exe"

signtool verify /pa /v "path\to\Shirone Studio_0.1.0_x64-setup.exe"
```

`/pa` 表示按 Authenticode 策略验证；看到 `Successfully verified` 与时间戳信息就说明签好了。
**签名之后不要再改动文件**，任何改动都会让签名失效。

## 5. 在 CI 里签名

把 pfx 转成 base64 存进仓库 Secret（`WINDOWS_CERT_PFX_BASE64`、`WINDOWS_CERT_PASSWORD`），
在 workflow 里还原并导入：

```yaml
- name: Import code signing certificate
  if: ${{ secrets.WINDOWS_CERT_PFX_BASE64 != '' }}
  shell: pwsh
  run: |
    [IO.File]::WriteAllBytes("cert.pfx", [Convert]::FromBase64String("${{ secrets.WINDOWS_CERT_PFX_BASE64 }}"))
    certutil -f -p "${{ secrets.WINDOWS_CERT_PASSWORD }}" -importPFX My cert.pfx
    Remove-Item cert.pfx
- run: pnpm tauri build
```

`tauri.conf.json` 里的 `certificateThumbprint` 必须是证书的 SHA1，CI 和本地用同一张证书时不用
改配置。EV token 无法在 CI 里用 pfx，要么走厂商的云签名服务，要么用 Cloud HSM（Azure Key
Vault / AWS KMS + 自定义 `signCommand`）。

开源项目还可以直接用赞助方的 GitHub Action（SignPath 提供 `signpath/github-action-submit-signing-request`），
不需要自己持有任何密钥：把构建产物交给它，返回已签名文件，再上传到 release。

## 6. 自签证书（只用于本地测试）

```powershell
New-SelfSignedCertificate -Type CodeSigningCert `
  -Subject "CN=Shirone Studio (dev)" `
  -CertStoreLocation Cert:\CurrentUser\My -HashAlgorithm SHA256
```

用它的 SHA1 签名即可，但别人的机器上仍会显示"未知发布者"——除非手动把证书装进"受信任的根证书
颁发机构"，这只适合自己测试。

## 7. 常见坑

- **只签了安装包没签 exe**：Tauri 会一起签；手动签时记得 exe（`shirone-studio.exe`）也签。
- **没有时间戳**：证书 1–3 年到期后，所有旧版本的签名一起失效。
- **SHA1 摘要**：`signtool` 菜单里选 SHA1 会让新版 Windows 直接拒绝。
- **SmartScreen 仍然提示**：签名解决"未知发布者"，但信誉要时间积累；EV 证书或 Azure Trusted
  Signing 更快。
- **更新器签名不是 Authenticode**：Tauri 的自动更新用 minisign 密钥（`tauri signer generate`
  生成），和本文的代码签名是两套东西。

## 8. 对本项目的建议

| 阶段 | 建议 |
| --- | --- |
| 现在（个人项目、少量下载） | 保持未签名，在 release 附 `SHA256SUMS.txt` 让用户校验完整性即可 |
| 想减少"未知发布者"的摩擦 | 申请 **SignPath Foundation** 或 **Certum Open Source**（免费、可进 CI，签名显示赞助方） |
| 想要自己的发布者名字 | **Azure Trusted Signing**（约 $10/月起，需能通过身份核验）；否则买 OV token，在本机签 |
| 面向大量用户、需要最强信号 | 再考虑 EV；现阶段性价比低 |

EV 不是门槛，也不是万能：真正减少拦截的是"签名 + 稳定下载量 + 时间"，而不是证书等级。
