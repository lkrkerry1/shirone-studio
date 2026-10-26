# 签名安装包

Windows 上的"签名"指 **Authenticode**：用代码签名证书给 `.exe` / `.msi` 生成数字签名。签名后
Windows 能验证发布者、签名后文件被改动会失效，SmartScreen 的"未知发布者"提示也会随证书信誉
逐步消失。

Tauri 在 `tauri build` 时会自动签名应用 exe 和生成的安装包，只要 `tauri.conf.json` 里配好
`bundle.windows`。没有证书时构建照常进行，产物就是未签名的（当前 v0.1.0 就是这样）。

## 1. 先拿到证书

| 类型 | 形式 | 特点 |
| --- | --- | --- |
| OV（Organization Validation） | `.pfx` 文件 + 密码 | 最常用，价格较低，签发前要核验身份，通常几天 |
| EV（Extended Validation） | 硬件 token / 云 HSM | 核验更严，SmartScreen 信誉积累最快，不能导出成 pfx |
| Azure Trusted Signing | 云服务，按签名次数计费 | 不用自管证书，CI 里最省事；需要 Azure 订阅与身份核验 |

签发机构（DigiCert、Sectigo、SSL.com、Certum 等）都会给出 pfx 或云签名入口。**EV 证书不能
导出成 pfx**，所以只能用下面的"方案 B"。

## 2. 方案 A：pfx + 内置 signtool

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
