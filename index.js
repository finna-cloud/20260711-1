const MODULE_NAME = 'token_usage_panel';
const CHAT_KEY = 'token_usage_panel_data';
const originalFetch = window.fetch.bind(window);

function emptyUsage() {
    return { input: 0, output: 0, total: 0, requests: 0, userMessages: 0, lastInput: 0, lastOutput: 0, lastTotal: 0, status: '等待生成' };
}

function getSettings() {
    const context = SillyTavern.getContext();
    if (!context.extensionSettings[MODULE_NAME]) {
        context.extensionSettings[MODULE_NAME] = emptyUsage();
    }
    if (!Number.isFinite(context.extensionSettings[MODULE_NAME].userMessages)) {
        context.extensionSettings[MODULE_NAME].userMessages = 0;
    }
    return context.extensionSettings[MODULE_NAME];
}

function getChatUsage() {
    const context = SillyTavern.getContext();
    if (!context.chatMetadata[CHAT_KEY]) context.chatMetadata[CHAT_KEY] = emptyUsage();
    if (!Number.isFinite(context.chatMetadata[CHAT_KEY].userMessages)) {
        context.chatMetadata[CHAT_KEY].userMessages = 0;
    }
    return context.chatMetadata[CHAT_KEY];
}

function numberFrom(object, keys) {
    for (const key of keys) {
        const value = Number(object?.[key]);
        if (Number.isFinite(value) && value >= 0) return value;
    }
    return null;
}

function normalizeUsage(object) {
    if (!object || typeof object !== 'object') return null;
    const input = numberFrom(object, ['prompt_tokens', 'input_tokens', 'promptTokenCount', 'prompt_eval_count']);
    const output = numberFrom(object, ['completion_tokens', 'output_tokens', 'candidatesTokenCount', 'eval_count']);
    let total = numberFrom(object, ['total_tokens', 'totalTokenCount']);
    if (input === null || output === null) return null;
    if (total === null) total = input + output;
    return { input, output, total };
}

function findUsage(value, seen = new Set()) {
    if (!value || typeof value !== 'object' || seen.has(value)) return null;
    seen.add(value);

    const direct = normalizeUsage(value.usage ?? value.usageMetadata ?? value.timings ?? value);
    if (direct) return direct;

    for (const child of Object.values(value)) {
        const found = findUsage(child, seen);
        if (found) return found;
    }
    return null;
}

function extractUsage(text) {
    if (!text) return null;

    try {
        const found = findUsage(JSON.parse(text));
        if (found) return found;
    } catch { /* SSE or non-JSON response */ }

    let latest = null;
    for (const rawLine of text.split(/\r?\n/)) {
        let line = rawLine.trim();
        if (line.startsWith('data:')) line = line.slice(5).trim();
        if (!line || line === '[DONE]') continue;
        try {
            const found = findUsage(JSON.parse(line));
            if (found) latest = found;
        } catch { /* Ignore ordinary streamed text */ }
    }
    return latest;
}

function isGenerationRequest(input, init) {
    const url = typeof input === 'string' ? input : input?.url || '';
    const method = String(init?.method || input?.method || 'GET').toUpperCase();
    return method === 'POST' && /(?:\/generate(?:\?|$)|chat-completions\/generate|text-completions\/generate)/i.test(url);
}

async function recordUsage(usage) {
    const context = SillyTavern.getContext();
    const global = getSettings();
    const chat = getChatUsage();

    for (const target of [global, chat]) {
        target.input += usage.input;
        target.output += usage.output;
        target.total += usage.total;
        target.requests += 1;
        target.lastInput = usage.input;
        target.lastOutput = usage.output;
        target.lastTotal = usage.total;
        target.status = 'API 精確數據';
    }

    context.saveSettingsDebounced();
    await context.saveMetadata();
    updatePanel();
}

async function recordUserMessage() {
    const context = SillyTavern.getContext();
    getSettings().userMessages += 1;
    getChatUsage().userMessages += 1;
    context.saveSettingsDebounced();
    await context.saveMetadata();
    updatePanel();
}

