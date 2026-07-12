# SillyTavern API Token 用量面板 v2.0.0

顯示每次 API 實際回傳的輸入 Token、模型回覆 Token、本次合計、目前聊天累計與全部累計。

## 安裝

1. 解壓縮 ZIP。
2. 將 `sillytavern-token-request-counter` 資料夾放進 `SillyTavern/data/<使用者名稱>/extensions/`。
3. 若安裝過 v1，直接覆蓋舊資料夾。
4. 重新啟動 SillyTavern，並確認「API Token 用量面板」已啟用。

## 精確度

面板只記錄 API 回應內的官方 usage 數據，不自行估算。支援 OpenAI 相容格式、Anthropic input/output 格式、Gemini usageMetadata 與 llama.cpp/KoboldCpp 常見欄位。若供應商或代理端沒有把 usage 傳回 SillyTavern，面板會顯示「API 未回傳 usage」。串流模式能否取得精確值也取決於後端是否在串流資料中附帶 usage。
