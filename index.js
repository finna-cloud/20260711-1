const MODULE_NAME = 'token_request_counter';
const CHAT_KEY = 'token_request_counter_count';

function getSettings() {
    const context = SillyTavern.getContext();
    const { extensionSettings } = context;

    if (!extensionSettings[MODULE_NAME]) {
        extensionSettings[MODULE_NAME] = { totalRequests: 0 };
    }

    if (!Number.isFinite(extensionSettings[MODULE_NAME].totalRequests)) {
        extensionSettings[MODULE_NAME].totalRequests = 0;
    }

    return extensionSettings[MODULE_NAME];
}

function getChatCount() {
    const value = SillyTavern.getContext().chatMetadata?.[CHAT_KEY];
    return Number.isFinite(value) ? value : 0;
}

function updatePanel() {
    const panel = document.querySelector('#token-request-panel');
    if (!panel) return;

    panel.querySelector('#trc-chat').textContent = getChatCount().toLocaleString();
    panel.querySelector('#trc-total').textContent = getSettings().totalRequests.toLocaleString();
}

function createPanel() {
    if (document.querySelector('#token-request-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'token-request-panel';
    panel.innerHTML = `
        <div class="trc-header">
            <span>API REQUEST</span>
            <button id="trc-collapse" type="button" title="收合">−</button>
        </div>
        <div class="trc-content">
            <div class="trc-row"><span>目前聊天</span><strong id="trc-chat">0</strong></div>
            <div class="trc-row"><span>全部累計</span><strong id="trc-total">0</strong></div>
            <button id="trc-reset-chat" type="button">重設目前聊天</button>
            <button id="trc-reset-all" type="button">全部重設</button>
        </div>`;

    document.body.appendChild(panel);

    panel.querySelector('#trc-collapse').addEventListener('click', () => {
        const content = panel.querySelector('.trc-content');
        const collapsed = content.classList.toggle('trc-collapsed');
        panel.querySelector('#trc-collapse').textContent = collapsed ? '+' : '−';
    });

    panel.querySelector('#trc-reset-chat').addEventListener('click', async () => {
        const context = SillyTavern.getContext();
        context.chatMetadata[CHAT_KEY] = 0;
        await context.saveMetadata();
        updatePanel();
        toastr.success('已重設目前聊天的傳送次數');
    });

    panel.querySelector('#trc-reset-all').addEventListener('click', () => {
        if (!window.confirm('確定要清除全部累計次數嗎？')) return;
        const context = SillyTavern.getContext();
        getSettings().totalRequests = 0;
        context.saveSettingsDebounced();
        updatePanel();
        toastr.success('已重設全部累計次數');
    });

    updatePanel();
}

async function countGeneration() {
    const context = SillyTavern.getContext();
    const settings = getSettings();

    settings.totalRequests += 1;
    context.chatMetadata[CHAT_KEY] = getChatCount() + 1;
    context.saveSettingsDebounced();
    await context.saveMetadata();
    updatePanel();
}

function initialize() {
    const { eventSource, event_types } = SillyTavern.getContext();
    createPanel();
    eventSource.on(event_types.GENERATION_STARTED, countGeneration);
    eventSource.on(event_types.CHAT_CHANGED, updatePanel);
}

const { eventSource, event_types } = SillyTavern.getContext();
eventSource.on(event_types.APP_READY, initialize);
