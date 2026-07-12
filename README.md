# SillyTavern Token 傳送計數器

顯示目前聊天與全部聊天的 API 生成請求累計次數。

## 安裝

1. 解壓縮 ZIP。
2. 將 `sillytavern-token-request-counter` 資料夾放進：
   `SillyTavern/data/<你的使用者名稱>/extensions/`
3. 重新啟動 SillyTavern。
4. 在擴充功能管理頁確認「Token 傳送計數器」已啟用。

## 計數規則

- 一般訊息生成：+1
- Swipe／重新生成：+1
- Continue／續寫：+1
- 中途停止：仍計入
- 單純編輯或刪除訊息：不計入

此擴充套件計算 API 生成請求次數，不是供應商帳單中的精確 Token 數量。