function markUnavailable() {
    const global = getSettings();
    const chat = getChatUsage();
    global.status = chat.status = 'API 未回傳 usage';
    SillyTavern.getContext().saveSettingsDebounced();
    updatePanel();
}

window.fetch = async function tokenUsageFetch(input, init) {
    const response = await originalFetch(input, init);
    if (!isGenerationRequest(input, init)) return response;

    const copy = response.clone();
    copy.text()
        .then(extractUsage)
        .then(usage => usage ? recordUsage(usage) : markUnavailable())
        .catch(() => markUnavailable());

    return response;
};

function format(value) {
    return Number(value || 0).toLocaleString();
}

function updatePanel() {
    const panel = document.querySelector('#token-usage-panel');
    if (!panel) return;
    const chat = getChatUsage();
    const global = getSettings();

    panel.querySelector('#tup-last-input').textContent = format(chat.lastInput);
    panel.querySelector('#tup-last-output').textContent = format(chat.lastOutput);
    panel.querySelector('#tup-last-total').textContent = format(chat.lastTotal);
    panel.querySelector('#tup-chat-total').textContent = format(chat.total);
    panel.querySelector('#tup-global-total').textContent = format(global.total);
    panel.querySelector('#tup-chat-messages').textContent = format(chat.userMessages);
    panel.querySelector('#tup-global-messages').textContent = format(global.userMessages);
    panel.querySelector('#tup-status').textContent = chat.status;
}

function createPanel() {
    if (document.querySelector('#token-usage-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'token-usage-panel';
    panel.innerHTML = `
        <div class="tup-header"><span>TOKEN USAGE</span><button id="tup-collapse" type="button">−</button></div>
        <div class="tup-content">
            <div class="tup-title">本次 API 呼叫</div>
            <div class="tup-row"><span>輸入 Token</span><strong id="tup-last-input">0</strong></div>
            <div class="tup-row"><span>回覆 Token</span><strong id="tup-last-output">0</strong></div>
            <div class="tup-row total"><span>本次合計</span><strong id="tup-last-total">0</strong></div>
            <div class="tup-divider"></div>
            <div class="tup-row"><span>目前聊天累計</span><strong id="tup-chat-total">0</strong></div>
            <div class="tup-row"><span>全部累計</span><strong id="tup-global-total">0</strong></div>
            <div class="tup-divider"></div>
            <div class="tup-title">使用者傳送訊息</div>
            <div class="tup-row"><span>目前聊天</span><strong id="tup-chat-messages">0</strong></div>
            <div class="tup-row"><span>全部累計</span><strong id="tup-global-messages">0</strong></div>
            <div id="tup-status" class="tup-status">等待生成</div>
            <button id="tup-reset-chat" type="button">重設目前聊天</button>
            <button id="tup-reset-all" type="button">重設全部累計</button>
        </div>`;
    document.body.appendChild(panel);

    panel.querySelector('#tup-collapse').addEventListener('click', () => {
        const collapsed = panel.querySelector('.tup-content').classList.toggle('tup-collapsed');
        panel.querySelector('#tup-collapse').textContent = collapsed ? '+' : '−';
    });
    panel.querySelector('#tup-reset-chat').addEventListener('click', async () => {
        SillyTavern.getContext().chatMetadata[CHAT_KEY] = emptyUsage();
        await SillyTavern.getContext().saveMetadata();
        updatePanel();
    });
    panel.querySelector('#tup-reset-all').addEventListener('click', () => {
        if (!window.confirm('確定要清除全部 Token 累計嗎？')) return;
        SillyTavern.getContext().extensionSettings[MODULE_NAME] = emptyUsage();
        SillyTavern.getContext().saveSettingsDebounced();
        updatePanel();
    });
    updatePanel();
}

function initialize() {
    const { eventSource, event_types } = SillyTavern.getContext();
    createPanel();
    eventSource.on(event_types.MESSAGE_SENT, recordUserMessage);
    eventSource.on(event_types.CHAT_CHANGED, updatePanel);
}

const { eventSource, event_types } = SillyTavern.getContext();
eventSource.on(event_types.APP_READY, initialize);
