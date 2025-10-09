const state = {
  conversations: [],
  currentConversationId: null,
  messages: {},
  assets: [],
  galleries: [],
  widgets: [],
  filters: {
    feedSearch: '',
    feedType: 'all',
    gallerySearch: '',
    galleryCategory: 'all',
  },
  composer: {
    selectedAssets: [],
    source: 'feed',
  },
  canvasScale: 1,
  agents: [],
  currentAgentId: null,
  agentPlan: null,
  audioTracks: [],
};

const conversationListEl = document.getElementById('conversation-list');
let chatThreadEl = document.getElementById('chat-thread');
let chatFormEl = document.getElementById('chat-form');
let chatInputEl = document.getElementById('chat-input');
let modelSelectEl = document.getElementById('model-select');
const newConversationBtn = document.getElementById('new-conversation');
const galleryEl = document.getElementById('gallery');
const feedSearchEl = document.getElementById('feed-search');
const feedTypeFilterEl = document.getElementById('feed-type-filter');

const canvasWrapperEl = document.getElementById('canvas-wrapper');
const canvasEl = document.getElementById('canvas');
const canvasContentEl = document.getElementById('canvas-content');
const zoomIndicatorEl = document.getElementById('zoom-indicator');
const zoomButtons = document.querySelectorAll('[data-zoom]');
const dropdownEl = document.querySelector('[data-dropdown]');
const addWidgetBtn = document.getElementById('add-widget');
const addWidgetOptions = dropdownEl ? dropdownEl.querySelectorAll('.dropdown__item') : [];
const agentsPanelEl = document.getElementById('agents');
const agentsToggleBtn = document.getElementById('agents-toggle');
const agentsCloseBtn = document.getElementById('agents-close');
const studioStatusEl = document.getElementById('studio-generate-status');
const studioPreviewEl = document.getElementById('studio-generate-preview');
const agentsCountEl = document.getElementById('agents-count');
const agentsListEl = document.getElementById('agents-list');
const agentDetailPanelEl = document.getElementById('agent-detail');
const agentBuilderForm = document.getElementById('agent-builder-form');
const agentBuilderPromptEl = document.getElementById('agent-builder-prompt');
const agentBuilderContextEl = document.getElementById('agent-builder-context');
const agentBuilderStatusEl = document.getElementById('agent-builder-status');
const agentBuilderClearBtn = document.getElementById('agent-builder-clear');
const agentNewFromPlanBtn = document.getElementById('agents-new-from-plan');
const agentPlanEl = document.getElementById('agent-plan');
const agentPlanNameEl = document.getElementById('agent-plan-name');
const agentPlanDetailsEl = document.getElementById('agent-plan-details');
const agentPlanSaveBtn = document.getElementById('agent-plan-save');
const agentPlanDismissBtn = document.getElementById('agent-plan-dismiss');
const audioPanelEl = document.getElementById('audio');
const audioToggleBtn = document.getElementById('audio-toggle');
const audioCloseBtn = document.getElementById('audio-close');
const audioFormEl = document.getElementById('audio-form');
const audioTitleEl = document.getElementById('audio-title');
const audioPromptEl = document.getElementById('audio-prompt');
const audioStyleEl = document.getElementById('audio-style');
const audioVoiceEl = document.getElementById('audio-voice');
const audioTypeEl = document.getElementById('audio-type');
const audioDurationEl = document.getElementById('audio-duration');
const audioStatusEl = document.getElementById('audio-status');
const audioGalleryEl = document.getElementById('audio-gallery');
const audioCountEl = document.getElementById('audio-count');

let widgetZIndex = 10;
let pointerInteraction = null;

const studioEl = document.getElementById('studio');
const studioToggleBtn = document.getElementById('studio-toggle');
const studioCloseBtn = document.getElementById('studio-close');
const studioNavButtons = Array.from(document.querySelectorAll('.studio__nav-btn'));
const studioGenerateForm = document.getElementById('studio-generate-form');
const studioPromptEl = document.getElementById('studio-prompt');
const studioAssetTypeEl = document.getElementById('studio-asset-type');
const studioSizeEl = document.getElementById('studio-size');
const studioAspectEl = document.getElementById('studio-aspect');
const studioQualityEl = document.getElementById('studio-quality');
const studioDurationEl = document.getElementById('studio-duration');
const studioDurationField = document.getElementById('studio-duration-field');

const studioGalleryForm = document.getElementById('studio-gallery-form');
const studioGalleryNameEl = document.getElementById('studio-gallery-name');
const studioGalleryCategoryEl = document.getElementById('studio-gallery-category');
const studioGalleryColorEl = document.getElementById('studio-gallery-color');
const studioGalleryLayoutEl = document.getElementById('studio-gallery-layout');
const studioGalleryDescriptionEl = document.getElementById('studio-gallery-description');
const studioGallerySearchEl = document.getElementById('studio-gallery-search');
const studioGalleryFilterEl = document.getElementById('studio-gallery-filter');
const studioGalleryListEl = document.getElementById('studio-gallery-list');

const composerGallerySelectEl = document.getElementById('composer-gallery-select');
const composerLibraryEl = document.getElementById('composer-library');
const composerTimelineEl = document.getElementById('composer-timeline');
const composerRenderBtn = document.getElementById('composer-render');
const composerClearBtn = document.getElementById('composer-clear');
const composerTitleEl = document.getElementById('composer-title');
const composerOrientationEl = document.getElementById('composer-orientation');
const composerDescriptionEl = document.getElementById('composer-description');

async function fetchJSON(url, options) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Request failed');
  }
  if (res.status === 204) {
    return null;
  }
  return res.json();
}

function bindChatWorkspace() {
  const nextForm = document.getElementById('chat-form');
  if (chatFormEl && chatFormEl !== nextForm) {
    chatFormEl.removeEventListener('submit', sendMessage);
  }
  chatFormEl = nextForm;
  chatThreadEl = document.getElementById('chat-thread');
  chatInputEl = document.getElementById('chat-input');
  modelSelectEl = document.getElementById('model-select');
  if (chatFormEl) {
    chatFormEl.addEventListener('submit', sendMessage);
  }
  if (chatThreadEl) {
    if (state.currentConversationId) {
      renderMessages(state.currentConversationId);
    } else {
      chatThreadEl.innerHTML = '';
    }
  }
}

function unbindChatWorkspace() {
  if (chatFormEl) {
    chatFormEl.removeEventListener('submit', sendMessage);
  }
  chatFormEl = null;
  chatThreadEl = null;
  chatInputEl = null;
  modelSelectEl = null;
}

function renderConversations() {
  if (!conversationListEl) return;
  conversationListEl.innerHTML = '';
  state.conversations.forEach((conversation) => {
    const li = document.createElement('li');
    if (conversation.id === state.currentConversationId) {
      li.classList.add('active');
    }
    const titleButton = document.createElement('button');
    titleButton.type = 'button';
    titleButton.className = 'conversation-list__title';
    titleButton.textContent = conversation.title;
    titleButton.addEventListener('click', () => selectConversation(conversation.id));

    const actions = document.createElement('div');
    actions.className = 'conversation-list__actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'conversation-list__btn';
    editButton.title = 'Rename conversation';
    editButton.setAttribute('aria-label', `Rename ${conversation.title}`);
    editButton.textContent = '✎';
    editButton.addEventListener('click', (event) => {
      event.stopPropagation();
      editConversation(conversation.id);
    });

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'conversation-list__btn';
    deleteButton.title = 'Delete conversation';
    deleteButton.setAttribute('aria-label', `Delete ${conversation.title}`);
    deleteButton.textContent = '🗑';
    deleteButton.addEventListener('click', (event) => {
      event.stopPropagation();
      deleteConversation(conversation.id);
    });

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
    li.appendChild(titleButton);
    li.appendChild(actions);
    conversationListEl.appendChild(li);
  });
}

function renderMessages(conversationId) {
  if (!chatThreadEl) return;
  const messages = state.messages[conversationId] || [];
  chatThreadEl.innerHTML = '';
  if (!messages.length) {
    const placeholder = document.createElement('div');
    placeholder.className = 'message message--assistant';
    placeholder.textContent = 'No messages yet. Ask a question to start the conversation.';
    chatThreadEl.appendChild(placeholder);
    return;
  }

  messages.forEach((message) => {
    const bubble = document.createElement('div');
    bubble.classList.add('message');
    bubble.classList.add(message.role === 'user' ? 'message--user' : 'message--assistant');
    bubble.innerText = message.content;
    chatThreadEl.appendChild(bubble);
  });

  chatThreadEl.scrollTop = chatThreadEl.scrollHeight;
}

async function loadConversations() {
  const data = await fetchJSON('/api/conversations');
  state.conversations = data;
  renderConversations();
  if (data.length && !state.currentConversationId) {
    selectConversation(data[0].id);
  }
}

async function selectConversation(conversationId) {
  state.currentConversationId = conversationId;
  renderConversations();
  const messages = await fetchJSON(`/api/conversations/${conversationId}/messages`);
  state.messages[conversationId] = messages;
  renderMessages(conversationId);
}

async function createConversation() {
  const title = prompt('Name your new conversation', 'Untitled strategy sprint');
  if (!title) return;
  const conversation = await fetchJSON('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
  state.conversations.unshift(conversation);
  renderConversations();
  await selectConversation(conversation.id);
}

async function editConversation(conversationId) {
  const conversation = state.conversations.find((item) => item.id === conversationId);
  if (!conversation) return;
  const title = prompt('Rename conversation', conversation.title);
  if (!title || title.trim() === conversation.title) return;
  try {
    const updated = await fetchJSON(`/api/conversations/${conversationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: title.trim() }),
    });
    const index = state.conversations.findIndex((item) => item.id === conversationId);
    if (index !== -1 && updated) {
      state.conversations[index] = updated;
      state.conversations.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
    }
    renderConversations();
  } catch (error) {
    console.error(error);
    alert('Unable to rename conversation.');
  }
}

async function deleteConversation(conversationId) {
  const conversation = state.conversations.find((item) => item.id === conversationId);
  if (!conversation) return;
  const confirmation = confirm(
    `Delete conversation "${conversation.title}"? All related messages will be removed.`,
  );
  if (!confirmation) return;
  try {
    await fetchJSON(`/api/conversations/${conversationId}`, { method: 'DELETE' });
  } catch (error) {
    console.error(error);
    alert('Unable to delete conversation.');
    return;
  }
  state.conversations = state.conversations.filter((item) => item.id !== conversationId);
  delete state.messages[conversationId];
  if (state.currentConversationId === conversationId) {
    state.currentConversationId = null;
    if (state.conversations.length) {
      await selectConversation(state.conversations[0].id);
    } else if (chatThreadEl) {
      chatThreadEl.innerHTML = '';
    }
  }
  renderConversations();
}

function focusWidget(widget) {
  if (!widget) return;
  widgetZIndex += 1;
  widget.style.zIndex = String(widgetZIndex);
}

function nextWidgetPosition() {
  if (!canvasContentEl) return { left: 160, top: 160 };
  const count = canvasContentEl.querySelectorAll('.widget').length;
  const offset = (count % 6) * 32;
  return { left: 160 + offset, top: 160 + offset };
}

function mountWidget(widget) {
  if (!canvasContentEl || !widget) return widget;
  if (!widget.style.left || !widget.style.top) {
    const { left, top } = nextWidgetPosition();
    widget.style.left = `${left}px`;
    widget.style.top = `${top}px`;
  }
  canvasContentEl.appendChild(widget);
  focusWidget(widget);
  return widget;
}

function registerWidget(record, widget) {
  if (!record || !widget) return;
  widget.dataset.widgetId = String(record.id);
  widget.dataset.widgetType = record.widget_type;
  widget.setAttribute('data-widget-title', record.title || record.widget_type);
  upsertWidgetState(record);
}

function upsertWidgetState(record) {
  const index = state.widgets.findIndex((item) => item.id === record.id);
  if (index >= 0) {
    state.widgets[index] = record;
  } else {
    state.widgets.push(record);
  }
}

function buildWidgetShell(type, record, options) {
  const widget = document.createElement('section');
  widget.className = 'widget';
  widget.dataset.widget = '';
  widget.dataset.widgetType = type;
  const width = record?.width ?? options.width;
  const height = record?.height ?? options.height;
  const position = record
    ? { left: record.position_left, top: record.position_top }
    : (() => {
        const base = nextWidgetPosition();
        const offset = options.offset || { left: 0, top: 0 };
        return { left: base.left + offset.left, top: base.top + offset.top };
      })();
  widget.style.width = `${width}px`;
  widget.style.height = `${height}px`;
  widget.style.left = `${position.left}px`;
  widget.style.top = `${position.top}px`;
  if (record?.id) {
    widget.dataset.widgetId = String(record.id);
  }
  const widgetTitle = record?.title ?? options.title;
  widget.innerHTML = `
    <header class="widget__header" data-drag-handle>
      <h2 class="widget__title">${widgetTitle}</h2>
      <div class="widget__toolbar">
        <button class="widget__icon" data-action="minimize" type="button" aria-label="Minimize">▭</button>
        <button class="widget__icon" data-action="close" type="button" aria-label="Close">✕</button>
      </div>
    </header>
    <div class="widget__body">${options.body}</div>
    <div class="widget__resize" data-resize aria-hidden="true"></div>
  `;
  mountWidget(widget);
  if (record) {
    registerWidget(record, widget);
  }
  return widget;
}

function createChatWidget() {
  let widget = document.getElementById('widget-chat');
  if (widget) {
    widget.classList.remove('is-minimized');
    widget.hidden = false;
    focusWidget(widget);
    bindChatWorkspace();
    return widget;
  }
  widget = document.createElement('section');
  widget.id = 'widget-chat';
  widget.dataset.widget = '';
  widget.dataset.widgetType = 'chat';
  widget.className = 'widget';
  widget.style.width = '520px';
  widget.style.height = '520px';
  widget.style.left = '380px';
  widget.style.top = '120px';
  widget.innerHTML = `
    <header class="widget__header" data-drag-handle>
      <h2 class="widget__title">Chat workspace</h2>
      <div class="widget__toolbar">
        <button class="widget__icon" data-action="minimize" type="button" aria-label="Minimize">▭</button>
        <button class="widget__icon" data-action="close" type="button" aria-label="Close">✕</button>
      </div>
    </header>
    <div class="widget__body">
      <div id="chat-thread" class="chat-thread"></div>
      <form id="chat-form" class="chat-form">
        <textarea
          id="chat-input"
          placeholder="Ask anything about your next product milestone..."
        ></textarea>
        <div class="chat-form__controls">
          <select id="model-select">
            <option value="gpt-5-chat-latest" selected>gpt-5-chat-latest</option>
            <option value="gpt-4.1">gpt-4.1</option>
            <option value="gpt-4.1-mini">gpt-4.1-mini</option>
            <option value="o4-mini">o4-mini</option>
          </select>
          <button type="submit" class="btn btn--primary">Send</button>
        </div>
      </form>
    </div>
    <div class="widget__resize" data-resize aria-hidden="true"></div>
  `;
  mountWidget(widget);
  bindChatWorkspace();
  return widget;
}

function createImageWidget(record) {
  const widget = document.createElement('section');
  widget.className = 'widget';
  widget.dataset.widget = '';
  widget.dataset.widgetType = 'image';
  const width = record?.width ?? 480;
  const height = record?.height ?? 520;
  const position = record
    ? { left: record.position_left, top: record.position_top }
    : (() => {
        const next = nextWidgetPosition();
        return { left: next.left + 96, top: next.top + 32 };
      })();
  widget.style.width = `${width}px`;
  widget.style.height = `${height}px`;
  widget.style.left = `${position.left}px`;
  widget.style.top = `${position.top}px`;
  if (record?.id) {
    widget.dataset.widgetId = String(record.id);
  }
  const widgetTitle = record?.title ?? 'Image studio';
  widget.innerHTML = `
    <header class="widget__header" data-drag-handle>
      <h2 class="widget__title">${widgetTitle}</h2>
      <div class="widget__toolbar">
        <button class="widget__icon" data-action="minimize" type="button" aria-label="Minimize">▭</button>
        <button class="widget__icon" data-action="close" type="button" aria-label="Close">✕</button>
      </div>
    </header>
    <div class="widget__body">
      <div class="widget-app widget-app--split image-widget">
        <section class="widget-app__panel image-widget__composer" aria-label="Image prompt builder">
          <div class="widget-app__panel-header">
            <h3>Prompt builder</h3>
            <div class="image-widget__presets" data-image-presets>
              <button type="button" class="chip" data-image-preset data-prompt="Product hero shot, studio lighting, crisp shadows">Product hero</button>
              <button type="button" class="chip" data-image-preset data-prompt="Concept art of a futuristic control room, volumetric light">Futuristic control</button>
              <button type="button" class="chip" data-image-preset data-prompt="Moodboard of playful mascot illustrations, flat design">Mascot board</button>
            </div>
          </div>
          <form class="widget-form image-widget__form" data-image-form>
            <label class="widget-field">
              <span>Prompt</span>
              <textarea name="prompt" placeholder="Describe the visual you're imagining..." required></textarea>
            </label>
            <div class="widget-form__row">
              <label class="widget-field">
                <span>Size</span>
                <select name="size">
                  <option value="1024x1024">1024 × 1024</option>
                  <option value="512x512">512 × 512</option>
                  <option value="256x256">256 × 256</option>
                </select>
              </label>
              <label class="widget-field">
                <span>Quality</span>
                <select name="quality">
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
            </div>
            <div class="image-widget__controls">
              <div class="image-widget__status" data-status>Outputs land in the generative feed.</div>
              <button type="submit" class="btn btn--primary">Render image</button>
            </div>
          </form>
        </section>
        <section class="widget-app__panel image-widget__gallery" aria-label="Recent image renders">
          <div class="widget-app__panel-header">
            <h3>Recent renders</h3>
            <button type="button" class="btn btn--ghost btn--sm" data-open-feed>Open feed</button>
          </div>
          <div class="image-widget__grid" data-image-widget-gallery></div>
          <p class="widget__hint image-widget__empty" data-image-widget-empty>No renders yet. Generate an image to fill this gallery.</p>
        </section>
      </div>
    </div>
    <div class="widget__resize" data-resize aria-hidden="true"></div>
  `;
  mountWidget(widget);
  if (record) {
    registerWidget(record, widget);
  }
  const form = widget.querySelector('[data-image-form]');
  const statusEl = widget.querySelector('[data-status]');
  const presets = widget.querySelectorAll('[data-image-preset]');
  const feedButton = widget.querySelector('[data-open-feed]');
  if (feedButton) {
    feedButton.addEventListener('click', () => {
      const feedWidget = document.getElementById('widget-feed');
      if (feedWidget) {
        feedWidget.hidden = false;
        feedWidget.classList.remove('is-minimized');
        focusWidget(feedWidget);
      }
    });
  }
  if (form) {
    const promptField = form.querySelector('[name="prompt"]');
    presets.forEach((button) => {
      button.addEventListener('click', () => {
        const preset = button.dataset.prompt || button.textContent || '';
        if (promptField) {
          promptField.value = preset;
          promptField.focus();
        }
      });
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const prompt = String(formData.get('prompt') || '').trim();
      if (!prompt) return;
      const size = formData.get('size') || '1024x1024';
      const quality = formData.get('quality') || 'high';
      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) submitButton.disabled = true;
      if (statusEl) statusEl.textContent = 'Generating image…';
      try {
        await fetchJSON('/api/images', {
          method: 'POST',
          body: JSON.stringify({
            prompt,
            size,
            quality,
            aspect_ratio: '1:1',
          }),
        });
        form.reset();
        if (statusEl) statusEl.textContent = 'Image saved to the feed.';
        await loadGallery();
        await loadGalleries();
      } catch (error) {
        console.error(error);
        if (statusEl) statusEl.textContent = 'Generation failed. Verify your API configuration.';
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  }
  renderImageWidgetGalleries();
  return widget;
}

function createVideoWidget(record) {
  const widget = document.createElement('section');
  widget.className = 'widget';
  widget.dataset.widget = '';
  widget.dataset.widgetType = 'video';
  const width = record?.width ?? 560;
  const height = record?.height ?? 560;
  const position = record
    ? { left: record.position_left, top: record.position_top }
    : (() => {
        const next = nextWidgetPosition();
        return { left: next.left + 220, top: next.top + 96 };
      })();
  widget.style.width = `${width}px`;
  widget.style.height = `${height}px`;
  widget.style.left = `${position.left}px`;
  widget.style.top = `${position.top}px`;
  if (record?.id) {
    widget.dataset.widgetId = String(record.id);
  }
  const widgetTitle = record?.title ?? 'Video lab';
  widget.innerHTML = `
    <header class="widget__header" data-drag-handle>
      <h2 class="widget__title">${widgetTitle}</h2>
      <div class="widget__toolbar">
        <button class="widget__icon" data-action="minimize" type="button" aria-label="Minimize">▭</button>
        <button class="widget__icon" data-action="close" type="button" aria-label="Close">✕</button>
      </div>
    </header>
    <div class="widget__body">
      <div class="widget-app widget-app--split video-widget">
        <section class="widget-app__panel video-widget__director" aria-label="Storyboard controls">
          <div class="widget-app__panel-header">
            <h3>Storyboard</h3>
            <div class="video-widget__beats" data-video-presets>
              <button type="button" class="chip" data-video-preset data-prompt="Scene opens on a macro shot of the product with cinematic lighting">Macro opener</button>
              <button type="button" class="chip" data-video-preset data-prompt="Cut to a user interacting joyfully with the interface, handheld camera">User moment</button>
              <button type="button" class="chip" data-video-preset data-prompt="Closing hero shot with on-screen metrics and bold typography">Hero outro</button>
            </div>
          </div>
          <div class="video-widget__timeline">
            <span class="video-widget__marker">Beat 1</span>
            <span class="video-widget__marker">Beat 2</span>
            <span class="video-widget__marker">Beat 3</span>
          </div>
          <form class="widget-form" data-video-form>
            <label class="widget-field">
              <span>Prompt</span>
              <textarea name="prompt" placeholder="Direct a short product teaser..." required></textarea>
            </label>
            <div class="widget-form__row">
              <label class="widget-field">
                <span>Aspect ratio</span>
                <select name="aspect_ratio">
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                  <option value="1:1">1:1</option>
                </select>
              </label>
              <label class="widget-field">
                <span>Duration</span>
                <input name="duration" type="number" min="2" max="60" value="8" />
              </label>
            </div>
            <div class="video-widget__controls">
              <div class="video-widget__status" data-status>Your clips will appear in the feed once ready.</div>
              <button type="submit" class="btn btn--primary">Render storyboard</button>
            </div>
          </form>
        </section>
        <section class="widget-app__panel video-widget__reel" aria-label="Latest video renders">
          <div class="widget-app__panel-header">
            <h3>Latest cuts</h3>
            <button type="button" class="btn btn--ghost btn--sm" data-open-feed>Open feed</button>
          </div>
          <div class="video-widget__grid" data-video-widget-gallery></div>
          <p class="widget__hint video-widget__empty" data-video-widget-empty>No clips yet. Render a storyboard to see previews.</p>
        </section>
      </div>
    </div>
    <div class="widget__resize" data-resize aria-hidden="true"></div>
  `;
  mountWidget(widget);
  if (record) {
    registerWidget(record, widget);
  }
  const form = widget.querySelector('[data-video-form]');
  const statusEl = widget.querySelector('[data-status]');
  const presets = widget.querySelectorAll('[data-video-preset]');
  const feedButton = widget.querySelector('[data-open-feed]');
  if (feedButton) {
    feedButton.addEventListener('click', () => {
      const feedWidget = document.getElementById('widget-feed');
      if (feedWidget) {
        feedWidget.hidden = false;
        feedWidget.classList.remove('is-minimized');
        focusWidget(feedWidget);
      }
    });
  }
  if (form) {
    const promptField = form.querySelector('[name="prompt"]');
    presets.forEach((button) => {
      button.addEventListener('click', () => {
        const preset = button.dataset.prompt || button.textContent || '';
        if (promptField) {
          const existing = promptField.value.trim();
          promptField.value = existing
            ? `${existing}\n${preset}`
            : preset;
          promptField.focus();
        }
      });
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const prompt = String(formData.get('prompt') || '').trim();
      if (!prompt) return;
      const aspectRatio = formData.get('aspect_ratio') || '16:9';
      const duration = Number(formData.get('duration')) || 8;
      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) submitButton.disabled = true;
      if (statusEl) statusEl.textContent = 'Rendering storyboard…';
      try {
        await fetchJSON('/api/videos', {
          method: 'POST',
          body: JSON.stringify({
            prompt,
            aspect_ratio: aspectRatio,
            duration_seconds: duration,
            quality: 'high',
          }),
        });
        form.reset();
        if (statusEl) statusEl.textContent = 'Video queued and saved to the feed.';
        await loadGallery();
        await loadGalleries();
      } catch (error) {
        console.error(error);
        if (statusEl) statusEl.textContent = 'Generation failed. Check your server logs.';
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  }
  renderVideoWidgetReels();
  return widget;
}

function createWorldWidget(record) {
  const widget = document.createElement('section');
  widget.className = 'widget';
  widget.dataset.widget = '';
  widget.dataset.widgetType = 'world';
  const width = record?.width ?? 560;
  const height = record?.height ?? 460;
  const position = record
    ? { left: record.position_left, top: record.position_top }
    : (() => {
        const next = nextWidgetPosition();
        return { left: next.left + 260, top: next.top + 160 };
      })();
  widget.style.width = `${width}px`;
  widget.style.height = `${height}px`;
  widget.style.left = `${position.left}px`;
  widget.style.top = `${position.top}px`;
  if (record?.id) {
    widget.dataset.widgetId = String(record.id);
  }
  const widgetTitle = record?.title ?? '3D world creator';
  widget.innerHTML = `
    <header class="widget__header" data-drag-handle>
      <h2 class="widget__title">${widgetTitle}</h2>
      <div class="widget__toolbar">
        <button class="widget__icon" data-action="minimize" type="button" aria-label="Minimize">▭</button>
        <button class="widget__icon" data-action="close" type="button" aria-label="Close">✕</button>
      </div>
    </header>
    <div class="widget__body">
      <div class="widget-app widget-app--split world-widget">
        <section class="widget-app__panel world-widget__scene" aria-label="Spatial overview">
          <div class="world-widget__canvas">
            <div class="world-widget__pin world-widget__pin--spawn">Spawn</div>
            <div class="world-widget__pin world-widget__pin--event">Event hub</div>
            <div class="world-widget__pin world-widget__pin--boss">Set piece</div>
          </div>
          <ul class="world-widget__layers">
            <li><span>Biome palette</span> Aurora tundra</li>
            <li><span>Day/night</span> Twin suns orbit</li>
            <li><span>Traversal</span> Hover rails &amp; portals</li>
          </ul>
        </section>
        <section class="widget-app__panel world-widget__notebook" aria-label="World notes">
          <h3>Concept notes</h3>
          <textarea class="world-widget__editor" placeholder="Outline your world, actors, and core interactions..."></textarea>
          <div class="world-widget__actions">
            <button type="button" class="btn btn--primary" data-save-world>Save concept</button>
            <span class="world-widget__status" data-status>This concept saves locally for now. Database sync coming soon.</span>
          </div>
        </section>
      </div>
    </div>
    <div class="widget__resize" data-resize aria-hidden="true"></div>
  `;
  mountWidget(widget);
  if (record) {
    registerWidget(record, widget);
  }
  const saveButton = widget.querySelector('[data-save-world]');
  const statusEl = widget.querySelector('[data-status]');
  const editor = widget.querySelector('.world-widget__editor');
  if (saveButton) {
    saveButton.addEventListener('click', () => {
      if (statusEl) {
        const excerpt = editor?.value.trim();
        statusEl.textContent = excerpt
          ? `Concept saved locally • ${Math.min(excerpt.length, 80)} characters captured`
          : 'Concept noted! Future releases will persist this to the database.';
      }
    });
  }
  return widget;
}

function createAgentWidget(record) {
  const widget = document.createElement('section');
  widget.className = 'widget';
  widget.dataset.widget = '';
  widget.dataset.widgetType = 'agent';
  const width = record?.width ?? 520;
  const height = record?.height ?? 420;
  const position = record
    ? { left: record.position_left, top: record.position_top }
    : (() => {
        const next = nextWidgetPosition();
        return { left: next.left + 120, top: next.top + 200 };
      })();
  widget.style.width = `${width}px`;
  widget.style.height = `${height}px`;
  widget.style.left = `${position.left}px`;
  widget.style.top = `${position.top}px`;
  if (record?.id) {
    widget.dataset.widgetId = String(record.id);
  }
  const widgetTitle = record?.title ?? 'Agents roster';
  widget.innerHTML = `
    <header class="widget__header" data-drag-handle>
      <h2 class="widget__title">${widgetTitle}</h2>
      <div class="widget__toolbar">
        <button class="widget__icon" data-action="minimize" type="button" aria-label="Minimize">▭</button>
        <button class="widget__icon" data-action="close" type="button" aria-label="Close">✕</button>
      </div>
    </header>
    <div class="widget__body">
      <div class="widget-app widget-app--split agent-widget">
        <section class="widget-app__panel agent-widget__summary" aria-label="Roster health">
          <h3>Roster health</h3>
          <div class="agent-widget__metric">
            <span>Active agents</span>
            <strong data-agent-widget-count>0</strong>
          </div>
          <div class="agent-widget__metric">
            <span>Draft plans</span>
            <strong data-agent-widget-plan>0</strong>
          </div>
          <p class="agent-widget__status" data-agent-widget-status>Launch your first automation teammate to see activity here.</p>
        </section>
        <section class="widget-app__panel agent-widget__list" aria-label="Agents">
          <div class="widget-app__panel-header">
            <h3>Active roster</h3>
            <button type="button" class="btn btn--ghost btn--sm" data-open-agents>Open agents workspace</button>
          </div>
          <ul class="agents-widget__list" data-agent-widget-list></ul>
          <p class="widget__hint agent-widget__empty" data-agent-widget-empty hidden>No agents yet. Launch one with the AI builder.</p>
        </section>
      </div>
    </div>
    <div class="widget__resize" data-resize aria-hidden="true"></div>
  `;
  mountWidget(widget);
  if (record) {
    registerWidget(record, widget);
  }
  const openButton = widget.querySelector('[data-open-agents]');
  if (openButton) {
    openButton.addEventListener('click', () => toggleAgents(true));
  }
  renderAgentWidgets();
  return widget;
}

function createCodeWidget(record) {
  const widget = buildWidgetShell('code', record, {
    title: 'Code sandbox',
    width: 540,
    height: 520,
    offset: { left: 300, top: 200 },
    body: `
      <div class="widget-app widget-app--split code-widget">
        <section class="widget-app__panel code-widget__panel" aria-label="Code editor">
          <div class="widget-app__panel-header">
            <h3>Editor</h3>
            <span class="code-widget__environment" data-code-env>Sandbox idle</span>
          </div>
          <form class="widget-form code-widget__form" data-code-form>
            <label class="widget-field">
              <span>Language</span>
              <select name="language">
                <option value="JavaScript">JavaScript</option>
                <option value="Python">Python</option>
                <option value="Node">Node</option>
              </select>
            </label>
            <label class="widget-field">
              <span>Snippet</span>
              <textarea name="snippet" class="code-widget__editor" placeholder="Write or paste code to simulate…" required></textarea>
            </label>
            <div class="widget-form__actions">
              <button type="submit" class="btn btn--primary">Run sandbox</button>
            </div>
          </form>
        </section>
        <section class="widget-app__panel code-widget__console" aria-live="polite">
          <div class="widget-app__panel-header">
            <h3>Console</h3>
            <span class="code-widget__hint">Outputs are simulated</span>
          </div>
          <pre class="code-widget__output" data-code-output>// Awaiting snippet to simulate execution.</pre>
        </section>
      </div>
    `,
  });
  const form = widget.querySelector('[data-code-form]');
  const output = widget.querySelector('[data-code-output]');
  const envIndicator = widget.querySelector('[data-code-env]');
  if (form && output) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const language = form.querySelector('[name="language"]').value;
      const snippet = form.querySelector('[name="snippet"]').value.trim();
      if (!snippet) return;
      output.textContent = `// Simulated ${language} run\n${snippet}\n\n// Results will appear once runtime APIs are wired up.`;
      if (envIndicator) {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        envIndicator.textContent = `${language} • ${timestamp}`;
      }
    });
  }
  return widget;
}

function createDocumentWidget(record) {
  const widget = buildWidgetShell('document', record, {
    title: 'Document writer',
    width: 480,
    height: 500,
    offset: { left: 360, top: 140 },
    body: `
      <div class="widget-app widget-app--split document-widget">
        <section class="widget-app__panel document-widget__composer" aria-label="Outline builder">
          <div class="widget-app__panel-header">
            <h3>Outline</h3>
            <span class="document-widget__badge">Draft mode</span>
          </div>
          <form class="widget-form" data-document-form>
            <label class="widget-field">
              <span>Working title</span>
              <input type="text" name="title" placeholder="Growth strategy brief" required />
            </label>
            <label class="widget-field">
              <span>Key points</span>
              <textarea name="outline" placeholder="Bullet out the narrative and supporting points" required></textarea>
            </label>
            <div class="widget-form__actions">
              <button type="submit" class="btn btn--primary">Draft outline</button>
            </div>
          </form>
        </section>
        <section class="widget-app__panel document-widget__preview-panel" aria-live="polite">
          <div class="widget-app__panel-header">
            <h3>Preview</h3>
            <span class="document-widget__status" data-document-status>Awaiting draft</span>
          </div>
          <article class="document-widget__preview" data-document-output></article>
        </section>
      </div>
    `,
  });
  const form = widget.querySelector('[data-document-form]');
  const output = widget.querySelector('[data-document-output]');
  const statusEl = widget.querySelector('[data-document-status]');
  if (form && output) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const title = form.querySelector('[name="title"]').value.trim();
      const outline = form.querySelector('[name="outline"]').value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      if (!title || !outline.length) return;
      output.innerHTML = `
        <h3>${title}</h3>
        <p>${outline[0]}</p>
        <ul>${outline.slice(1).map((item) => `<li>${item}</li>`).join('')}</ul>
        <p class="document-widget__hint">Full draft will render here once the document API is linked.</p>
      `;
      if (statusEl) {
        statusEl.textContent = 'Draft ready';
      }
    });
  }
  return widget;
}

function createPresentationWidget(record) {
  const widget = buildWidgetShell('presentation', record, {
    title: 'Presentation builder',
    width: 500,
    height: 520,
    offset: { left: 420, top: 220 },
    body: `
      <div class="widget-app widget-app--split presentation-widget">
        <section class="widget-app__panel presentation-widget__composer" aria-label="Deck inputs">
          <div class="widget-app__panel-header">
            <h3>Deck brief</h3>
            <span class="presentation-widget__badge">Slides in draft</span>
          </div>
          <form class="widget-form" data-presentation-form>
            <label class="widget-field">
              <span>Audience</span>
              <input type="text" name="audience" placeholder="Product leadership" required />
            </label>
            <label class="widget-field">
              <span>Slide notes</span>
              <textarea name="slides" placeholder="One slide idea per line" required></textarea>
            </label>
            <div class="widget-form__actions">
              <button type="submit" class="btn btn--primary">Generate deck plan</button>
            </div>
          </form>
        </section>
        <section class="widget-app__panel presentation-widget__preview-panel" aria-live="polite">
          <div class="widget-app__panel-header">
            <h3>Storyboard</h3>
            <span class="presentation-widget__status" data-presentation-status>Awaiting structure</span>
          </div>
          <div class="presentation-widget__preview" data-presentation-output></div>
        </section>
      </div>
    `,
  });
  const form = widget.querySelector('[data-presentation-form]');
  const output = widget.querySelector('[data-presentation-output]');
  const statusEl = widget.querySelector('[data-presentation-status]');
  if (form && output) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const audience = form.querySelector('[name="audience"]').value.trim();
      const slides = form
        .querySelector('[name="slides"]').value.split('\n')
        .map((item) => item.trim())
        .filter(Boolean);
      if (!audience || !slides.length) return;
      output.innerHTML = `
        <h3>Deck preview for ${audience}</h3>
        <ol>${slides.map((slide, index) => `<li><span>Slide ${index + 1}:</span> ${slide}</li>`).join('')}</ol>
        <p class="presentation-widget__hint">Slides render on canvas after integrating the presentation service.</p>
      `;
      if (statusEl) {
        statusEl.textContent = `${slides.length} slide${slides.length === 1 ? '' : 's'} drafted`;
      }
    });
  }
  return widget;
}

function createDataWidget(record) {
  const widget = buildWidgetShell('data', record, {
    title: 'Data visualizer',
    width: 500,
    height: 480,
    offset: { left: 340, top: 260 },
    body: `
      <div class="widget-app widget-app--split data-widget">
        <section class="widget-app__panel data-widget__composer" aria-label="Chart builder">
          <div class="widget-app__panel-header">
            <h3>Chart builder</h3>
            <span class="data-widget__badge">Preview only</span>
          </div>
          <form class="widget-form" data-data-form>
            <label class="widget-field">
              <span>Dataset description</span>
              <textarea name="dataset" placeholder="Paste rows or describe the KPIs to plot" required></textarea>
            </label>
            <label class="widget-field">
              <span>Chart style</span>
              <select name="chart">
                <option value="line">Line</option>
                <option value="bar">Bar</option>
                <option value="pie">Pie</option>
                <option value="scatter">Scatter</option>
              </select>
            </label>
            <div class="widget-form__actions">
              <button type="submit" class="btn btn--primary">Preview insight</button>
            </div>
          </form>
        </section>
        <section class="widget-app__panel data-widget__preview-panel" aria-live="polite">
          <div class="widget-app__panel-header">
            <h3>Visual output</h3>
            <span class="data-widget__status" data-data-status>Waiting for prompt</span>
          </div>
          <div class="data-widget__preview" data-data-output>
            <p class="widget__hint">Visualisations will appear here once the data service is connected.</p>
          </div>
        </section>
      </div>
    `,
  });
  const form = widget.querySelector('[data-data-form]');
  const output = widget.querySelector('[data-data-output]');
  const statusEl = widget.querySelector('[data-data-status]');
  if (form && output) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const description = form.querySelector('[name="dataset"]').value.trim();
      if (!description) return;
      const chart = form.querySelector('[name="chart"]').value;
      output.innerHTML = `
        <div class="data-widget__chart">
          <p>${chart.toUpperCase()} chart preview</p>
          <p class="data-widget__summary">${description.slice(0, 140)}…</p>
        </div>
      `;
      if (statusEl) {
        statusEl.textContent = `${chart} chart staged`;
      }
    });
  }
  return widget;
}

function createGameWidget(record) {
  const widget = buildWidgetShell('game', record, {
    title: 'Game builder',
    width: 520,
    height: 520,
    offset: { left: 260, top: 300 },
    body: `
      <div class="widget-app widget-app--split game-widget">
        <section class="widget-app__panel game-widget__composer" aria-label="Concept builder">
          <div class="widget-app__panel-header">
            <h3>Concept</h3>
            <span class="game-widget__badge">Prototype sketch</span>
          </div>
          <form class="widget-form" data-game-form>
            <label class="widget-field">
              <span>Core fantasy</span>
              <input type="text" name="fantasy" placeholder="E.g. Design your own solar empire" required />
            </label>
            <label class="widget-field">
              <span>Game loop</span>
              <textarea name="loop" placeholder="Describe the repeatable actions" required></textarea>
            </label>
            <div class="widget-form__actions">
              <button type="submit" class="btn btn--primary">Prototype concept</button>
            </div>
          </form>
        </section>
        <section class="widget-app__panel game-widget__preview-panel" aria-live="polite">
          <div class="widget-app__panel-header">
            <h3>Playable beats</h3>
            <span class="game-widget__status" data-game-status>Awaiting concept</span>
          </div>
          <div class="game-widget__preview" data-game-output></div>
        </section>
      </div>
    `,
  });
  const form = widget.querySelector('[data-game-form]');
  const output = widget.querySelector('[data-game-output]');
  const statusEl = widget.querySelector('[data-game-status]');
  if (form && output) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const fantasy = form.querySelector('[name="fantasy"]').value.trim();
      const loop = form.querySelector('[name="loop"]').value.trim();
      if (!fantasy || !loop) return;
      output.innerHTML = `
        <h3>${fantasy}</h3>
        <p>${loop}</p>
        <p class="game-widget__hint">Scene blocks and mechanics will materialise here after connecting the game runtime.</p>
      `;
      if (statusEl) {
        statusEl.textContent = 'Concept staged';
      }
    });
  }
  return widget;
}

function createAvatarWidget(record) {
  const widget = buildWidgetShell('avatar', record, {
    title: 'Avatar creator',
    width: 460,
    height: 480,
    offset: { left: 220, top: 340 },
    body: `
      <div class="widget-app widget-app--split avatar-widget">
        <section class="widget-app__panel avatar-widget__composer" aria-label="Persona builder">
          <div class="widget-app__panel-header">
            <h3>Persona</h3>
            <span class="avatar-widget__badge">Creative brief</span>
          </div>
          <form class="widget-form" data-avatar-form>
            <label class="widget-field">
              <span>Visual style</span>
              <select name="style">
                <option value="cartoon">Cartoon</option>
                <option value="voxel">Voxel</option>
                <option value="photorealistic">Photorealistic</option>
              </select>
            </label>
            <label class="widget-field">
              <span>Persona notes</span>
              <textarea name="notes" placeholder="Describe personality, outfit, and pose" required></textarea>
            </label>
            <div class="widget-form__actions">
              <button type="submit" class="btn btn--primary">Design avatar</button>
            </div>
          </form>
        </section>
        <section class="widget-app__panel avatar-widget__preview-panel" aria-live="polite">
          <div class="widget-app__panel-header">
            <h3>Moodboard</h3>
            <span class="avatar-widget__status" data-avatar-status>Awaiting brief</span>
          </div>
          <div class="avatar-widget__preview" data-avatar-output></div>
        </section>
      </div>
    `,
  });
  const form = widget.querySelector('[data-avatar-form]');
  const output = widget.querySelector('[data-avatar-output]');
  const statusEl = widget.querySelector('[data-avatar-status]');
  if (form && output) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const style = form.querySelector('[name="style"]').value;
      const notes = form.querySelector('[name="notes"]').value.trim();
      if (!notes) return;
      output.innerHTML = `
        <div class="avatar-widget__card">
          <span class="avatar-widget__style">${style}</span>
          <p>${notes}</p>
        </div>
        <p class="avatar-widget__hint">Preview image will display once the avatar pipeline is wired up.</p>
      `;
      if (statusEl) {
        statusEl.textContent = `${style} persona drafted`;
      }
    });
  }
  return widget;
}

function createSimulationWidget(record) {
  const widget = buildWidgetShell('simulation', record, {
    title: 'Simulation sandbox',
    width: 520,
    height: 460,
    offset: { left: 420, top: 320 },
    body: `
      <div class="widget-app widget-app--split simulation-widget">
        <section class="widget-app__panel simulation-widget__composer" aria-label="Scenario setup">
          <div class="widget-app__panel-header">
            <h3>Scenario setup</h3>
            <span class="simulation-widget__badge">Preview run</span>
          </div>
          <form class="widget-form" data-simulation-form>
            <label class="widget-field">
              <span>Scenario</span>
              <input type="text" name="scenario" placeholder="Launch day traffic surge" required />
            </label>
            <label class="widget-field">
              <span>Variables</span>
              <textarea name="variables" placeholder="List inputs to simulate" required></textarea>
            </label>
            <div class="widget-form__actions">
              <button type="submit" class="btn btn--primary">Run simulation</button>
            </div>
          </form>
        </section>
        <section class="widget-app__panel simulation-widget__preview-panel" aria-live="polite">
          <div class="widget-app__panel-header">
            <h3>Projected output</h3>
            <span class="simulation-widget__status" data-simulation-status>Idle</span>
          </div>
          <div class="simulation-widget__output" data-simulation-output>
            <p class="widget__hint">Model outputs will stream here as soon as the physics service is ready.</p>
          </div>
        </section>
      </div>
    `,
  });
  const form = widget.querySelector('[data-simulation-form]');
  const output = widget.querySelector('[data-simulation-output]');
  const statusEl = widget.querySelector('[data-simulation-status]');
  if (form && output) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const scenario = form.querySelector('[name="scenario"]').value.trim();
      const variables = form.querySelector('[name="variables"]').value
        .split('\n')
        .map((value) => value.trim())
        .filter(Boolean);
      if (!scenario || !variables.length) return;
      output.innerHTML = `
        <h3>${scenario}</h3>
        <p>Variables in play:</p>
        <ul>${variables.map((item) => `<li>${item}</li>`).join('')}</ul>
      `;
      if (statusEl) {
        statusEl.textContent = 'Simulation queued';
      }
    });
  }
  return widget;
}

function createWhiteboardWidget(record) {
  const widget = buildWidgetShell('whiteboard', record, {
    title: 'Collaboration whiteboard',
    width: 540,
    height: 500,
    offset: { left: 380, top: 360 },
    body: `
      <div class="widget-app widget-app--split whiteboard-widget">
        <section class="widget-app__panel whiteboard-widget__composer" aria-label="Add note">
          <div class="widget-app__panel-header">
            <h3>New sticky</h3>
            <span class="whiteboard-widget__badge">Local only</span>
          </div>
          <form class="widget-form" data-whiteboard-form>
            <label class="widget-field">
              <span>Add sticky note</span>
              <input type="text" name="note" placeholder="Capture a decision or task" />
            </label>
            <div class="widget-form__actions">
              <button type="submit" class="btn">Add note</button>
            </div>
          </form>
        </section>
        <section class="widget-app__panel whiteboard-widget__board" aria-live="polite">
          <div class="widget-app__panel-header">
            <h3>Ideas board</h3>
            <span class="whiteboard-widget__status" data-whiteboard-count>0 notes</span>
          </div>
          <ul class="whiteboard-widget__notes" data-whiteboard-list></ul>
          <p class="widget__hint">Shared cursors and live sync land here next.</p>
        </section>
      </div>
    `,
  });
  const form = widget.querySelector('[data-whiteboard-form]');
  const list = widget.querySelector('[data-whiteboard-list]');
  const countEl = widget.querySelector('[data-whiteboard-count]');
  if (form && list) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = form.querySelector('[name="note"]');
      const value = input.value.trim();
      if (!value) return;
      const item = document.createElement('li');
      item.textContent = value;
      list.appendChild(item);
      input.value = '';
      if (countEl) {
        const total = list.querySelectorAll('li').length;
        countEl.textContent = total === 1 ? '1 note' : `${total} notes`;
      }
    });
  }
  return widget;
}

function createKnowledgeWidget(record) {
  const widget = buildWidgetShell('knowledge', record, {
    title: 'Knowledge board',
    width: 500,
    height: 500,
    offset: { left: 440, top: 380 },
    body: `
      <div class="widget-app widget-app--split knowledge-widget">
        <section class="widget-app__panel knowledge-widget__composer" aria-label="Add insight">
          <div class="widget-app__panel-header">
            <h3>New insight</h3>
            <span class="knowledge-widget__badge">Pinned locally</span>
          </div>
          <form class="widget-form" data-knowledge-form>
            <label class="widget-field">
              <span>Title</span>
              <input type="text" name="title" placeholder="Insight headline" required />
            </label>
            <label class="widget-field">
              <span>Link or context</span>
              <input type="url" name="url" placeholder="https://" />
            </label>
            <div class="widget-form__actions">
              <button type="submit" class="btn">Pin insight</button>
            </div>
          </form>
        </section>
        <section class="widget-app__panel knowledge-widget__board" aria-live="polite">
          <div class="widget-app__panel-header">
            <h3>Knowledge feed</h3>
            <span class="knowledge-widget__status" data-knowledge-count>No entries</span>
          </div>
          <ol class="knowledge-widget__list" data-knowledge-list></ol>
        </section>
      </div>
    `,
  });
  const form = widget.querySelector('[data-knowledge-form]');
  const list = widget.querySelector('[data-knowledge-list]');
  const countEl = widget.querySelector('[data-knowledge-count]');
  if (form && list) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const title = form.querySelector('[name="title"]').value.trim();
      const url = form.querySelector('[name="url"]').value.trim();
      if (!title) return;
      const item = document.createElement('li');
      if (url) {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = title;
        item.appendChild(link);
      } else {
        item.textContent = title;
      }
      list.appendChild(item);
      form.reset();
      if (countEl) {
        const total = list.querySelectorAll('li').length;
        countEl.textContent = total === 0 ? 'No entries' : `${total} insight${total === 1 ? '' : 's'}`;
      }
    });
  }
  return widget;
}

const widgetBlueprints = {
  image: { title: 'Image studio', width: 480, height: 520, offset: { left: 120, top: 60 } },
  video: { title: 'Video lab', width: 560, height: 560, offset: { left: 220, top: 120 } },
  world: { title: '3D world creator', width: 560, height: 460, offset: { left: 260, top: 160 } },
  agent: { title: 'Agents roster', width: 520, height: 420, offset: { left: 120, top: 200 } },
  code: { title: 'Code sandbox', width: 540, height: 520, offset: { left: 300, top: 200 } },
  document: { title: 'Document writer', width: 480, height: 500, offset: { left: 360, top: 140 } },
  presentation: { title: 'Presentation builder', width: 500, height: 520, offset: { left: 420, top: 220 } },
  data: { title: 'Data visualizer', width: 500, height: 480, offset: { left: 340, top: 260 } },
  game: { title: 'Game builder', width: 520, height: 520, offset: { left: 260, top: 300 } },
  avatar: { title: 'Avatar creator', width: 460, height: 480, offset: { left: 220, top: 340 } },
  simulation: { title: 'Simulation sandbox', width: 520, height: 460, offset: { left: 420, top: 320 } },
  whiteboard: { title: 'Collaboration whiteboard', width: 540, height: 500, offset: { left: 380, top: 360 } },
  knowledge: { title: 'Knowledge board', width: 500, height: 500, offset: { left: 440, top: 380 } },
};

const widgetFactories = {
  image: createImageWidget,
  video: createVideoWidget,
  world: createWorldWidget,
  agent: createAgentWidget,
  code: createCodeWidget,
  document: createDocumentWidget,
  presentation: createPresentationWidget,
  data: createDataWidget,
  game: createGameWidget,
  avatar: createAvatarWidget,
  simulation: createSimulationWidget,
  whiteboard: createWhiteboardWidget,
  knowledge: createKnowledgeWidget,
};

const persistableWidgetTypes = new Set(Object.keys(widgetFactories));

function renderWidget(record) {
  if (!record) return null;
  const factory = widgetFactories[record.widget_type];
  if (!factory) return null;
  const existing = canvasContentEl?.querySelector(
    `.widget[data-widget-id="${record.id}"]`
  );
  if (existing) {
    return existing;
  }
  return factory(record);
}

async function loadWidgets() {
  try {
    const widgets = await fetchJSON('/api/widgets');
    state.widgets = widgets;
    widgets.forEach((record) => {
      renderWidget(record);
    });
  } catch (error) {
    console.error(error);
  }
}

async function createPersistedWidget(type) {
  const blueprint = widgetBlueprints[type];
  if (!blueprint) return;
  const base = nextWidgetPosition();
  const offset = blueprint.offset || { left: 0, top: 0 };
  const payload = {
    widget_type: type,
    title: blueprint.title,
    width: blueprint.width,
    height: blueprint.height,
    position_left: base.left + offset.left,
    position_top: base.top + offset.top,
  };
  try {
    const record = await fetchJSON('/api/widgets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    renderWidget(record);
  } catch (error) {
    console.error(error);
    alert('Unable to create widget. Check the server logs.');
  }
}

async function persistWidgetState(widget) {
  if (!widget) return;
  const widgetId = widget.dataset.widgetId;
  if (!widgetId) return;
  const payload = {
    width: parseFloat(widget.style.width) || widget.offsetWidth,
    height: parseFloat(widget.style.height) || widget.offsetHeight,
    position_left: parseFloat(widget.style.left) || widget.offsetLeft,
    position_top: parseFloat(widget.style.top) || widget.offsetTop,
  };
  try {
    const record = await fetchJSON(`/api/widgets/${widgetId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    upsertWidgetState(record);
  } catch (error) {
    console.error(error);
  }
}

async function deleteWidgetRecord(widgetId) {
  if (!widgetId) return;
  try {
    await fetchJSON(`/api/widgets/${widgetId}`, { method: 'DELETE' });
    removeWidgetFromState(Number(widgetId));
  } catch (error) {
    console.error(error);
  }
}

function removeWidgetFromState(widgetId) {
  const index = state.widgets.findIndex((item) => item.id === Number(widgetId));
  if (index >= 0) {
    state.widgets.splice(index, 1);
  }
}

async function sendMessage(event) {
  event.preventDefault();
  if (!chatInputEl || !chatThreadEl || !modelSelectEl) {
    return;
  }
  if (!state.currentConversationId) {
    await createConversation();
    if (!state.currentConversationId) return;
  }
  const content = chatInputEl.value.trim();
  if (!content) return;

  const conversationId = state.currentConversationId;
  const localMessage = { role: 'user', content };
  state.messages[conversationId] = [...(state.messages[conversationId] || []), localMessage];
  renderMessages(conversationId);
  chatInputEl.value = '';

  try {
    const response = await fetchJSON(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, model: modelSelectEl.value }),
    });
    state.messages[conversationId] = [
      ...state.messages[conversationId].slice(0, -1),
      response.user_message,
      response.assistant_message,
    ];
    renderMessages(conversationId);
  } catch (error) {
    console.error(error);
    alert('Unable to reach the OpenAI backend. Check your server logs.');
  }
}

function filterAssets() {
  const search = state.filters.feedSearch.toLowerCase();
  const type = state.filters.feedType;
  return state.assets.filter((asset) => {
    const searchable = `${asset.title || ''} ${asset.description || ''}`.toLowerCase();
    const matchesSearch = !search || searchable.includes(search);
    const matchesType = type === 'all' || asset.asset_type === type;
    return matchesSearch && matchesType;
  });
}

function renderGallery() {
  const assets = filterAssets();
  galleryEl.innerHTML = '';
  if (!assets.length) {
    const empty = document.createElement('p');
    empty.className = 'gallery-card__meta';
    empty.textContent = 'No assets yet. Use the Studio to generate new visuals.';
    galleryEl.appendChild(empty);
    return;
  }

  assets.forEach((asset) => {
    const card = document.createElement('article');
    card.className = 'gallery-card';

    const mediaWrapper = document.createElement(asset.asset_type === 'video' ? 'video' : 'img');
    const thumbnail = asset.metadata?.thumbnail_url;
    mediaWrapper.src = asset.asset_type === 'video' ? asset.url : asset.url;
    if (asset.asset_type === 'video') {
      mediaWrapper.controls = true;
      mediaWrapper.muted = true;
      mediaWrapper.loop = true;
      mediaWrapper.playsInline = true;
      mediaWrapper.setAttribute('playsinline', '');
      if (thumbnail) {
        mediaWrapper.poster = thumbnail;
      }
    } else {
      mediaWrapper.alt = asset.title;
    }
    card.appendChild(mediaWrapper);

    const content = document.createElement('div');
    content.className = 'gallery-card__content';

    const title = document.createElement('h3');
    title.className = 'gallery-card__title';
    title.textContent = asset.title || 'Untitled asset';

    const meta = document.createElement('p');
    meta.className = 'gallery-card__meta';
    meta.textContent = asset.description || 'Generated asset';

    const actions = document.createElement('div');
    actions.className = 'gallery-card__actions';

    const gallerySelect = document.createElement('select');
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Add to gallery…';
    gallerySelect.appendChild(defaultOption);
    state.galleries.forEach((gallery) => {
      const option = document.createElement('option');
      option.value = String(gallery.id);
      option.textContent = gallery.name;
      gallerySelect.appendChild(option);
    });

    const addButton = document.createElement('button');
    addButton.className = 'btn';
    addButton.type = 'button';
    addButton.textContent = 'Add';
    addButton.addEventListener('click', async () => {
      const galleryId = Number(gallerySelect.value);
      if (!galleryId) return;
      addButton.disabled = true;
      addButton.textContent = 'Adding…';
      try {
        await fetchJSON(`/api/galleries/${galleryId}/assets`, {
          method: 'POST',
          body: JSON.stringify({ asset_id: asset.id }),
        });
        await loadGalleries();
        addButton.textContent = 'Added';
      } catch (error) {
        console.error(error);
        alert('Unable to add asset to gallery.');
        addButton.textContent = 'Add';
      } finally {
        addButton.disabled = false;
        gallerySelect.value = '';
        setTimeout(() => {
          addButton.textContent = 'Add';
        }, 1500);
      }
    });

    actions.appendChild(gallerySelect);
    actions.appendChild(addButton);

    content.appendChild(title);
    content.appendChild(meta);
    if (state.galleries.length) {
      content.appendChild(actions);
    }
    card.appendChild(content);
    galleryEl.appendChild(card);
  });
}

function renderImageWidgetGalleries() {
  const widgets = document.querySelectorAll('[data-widget-type="image"]');
  const images = state.assets.filter((asset) => asset.asset_type === 'image');
  widgets.forEach((widget) => {
    const gallery = widget.querySelector('[data-image-widget-gallery]');
    const emptyEl = widget.querySelector('[data-image-widget-empty]');
    if (!gallery) return;
    gallery.innerHTML = '';
    const items = images.slice(0, 6);
    if (!items.length) {
      if (emptyEl) emptyEl.removeAttribute('hidden');
      return;
    }
    if (emptyEl) emptyEl.setAttribute('hidden', 'hidden');
    items.forEach((asset) => {
      const figure = document.createElement('figure');
      figure.className = 'image-widget__item';

      const img = document.createElement('img');
      img.src = asset.url;
      img.alt = asset.title || 'Generated image';
      img.loading = 'lazy';

      const caption = document.createElement('figcaption');
      caption.className = 'image-widget__caption';

      const title = document.createElement('strong');
      title.textContent = asset.title || 'Untitled render';

      const meta = document.createElement('span');
      meta.textContent = asset.description || 'AI-generated visual';

      caption.appendChild(title);
      caption.appendChild(meta);
      figure.appendChild(img);
      figure.appendChild(caption);
      gallery.appendChild(figure);
    });
  });
}

function renderVideoWidgetReels() {
  const widgets = document.querySelectorAll('[data-widget-type="video"]');
  const videos = state.assets.filter((asset) => asset.asset_type === 'video');
  widgets.forEach((widget) => {
    const gallery = widget.querySelector('[data-video-widget-gallery]');
    const emptyEl = widget.querySelector('[data-video-widget-empty]');
    if (!gallery) return;
    gallery.innerHTML = '';
    const items = videos.slice(0, 4);
    if (!items.length) {
      if (emptyEl) emptyEl.removeAttribute('hidden');
      return;
    }
    if (emptyEl) emptyEl.setAttribute('hidden', 'hidden');
    items.forEach((asset) => {
      const card = document.createElement('article');
      card.className = 'video-widget__item';

      const media = document.createElement('video');
      media.src = asset.url;
      media.muted = true;
      media.loop = true;
      media.playsInline = true;
      media.setAttribute('playsinline', '');
      media.preload = 'metadata';
      media.autoplay = true;
      const thumbnail = asset.metadata?.thumbnail_url;
      if (thumbnail) {
        media.poster = thumbnail;
      }

      const content = document.createElement('div');
      content.className = 'video-widget__caption';

      const title = document.createElement('strong');
      title.textContent = asset.title || 'Storyboard clip';

      const details = document.createElement('span');
      const duration = asset.metadata?.duration_seconds;
      const ratio = asset.metadata?.aspect_ratio;
      const metaParts = [
        duration ? `${duration}s` : null,
        ratio ? `AR ${ratio}` : null,
      ].filter(Boolean);
      details.textContent = asset.description || metaParts.join(' · ') || 'Preview';

      content.appendChild(title);
      content.appendChild(details);

      card.appendChild(media);
      card.appendChild(content);
      gallery.appendChild(card);
    });
  });
}

async function loadGallery() {
  const assets = await fetchJSON('/api/gallery');
  state.assets = assets;
  syncComposerSelection();
  renderGallery();
  renderImageWidgetGalleries();
  renderVideoWidgetReels();
  renderComposerLibrary();
  renderComposerTimeline();
  renderStudioPreview();
}

function toggleStudio(open) {
  const isOpen = open ?? !studioEl.classList.contains('is-open');
  if (isOpen) {
    studioEl.classList.add('is-open');
    studioEl.setAttribute('aria-hidden', 'false');
  } else {
    studioEl.classList.remove('is-open');
    studioEl.setAttribute('aria-hidden', 'true');
  }
}

function setStudioView(view) {
  studioNavButtons.forEach((button) => {
    const isMatch = button.dataset.view === view;
    button.classList.toggle('is-active', isMatch);
    const target = document.querySelector(`.studio-view[data-view="${button.dataset.view}"]`);
    if (target) {
      target.classList.toggle('is-active', target.dataset.view === view);
    }
  });
}

function syncDurationVisibility() {
  const type = studioAssetTypeEl.value;
  studioDurationField.style.display = type === 'video' ? 'block' : 'none';
}

function setStudioStatus(stateName, message) {
  if (!studioStatusEl) return;
  studioStatusEl.textContent = message || '';
  studioStatusEl.classList.remove('is-loading', 'is-success', 'is-error');
  if (stateName) {
    studioStatusEl.classList.add(`is-${stateName}`);
  }
}

function renderStudioPreview() {
  if (!studioPreviewEl) return;
  studioPreviewEl.innerHTML = '';

  if (!state.assets.length) {
    const empty = document.createElement('p');
    empty.className = 'studio-preview__meta';
    empty.textContent = 'Generate an asset to see a quick preview here.';
    studioPreviewEl.appendChild(empty);
    return;
  }

  const latest = state.assets[0];
  const card = document.createElement('article');
  card.className = 'studio-preview__card';

  let media;
  if (latest.asset_type === 'video') {
    media = document.createElement('video');
    media.src = latest.url;
    media.className = 'studio-preview__media';
    media.muted = true;
    media.loop = true;
    media.autoplay = true;
    media.playsInline = true;
  } else {
    media = document.createElement('img');
    media.src = latest.url;
    media.alt = latest.title || 'Generated asset';
    media.className = 'studio-preview__media';
  }

  const title = document.createElement('h4');
  title.className = 'studio-preview__title';
  title.textContent = latest.title || 'Generated asset';

  const meta = document.createElement('p');
  meta.className = 'studio-preview__meta';
  meta.textContent =
    latest.description ||
    `Saved to feed • ${latest.asset_type === 'video' ? 'Video' : 'Image'} asset`;

  card.appendChild(media);
  card.appendChild(title);
  card.appendChild(meta);
  studioPreviewEl.appendChild(card);
}

async function handleGenerateAsset(event) {
  event.preventDefault();
  const prompt = studioPromptEl.value.trim();
  if (!prompt) return;
  const type = studioAssetTypeEl.value;
  const submitButton = studioGenerateForm.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;
  setStudioStatus(
    'loading',
    type === 'video' ? 'Generating video storyboard…' : 'Generating image asset…'
  );
  try {
    if (type === 'video') {
      await fetchJSON('/api/videos', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          aspect_ratio: studioAspectEl.value,
          duration_seconds: Number(studioDurationEl.value) || 8,
          quality: studioQualityEl.value,
        }),
      });
    } else {
      await fetchJSON('/api/images', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          size: studioSizeEl.value,
          quality: studioQualityEl.value,
          aspect_ratio: studioAspectEl.value,
        }),
      });
    }
    studioGenerateForm.reset();
    studioAssetTypeEl.value = 'image';
    studioSizeEl.value = '1024x1024';
    studioAspectEl.value = '1:1';
    studioQualityEl.value = 'high';
    studioDurationEl.value = 8;
    syncDurationVisibility();
    await loadGallery();
    await loadGalleries();
    setStudioStatus('success', 'Asset saved to the feed.');
  } catch (error) {
    console.error(error);
    setStudioStatus('error', 'Generation failed. Check your API configuration.');
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

async function loadGalleries() {
  const galleries = await fetchJSON('/api/galleries');
  state.galleries = galleries;
  syncComposerSelection();
  populateGalleryFilter();
  renderGallery();
  renderImageWidgetGalleries();
  renderVideoWidgetReels();
  renderStudioGalleries();
  renderComposerLibrary();
  populateComposerSources();
}

function renderAgentWidgets() {
  const widgets = document.querySelectorAll('[data-widget-type="agent"]');
  widgets.forEach((widget) => {
    const listEl = widget.querySelector('[data-agent-widget-list]');
    const emptyEl = widget.querySelector('[data-agent-widget-empty]');
    const countEl = widget.querySelector('[data-agent-widget-count]');
    const planEl = widget.querySelector('[data-agent-widget-plan]');
    const statusEl = widget.querySelector('[data-agent-widget-status]');
    if (!listEl) return;
    listEl.innerHTML = '';
    if (countEl) {
      const total = state.agents.length;
      countEl.textContent = total.toString();
    }
    if (planEl) {
      planEl.textContent = state.agentPlan ? '1' : '0';
    }
    if (statusEl) {
      statusEl.textContent = state.agents.length
        ? 'Monitoring automation teammates in real time.'
        : 'Launch your first automation teammate to see activity here.';
    }
    if (!state.agents.length) {
      if (emptyEl) emptyEl.removeAttribute('hidden');
      return;
    }
    if (emptyEl) emptyEl.setAttribute('hidden', 'hidden');
    state.agents.slice(0, 4).forEach((agent) => {
      const item = document.createElement('li');
      item.className = 'agents-widget__item';

      const title = document.createElement('h4');
      title.textContent = agent.name;

      const meta = document.createElement('p');
      meta.className = 'agents-widget__meta';
      meta.textContent = agent.mission;

      item.appendChild(title);
      item.appendChild(meta);
      listEl.appendChild(item);
    });
  });
}

function renderAgentsList() {
  if (agentsCountEl) {
    const total = state.agents.length;
    agentsCountEl.textContent = total === 1 ? '1 active' : `${total} active`;
  }
  if (!agentsListEl) return;
  agentsListEl.innerHTML = '';

  if (!state.agents.length) {
    const empty = document.createElement('li');
    empty.className = 'agents-empty';
    empty.textContent = 'No agents yet. Use the AI builder to create your first teammate.';
    agentsListEl.appendChild(empty);
    return;
  }

  state.agents.forEach((agent) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'agents-list__item';
    if (agent.id === state.currentAgentId) {
      button.classList.add('is-active');
    }

    const title = document.createElement('h4');
    title.textContent = agent.name;

    const summary = document.createElement('p');
    summary.textContent = agent.mission;

    button.appendChild(title);
    button.appendChild(summary);
    button.addEventListener('click', () => selectAgent(agent.id));
    item.appendChild(button);
    agentsListEl.appendChild(item);
  });
}

function selectAgent(agentId) {
  state.currentAgentId = agentId;
  renderAgentsList();
  renderAgentDetail();
}

function prefillBuilderFromAgent(agent) {
  if (!agentBuilderPromptEl) return;
  const sections = [
    `Name: ${agent.name}`,
    `Mission: ${agent.mission}`,
    `Instructions: ${agent.instructions}`,
    agent.capabilities?.length ? `Capabilities: ${agent.capabilities.join(', ')}` : null,
    agent.tools?.length ? `Tools: ${agent.tools.join(', ')}` : null,
    agent.workflow ? `Workflow:\n${agent.workflow}` : null,
  ].filter(Boolean);
  agentBuilderPromptEl.value = `Refine this agent to make it more impactful:\n${sections.join('\n')}`;
  if (agentBuilderContextEl) {
    agentBuilderContextEl.value = agent.workflow || '';
  }
  state.agentPlan = null;
  renderAgentPlan();
  agentBuilderPromptEl.focus();
  agentBuilderPromptEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderAgentDetail() {
  if (!agentDetailPanelEl) return;
  agentDetailPanelEl.innerHTML = '';

  if (!state.agents.length) {
    const empty = document.createElement('div');
    empty.className = 'agents-empty';
    empty.textContent = 'Blueprint an agent with the AI builder to start orchestrating work.';
    agentDetailPanelEl.appendChild(empty);
    return;
  }

  let agent = state.agents.find((item) => item.id === state.currentAgentId);
  if (!agent) {
    agent = state.agents[0];
    state.currentAgentId = agent.id;
  }

  const header = document.createElement('div');
  header.className = 'agents-detail__header';
  const title = document.createElement('h3');
  title.textContent = agent.name;
  const refineButton = document.createElement('button');
  refineButton.type = 'button';
  refineButton.className = 'btn btn--ghost btn--sm';
  refineButton.textContent = 'Edit with AI';
  refineButton.addEventListener('click', () => prefillBuilderFromAgent(agent));
  header.appendChild(title);
  header.appendChild(refineButton);

  const mission = document.createElement('p');
  mission.className = 'agents-detail__meta';
  mission.textContent = agent.mission;

  const form = document.createElement('form');
  form.className = 'agents-detail__form';
  form.dataset.agentId = String(agent.id);

  const nameRow = document.createElement('div');
  nameRow.className = 'agents-detail__row';
  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'Agent name';
  const nameInput = document.createElement('input');
  nameInput.name = 'name';
  nameInput.value = agent.name;
  nameRow.appendChild(nameLabel);
  nameRow.appendChild(nameInput);

  const missionRow = document.createElement('div');
  missionRow.className = 'agents-detail__row';
  const missionLabel = document.createElement('label');
  missionLabel.textContent = 'Mission';
  const missionInput = document.createElement('textarea');
  missionInput.name = 'mission';
  missionInput.value = agent.mission;
  missionRow.appendChild(missionLabel);
  missionRow.appendChild(missionInput);

  const instructionsRow = document.createElement('div');
  instructionsRow.className = 'agents-detail__row';
  const instructionsLabel = document.createElement('label');
  instructionsLabel.textContent = 'System instructions';
  const instructionsInput = document.createElement('textarea');
  instructionsInput.name = 'instructions';
  instructionsInput.value = agent.instructions;
  instructionsRow.appendChild(instructionsLabel);
  instructionsRow.appendChild(instructionsInput);

  const capabilitiesRow = document.createElement('div');
  capabilitiesRow.className = 'agents-detail__row';
  const capabilitiesLabel = document.createElement('label');
  capabilitiesLabel.textContent = 'Capabilities (one per line)';
  const capabilitiesInput = document.createElement('textarea');
  capabilitiesInput.name = 'capabilities';
  capabilitiesInput.value = (agent.capabilities || []).join('\n');
  capabilitiesRow.appendChild(capabilitiesLabel);
  capabilitiesRow.appendChild(capabilitiesInput);

  const toolsRow = document.createElement('div');
  toolsRow.className = 'agents-detail__row';
  const toolsLabel = document.createElement('label');
  toolsLabel.textContent = 'Tools (one per line)';
  const toolsInput = document.createElement('textarea');
  toolsInput.name = 'tools';
  toolsInput.value = (agent.tools || []).join('\n');
  toolsRow.appendChild(toolsLabel);
  toolsRow.appendChild(toolsInput);

  const workflowRow = document.createElement('div');
  workflowRow.className = 'agents-detail__row';
  const workflowLabel = document.createElement('label');
  workflowLabel.textContent = 'Workflow';
  const workflowInput = document.createElement('textarea');
  workflowInput.name = 'workflow';
  workflowInput.value = agent.workflow || '';
  workflowRow.appendChild(workflowLabel);
  workflowRow.appendChild(workflowInput);

  const actions = document.createElement('div');
  actions.className = 'agents-detail__actions';
  const saveButton = document.createElement('button');
  saveButton.type = 'submit';
  saveButton.className = 'btn btn--primary';
  saveButton.textContent = 'Save changes';
  const status = document.createElement('span');
  status.className = 'agents-status';
  status.dataset.agentStatus = 'true';
  actions.appendChild(saveButton);
  actions.appendChild(status);

  form.appendChild(nameRow);
  form.appendChild(missionRow);
  form.appendChild(instructionsRow);
  form.appendChild(capabilitiesRow);
  form.appendChild(toolsRow);
  form.appendChild(workflowRow);
  form.appendChild(actions);
  form.addEventListener('submit', handleAgentUpdate);

  agentDetailPanelEl.appendChild(header);
  agentDetailPanelEl.appendChild(mission);
  agentDetailPanelEl.appendChild(form);
}

function renderAgentPlan() {
  if (!agentPlanEl || !agentPlanNameEl || !agentPlanDetailsEl) return;
  if (!state.agentPlan) {
    agentPlanEl.hidden = true;
    agentPlanNameEl.textContent = '';
    agentPlanDetailsEl.innerHTML = '';
    if (agentPlanSaveBtn) agentPlanSaveBtn.disabled = true;
    return;
  }

  const plan = state.agentPlan;
  agentPlanEl.hidden = false;
  agentPlanNameEl.textContent = plan.name;
  agentPlanDetailsEl.innerHTML = '';

  const entries = [
    ['Mission', plan.mission],
    ['Instructions', plan.instructions],
    [
      'Capabilities',
      plan.capabilities?.length ? `• ${plan.capabilities.join('\n• ')}` : 'None provided',
    ],
    ['Tools', plan.tools?.length ? `• ${plan.tools.join('\n• ')}` : 'None provided'],
    ['Workflow', plan.workflow || '—'],
    ['Rationale', plan.rationale || '—'],
  ];

  entries.forEach(([label, value]) => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    agentPlanDetailsEl.appendChild(dt);
    agentPlanDetailsEl.appendChild(dd);
  });

  if (agentPlanSaveBtn) agentPlanSaveBtn.disabled = false;
}

function clearAgentPlan() {
  state.agentPlan = null;
  renderAgentPlan();
}

async function handleAgentBuild(event) {
  event.preventDefault();
  const prompt = agentBuilderPromptEl?.value.trim();
  if (!prompt) return;
  const context = agentBuilderContextEl?.value.trim();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  if (agentBuilderStatusEl) {
    agentBuilderStatusEl.classList.remove('is-success', 'is-error');
    agentBuilderStatusEl.classList.add('is-loading');
    agentBuilderStatusEl.textContent = 'Generating agent plan…';
  }
  if (submitButton) submitButton.disabled = true;
  try {
    const payload = { prompt };
    if (context) payload.context = context;
    const response = await fetchJSON('/api/agents/build', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    state.agentPlan = response.plan;
    renderAgentPlan();
    if (agentBuilderStatusEl) {
      agentBuilderStatusEl.classList.remove('is-loading', 'is-error');
      agentBuilderStatusEl.classList.add('is-success');
      agentBuilderStatusEl.textContent = 'Plan ready — review and save below.';
    }
  } catch (error) {
    console.error(error);
    if (agentBuilderStatusEl) {
      agentBuilderStatusEl.classList.remove('is-loading', 'is-success');
      agentBuilderStatusEl.classList.add('is-error');
      agentBuilderStatusEl.textContent = 'Unable to generate plan. Check your API configuration.';
    }
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

async function handleAgentPlanSave() {
  if (!state.agentPlan) return;
  if (agentPlanSaveBtn) agentPlanSaveBtn.disabled = true;
  if (agentBuilderStatusEl) {
    agentBuilderStatusEl.classList.remove('is-success', 'is-error');
    agentBuilderStatusEl.classList.add('is-loading');
    agentBuilderStatusEl.textContent = 'Saving agent…';
  }
  try {
    const plan = state.agentPlan;
    const payload = {
      name: plan.name,
      mission: plan.mission,
      instructions: plan.instructions,
      capabilities: plan.capabilities || [],
      tools: plan.tools || [],
      workflow: plan.workflow || null,
    };
    const agent = await fetchJSON('/api/agents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    state.currentAgentId = agent.id;
    clearAgentPlan();
    if (agentBuilderStatusEl) {
      agentBuilderStatusEl.classList.remove('is-loading');
      agentBuilderStatusEl.classList.add('is-success');
      agentBuilderStatusEl.textContent = 'Agent saved to your workspace.';
    }
    await loadAgents();
  } catch (error) {
    console.error(error);
    if (agentBuilderStatusEl) {
      agentBuilderStatusEl.classList.remove('is-loading', 'is-success');
      agentBuilderStatusEl.classList.add('is-error');
      agentBuilderStatusEl.textContent = 'Unable to save agent. Please try again.';
    }
  } finally {
    if (agentPlanSaveBtn) agentPlanSaveBtn.disabled = false;
  }
}

function handleAgentPlanDismiss() {
  clearAgentPlan();
  if (agentBuilderStatusEl) {
    agentBuilderStatusEl.classList.remove('is-loading', 'is-error', 'is-success');
    agentBuilderStatusEl.textContent = '';
  }
}

function handleAgentBuilderClear() {
  if (agentBuilderForm) {
    agentBuilderForm.reset();
  }
  clearAgentPlan();
  if (agentBuilderStatusEl) {
    agentBuilderStatusEl.classList.remove('is-loading', 'is-success', 'is-error');
    agentBuilderStatusEl.textContent = '';
  }
}

function focusAgentBuilder() {
  if (!agentBuilderPromptEl) return;
  agentBuilderPromptEl.focus();
  agentBuilderPromptEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function handleAgentUpdate(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const agentId = Number(form.dataset.agentId);
  if (!agentId) return;

  const submitButton = form.querySelector('button[type="submit"]');
  const status = form.querySelector('[data-agent-status]');
  if (status) {
    status.classList.remove('is-success', 'is-error');
    status.classList.add('is-loading');
    status.textContent = 'Saving changes…';
  }
  if (submitButton) submitButton.disabled = true;

  const getValue = (name) => {
    const field = form.querySelector(`[name="${name}"]`);
    return field ? field.value.trim() : '';
  };

  const splitValues = (name) =>
    getValue(name)
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

  try {
    const payload = {
      name: getValue('name'),
      mission: getValue('mission'),
      instructions: getValue('instructions'),
      capabilities: splitValues('capabilities'),
      tools: splitValues('tools'),
      workflow: getValue('workflow') || null,
    };
    const updated = await fetchJSON(`/api/agents/${agentId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    state.agents = state.agents.map((agent) =>
      agent.id === updated.id ? updated : agent
    );
    state.currentAgentId = updated.id;
    renderAgentsList();
    renderAgentDetail();
    renderAgentWidgets();
    if (status) {
      status.classList.remove('is-loading', 'is-error');
      status.classList.add('is-success');
      status.textContent = 'Updated';
    }
  } catch (error) {
    console.error(error);
    if (status) {
      status.classList.remove('is-loading', 'is-success');
      status.classList.add('is-error');
      status.textContent = 'Update failed';
    }
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

async function loadAgents() {
  if (!agentsPanelEl) return;
  try {
    const agents = await fetchJSON('/api/agents');
    state.agents = agents;
    if (!agents.length) {
      state.currentAgentId = null;
    } else if (!state.currentAgentId || !agents.some((agent) => agent.id === state.currentAgentId)) {
      state.currentAgentId = agents[0].id;
    }
    renderAgentsList();
    renderAgentDetail();
    renderAgentWidgets();
  } catch (error) {
    console.error(error);
    if (agentsCountEl) {
      agentsCountEl.textContent = 'Error';
    }
  }
}

function populateGalleryFilter() {
  const categories = new Set(['all']);
  state.galleries.forEach((gallery) => {
    if (gallery.category) categories.add(gallery.category.toLowerCase());
  });
  const previousValue = state.filters.galleryCategory;
  studioGalleryFilterEl.innerHTML = '';
  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category === 'all' ? 'All categories' : category;
    studioGalleryFilterEl.appendChild(option);
  });
  if (categories.has(previousValue)) {
    studioGalleryFilterEl.value = previousValue;
  } else {
    studioGalleryFilterEl.value = 'all';
    state.filters.galleryCategory = 'all';
  }
}

function populateComposerSources() {
  const existingValue = composerGallerySelectEl.value;
  composerGallerySelectEl.innerHTML = '';
  const feedOption = document.createElement('option');
  feedOption.value = 'feed';
  feedOption.textContent = 'Main feed';
  composerGallerySelectEl.appendChild(feedOption);
  state.galleries.forEach((gallery) => {
    const option = document.createElement('option');
    option.value = String(gallery.id);
    option.textContent = gallery.name;
    composerGallerySelectEl.appendChild(option);
  });
  if (
    existingValue &&
    (existingValue === 'feed' || state.galleries.some((gallery) => String(gallery.id) === existingValue))
  ) {
    composerGallerySelectEl.value = existingValue;
    state.composer.source = existingValue;
  } else {
    composerGallerySelectEl.value = 'feed';
    state.composer.source = 'feed';
  }
}

function renderStudioGalleries() {
  const search = state.filters.gallerySearch.toLowerCase();
  const category = state.filters.galleryCategory;
  studioGalleryListEl.innerHTML = '';
  const filtered = state.galleries.filter((gallery) => {
    const matchesSearch =
      !search ||
      gallery.name.toLowerCase().includes(search) ||
      (gallery.description || '').toLowerCase().includes(search);
    const matchesCategory =
      category === 'all' || (gallery.category || '').toLowerCase() === category;
    return matchesSearch && matchesCategory;
  });

  if (!filtered.length) {
    const empty = document.createElement('p');
    empty.className = 'studio-gallery-card__meta';
    empty.textContent = 'No galleries yet. Create one to curate your campaigns.';
    studioGalleryListEl.appendChild(empty);
    return;
  }

  filtered.forEach((gallery) => {
    const card = document.createElement('article');
    card.className = 'studio-gallery-card';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.gap = '0.75rem';

    const title = document.createElement('h4');
    title.textContent = gallery.name;
    title.style.margin = '0';

    const swatch = document.createElement('span');
    swatch.className = 'studio-gallery-card__swatch';
    if (gallery.accent_color) {
      swatch.style.background = gallery.accent_color;
    }
    header.appendChild(title);
    header.appendChild(swatch);

    const chip = document.createElement('span');
    chip.className = 'studio-gallery-card__chip';
    chip.textContent = (gallery.category || 'Uncategorised').toUpperCase();
    if (gallery.accent_color) {
      chip.style.background = `${gallery.accent_color}33`;
      chip.style.color = gallery.accent_color;
    }

    const description = document.createElement('p');
    description.className = 'studio-gallery-card__meta';
    description.textContent =
      gallery.description || 'Fully editable and ready to showcase your creative direction.';

    const stats = document.createElement('p');
    stats.className = 'studio-gallery-card__meta';
    stats.textContent = `Assets: ${gallery.asset_count} • Layout: ${gallery.layout || 'grid'}`;

    const actions = document.createElement('div');
    actions.className = 'studio-gallery-card__actions';

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = gallery.accent_color || '#10a37f';
    colorInput.addEventListener('input', async (event) => {
      try {
        await fetchJSON(`/api/galleries/${gallery.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ accent_color: event.target.value }),
        });
        await loadGalleries();
      } catch (error) {
        console.error(error);
        alert('Unable to update accent color.');
      }
    });

    const layoutSelect = document.createElement('select');
    ['grid', 'masonry', 'filmstrip'].forEach((layout) => {
      const option = document.createElement('option');
      option.value = layout;
      option.textContent = layout.charAt(0).toUpperCase() + layout.slice(1);
      layoutSelect.appendChild(option);
    });
    layoutSelect.value = gallery.layout || 'grid';
    layoutSelect.addEventListener('change', async (event) => {
      try {
        await fetchJSON(`/api/galleries/${gallery.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ layout: event.target.value }),
        });
        await loadGalleries();
      } catch (error) {
        console.error(error);
        alert('Unable to update layout.');
      }
    });

    const renameButton = document.createElement('button');
    renameButton.type = 'button';
    renameButton.textContent = 'Edit details';
    renameButton.addEventListener('click', async () => {
      const name = prompt('Gallery name', gallery.name) || gallery.name;
      const descriptionValue = prompt('Gallery description', gallery.description || '') || gallery.description;
      const categoryValue = prompt('Gallery category', gallery.category || '') || gallery.category;
      try {
        await fetchJSON(`/api/galleries/${gallery.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name,
            description: descriptionValue,
            category: categoryValue,
          }),
        });
        await loadGalleries();
      } catch (error) {
        console.error(error);
        alert('Unable to update gallery.');
      }
    });

    actions.appendChild(colorInput);
    actions.appendChild(layoutSelect);
    actions.appendChild(renameButton);

    card.appendChild(header);
    card.appendChild(chip);
    card.appendChild(description);
    card.appendChild(stats);
    card.appendChild(actions);
    studioGalleryListEl.appendChild(card);
  });
}

function getComposerSourceAssets() {
  if (state.composer.source === 'feed') {
    return state.assets;
  }
  const gallery = state.galleries.find((item) => String(item.id) === state.composer.source);
  return gallery ? gallery.assets : [];
}

function renderComposerLibrary() {
  if (!composerLibraryEl) return;
  const assets = getComposerSourceAssets();
  composerLibraryEl.innerHTML = '';
  assets.forEach((asset) => {
    const tile = document.createElement('div');
    tile.className = 'studio-composer__tile';
    if (state.composer.selectedAssets.some((item) => item.id === asset.id)) {
      tile.classList.add('is-selected');
    }
    const media = document.createElement(asset.asset_type === 'video' ? 'video' : 'img');
    if (asset.asset_type === 'video') {
      media.src = asset.url;
      media.muted = true;
      media.loop = true;
      media.playsInline = true;
      media.setAttribute('playsinline', '');
      if (asset.metadata?.thumbnail_url) {
        media.poster = asset.metadata.thumbnail_url;
      }
    } else {
      media.src = asset.url;
    }
    tile.appendChild(media);

    const caption = document.createElement('span');
    caption.textContent = asset.title || 'Untitled';
    tile.appendChild(caption);

    tile.addEventListener('click', () => {
      const alreadySelected = state.composer.selectedAssets.some((item) => item.id === asset.id);
      if (alreadySelected) {
        state.composer.selectedAssets = state.composer.selectedAssets.filter(
          (item) => item.id !== asset.id,
        );
      } else {
        state.composer.selectedAssets = [...state.composer.selectedAssets, asset];
      }
      renderComposerLibrary();
      renderComposerTimeline();
    });

    composerLibraryEl.appendChild(tile);
  });
}

function moveComposerAsset(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= state.composer.selectedAssets.length) return;
  const updated = [...state.composer.selectedAssets];
  const [removed] = updated.splice(index, 1);
  updated.splice(newIndex, 0, removed);
  state.composer.selectedAssets = updated;
  renderComposerTimeline();
}

function renderComposerTimeline() {
  if (!composerTimelineEl) return;
  composerTimelineEl.innerHTML = '';
  if (!state.composer.selectedAssets.length) {
    const empty = document.createElement('li');
    empty.className = 'studio-gallery-card__meta';
    empty.textContent = 'Select imagery or clips to build your montage.';
    composerTimelineEl.appendChild(empty);
    composerRenderBtn.disabled = true;
    return;
  }

  state.composer.selectedAssets.forEach((asset, index) => {
    const item = document.createElement('li');
    item.className = 'studio-composer__timeline-item';

    const thumb = document.createElement('div');
    thumb.className = 'timeline-thumb';
    const thumbMedia = document.createElement(asset.asset_type === 'video' ? 'video' : 'img');
    if (asset.asset_type === 'video') {
      thumbMedia.src = asset.url;
      thumbMedia.muted = true;
      thumbMedia.playsInline = true;
      thumbMedia.setAttribute('playsinline', '');
      if (asset.metadata?.thumbnail_url) {
        thumbMedia.poster = asset.metadata.thumbnail_url;
      }
    } else {
      thumbMedia.src = asset.url;
    }
    thumb.appendChild(thumbMedia);

    const label = document.createElement('span');
    label.textContent = `${index + 1}. ${asset.title}`;

    const upButton = document.createElement('button');
    upButton.type = 'button';
    upButton.textContent = '▲';
    upButton.addEventListener('click', () => moveComposerAsset(index, -1));

    const downButton = document.createElement('button');
    downButton.type = 'button';
    downButton.textContent = '▼';
    downButton.addEventListener('click', () => moveComposerAsset(index, 1));

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => {
      state.composer.selectedAssets = state.composer.selectedAssets.filter((item) => item.id !== asset.id);
      renderComposerTimeline();
      renderComposerLibrary();
    });

    item.appendChild(thumb);
    item.appendChild(label);
    item.appendChild(upButton);
    item.appendChild(downButton);
    item.appendChild(removeButton);
    composerTimelineEl.appendChild(item);
  });

  composerRenderBtn.disabled = false;
}

function syncComposerSelection() {
  const assetMap = new Map();
  state.assets.forEach((asset) => assetMap.set(asset.id, asset));
  state.galleries.forEach((gallery) => {
    (gallery.assets || []).forEach((asset) => assetMap.set(asset.id, asset));
  });
  state.composer.selectedAssets = state.composer.selectedAssets
    .map((asset) => assetMap.get(asset.id) || asset)
    .filter((asset) => Boolean(assetMap.get(asset.id)));
}

async function handleCreateGallery(event) {
  event.preventDefault();
  const name = studioGalleryNameEl.value.trim();
  if (!name) return;
  try {
    await fetchJSON('/api/galleries', {
      method: 'POST',
      body: JSON.stringify({
        name,
        category: studioGalleryCategoryEl.value.trim() || null,
        accent_color: studioGalleryColorEl.value,
        layout: studioGalleryLayoutEl.value,
        description: studioGalleryDescriptionEl.value.trim() || null,
      }),
    });
    studioGalleryForm.reset();
    studioGalleryColorEl.value = '#10a37f';
    studioGalleryLayoutEl.value = 'grid';
    await loadGalleries();
  } catch (error) {
    console.error(error);
    alert('Unable to create gallery.');
  }
}

async function handleComposerRender() {
  if (!state.composer.selectedAssets.length) return;
  composerRenderBtn.disabled = true;
  composerRenderBtn.textContent = 'Rendering…';
  try {
    await fetchJSON('/api/studio/render', {
      method: 'POST',
      body: JSON.stringify({
        title: composerTitleEl.value || 'Studio montage',
        orientation: composerOrientationEl.value,
        asset_ids: state.composer.selectedAssets.map((asset) => asset.id),
        description: composerDescriptionEl.value || undefined,
      }),
    });
    state.composer.selectedAssets = [];
    composerTitleEl.value = '';
    composerDescriptionEl.value = '';
    await loadGallery();
    await loadGalleries();
  } catch (error) {
    console.error(error);
    alert('Unable to render video.');
  } finally {
    composerRenderBtn.disabled = false;
    composerRenderBtn.textContent = 'Render final video';
    renderComposerTimeline();
    renderComposerLibrary();
  }
}

function handleComposerSourceChange(event) {
  state.composer.source = event.target.value;
  renderComposerLibrary();
}

function handleFeedSearch(event) {
  state.filters.feedSearch = event.target.value;
  renderGallery();
}

function handleFeedTypeChange(event) {
  state.filters.feedType = event.target.value;
  renderGallery();
}

function handleGallerySearch(event) {
  state.filters.gallerySearch = event.target.value;
  renderStudioGalleries();
}

function handleGalleryFilter(event) {
  state.filters.galleryCategory = event.target.value;
  renderStudioGalleries();
}

function initialiseStudioNavigation() {
  studioNavButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setStudioView(button.dataset.view);
    });
  });
  setStudioView('generate');
}

function setCanvasScale(scale) {
  const bounded = Math.min(2, Math.max(0.5, scale));
  state.canvasScale = bounded;
  if (canvasContentEl) {
    canvasContentEl.style.transform = `scale(${bounded})`;
  }
  if (zoomIndicatorEl) {
    zoomIndicatorEl.textContent = `${Math.round(bounded * 100)}%`;
  }
}

function handleZoomButton(event) {
  const action = event.currentTarget.dataset.zoom;
  if (action === 'in') {
    setCanvasScale(state.canvasScale * 1.1);
  } else if (action === 'out') {
    setCanvasScale(state.canvasScale * 0.9);
  } else if (action === 'reset') {
    setCanvasScale(1);
  }
}

function handleCanvasWheel(event) {
  if (!canvasWrapperEl) return;
  event.preventDefault();
  const direction = event.deltaY > 0 ? 0.97 : 1.03;
  setCanvasScale(state.canvasScale * direction);
}

function setDropdownOpen(isOpen) {
  if (!dropdownEl) return;
  dropdownEl.classList.toggle('is-open', isOpen);
  const menu = dropdownEl.querySelector('.dropdown__menu');
  if (menu) {
    menu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  }
  if (addWidgetBtn) {
    addWidgetBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }
}

function toggleDropdown() {
  if (!dropdownEl) return;
  const isOpen = dropdownEl.classList.contains('is-open');
  setDropdownOpen(!isOpen);
}

function handleDocumentClick(event) {
  if (dropdownEl && !dropdownEl.contains(event.target)) {
    setDropdownOpen(false);
  }
}

function handleAddWidget(type) {
  if (type === 'chat') {
    createChatWidget();
    return;
  }
  if (!persistableWidgetTypes.has(type)) return;
  createPersistedWidget(type);
}

function handleAddWidgetOption(event) {
  const type = event.currentTarget.dataset.widgetType;
  if (!type) return;
  handleAddWidget(type);
  setDropdownOpen(false);
}

function handleWidgetAction(event) {
  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) return;
  const widget = actionButton.closest('.widget');
  if (!widget) return;
  const action = actionButton.dataset.action;
  if (action === 'minimize') {
    widget.classList.toggle('is-minimized');
  } else if (action === 'close') {
    if (widget.dataset.lockClose === 'true') return;
    if (widget.id === 'widget-chat') {
      unbindChatWorkspace();
    }
    const widgetId = widget.dataset.widgetId;
    widget.remove();
    if (widgetId) {
      deleteWidgetRecord(widgetId);
    }
  }
}

function handlePointerDown(event) {
  if (!canvasContentEl || event.button !== 0) return;
  const widget = event.target.closest('.widget');
  if (!widget) return;
  focusWidget(widget);
  const resizeHandle = event.target.closest('[data-resize]');
  if (resizeHandle) {
    event.preventDefault();
    pointerInteraction = {
      type: 'resize',
      widget,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialWidth: widget.offsetWidth,
      initialHeight: widget.offsetHeight,
    };
    widget.setPointerCapture(event.pointerId);
    return;
  }

  const toolbar = event.target.closest('.widget__toolbar');
  const dragHandle = event.target.closest('[data-drag-handle]');
  if (dragHandle && !toolbar) {
    event.preventDefault();
    pointerInteraction = {
      type: 'drag',
      widget,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialLeft: parseFloat(widget.style.left) || widget.offsetLeft,
      initialTop: parseFloat(widget.style.top) || widget.offsetTop,
    };
    widget.setPointerCapture(event.pointerId);
  }
}

function handlePointerMove(event) {
  if (!pointerInteraction || event.pointerId !== pointerInteraction.pointerId) return;
  const scale = state.canvasScale || 1;
  if (pointerInteraction.type === 'drag') {
    const deltaX = (event.clientX - pointerInteraction.startX) / scale;
    const deltaY = (event.clientY - pointerInteraction.startY) / scale;
    pointerInteraction.widget.style.left = `${pointerInteraction.initialLeft + deltaX}px`;
    pointerInteraction.widget.style.top = `${pointerInteraction.initialTop + deltaY}px`;
  } else if (pointerInteraction.type === 'resize') {
    const deltaX = (event.clientX - pointerInteraction.startX) / scale;
    const deltaY = (event.clientY - pointerInteraction.startY) / scale;
    const width = Math.max(280, pointerInteraction.initialWidth + deltaX);
    const height = Math.max(220, pointerInteraction.initialHeight + deltaY);
    pointerInteraction.widget.style.width = `${width}px`;
    pointerInteraction.widget.style.height = `${height}px`;
  }
}

function handlePointerUp(event) {
  if (!pointerInteraction || event.pointerId !== pointerInteraction.pointerId) return;
  if (pointerInteraction.widget) {
    try {
      pointerInteraction.widget.releasePointerCapture(pointerInteraction.pointerId);
    } catch (error) {
      // Pointer might already be released if the widget was removed.
    }
    if (pointerInteraction.type === 'drag' || pointerInteraction.type === 'resize') {
      persistWidgetState(pointerInteraction.widget);
    }
  }
  pointerInteraction = null;
}

function toggleAgents(open) {
  if (!agentsPanelEl) return;
  const isOpen = open ?? !agentsPanelEl.classList.contains('is-open');
  agentsPanelEl.classList.toggle('is-open', Boolean(isOpen));
  agentsPanelEl.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  if (isOpen) {
    loadAgents();
  }
}

function toggleAudio(open) {
  if (!audioPanelEl) return;
  const isOpen = open ?? !audioPanelEl.classList.contains('is-open');
  audioPanelEl.classList.toggle('is-open', Boolean(isOpen));
  audioPanelEl.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  if (isOpen) {
    loadAudioTracks();
  }
}

function formatDuration(seconds) {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins) {
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  }
  return `${secs}s`;
}

function renderAudioGallery() {
  if (!audioGalleryEl) return;
  audioGalleryEl.innerHTML = '';
  if (!state.audioTracks.length) {
    const empty = document.createElement('p');
    empty.className = 'audio-gallery__empty';
    empty.textContent = 'No audio yet. Compose something with the generator to fill this space.';
    audioGalleryEl.appendChild(empty);
  } else {
    state.audioTracks.forEach((track) => {
      const card = document.createElement('article');
      card.className = 'audio-card';
      const player = document.createElement('audio');
      player.controls = true;
      player.src = track.url;
      player.preload = 'none';
      card.appendChild(player);

      const content = document.createElement('div');
      content.className = 'audio-card__content';

      const title = document.createElement('h3');
      title.textContent = track.title;
      content.appendChild(title);

      const meta = document.createElement('p');
      meta.className = 'audio-card__meta';
      const parts = [track.track_type];
      if (track.style) parts.push(track.style);
      if (track.voice) parts.push(`voice: ${track.voice}`);
      if (track.duration_seconds) parts.push(formatDuration(track.duration_seconds));
      meta.textContent = parts.filter(Boolean).join(' • ');
      content.appendChild(meta);

      if (track.description) {
        const description = document.createElement('p');
        description.className = 'audio-card__description';
        description.textContent = track.description;
        content.appendChild(description);
      }

      card.appendChild(content);
      audioGalleryEl.appendChild(card);
    });
  }
  if (audioCountEl) {
    const count = state.audioTracks.length;
    audioCountEl.textContent = `${count} ${count === 1 ? 'track' : 'tracks'}`;
  }
}

async function loadAudioTracks() {
  try {
    const tracks = await fetchJSON('/api/audio-tracks');
    state.audioTracks = tracks;
    renderAudioGallery();
  } catch (error) {
    console.error(error);
    if (audioStatusEl) {
      audioStatusEl.textContent = 'Unable to load audio library.';
    }
  }
}

async function handleAudioGenerate(event) {
  event.preventDefault();
  if (!audioFormEl) return;
  const title = audioTitleEl?.value.trim();
  const prompt = audioPromptEl?.value.trim();
  if (!title || !prompt) return;
  const payload = {
    title,
    prompt,
    style: audioStyleEl?.value ? audioStyleEl.value.trim() : null,
    voice: audioVoiceEl?.value ? audioVoiceEl.value.trim() : null,
    track_type: audioTypeEl?.value || 'music',
    duration_seconds: audioDurationEl?.value ? Number(audioDurationEl.value) : null,
  };
  if (audioStatusEl) {
    audioStatusEl.textContent = 'Generating audio…';
    audioStatusEl.classList.remove('is-error', 'is-success');
  }
  try {
    const track = await fetchJSON('/api/audio-tracks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    state.audioTracks = [track, ...(state.audioTracks || [])];
    renderAudioGallery();
    audioFormEl.reset();
    if (audioStatusEl) {
      audioStatusEl.textContent = 'Track created! Ready for playback.';
      audioStatusEl.classList.add('is-success');
    }
  } catch (error) {
    console.error(error);
    if (audioStatusEl) {
      audioStatusEl.textContent = 'Audio generation failed. Check your ElevenLabs settings.';
      audioStatusEl.classList.add('is-error');
    }
  }
}

function initialiseWidgets() {
  if (!canvasContentEl) return;
  canvasContentEl.querySelectorAll('.widget').forEach((widget) => {
    widgetZIndex += 1;
    widget.style.zIndex = String(widgetZIndex);
  });
}

if (newConversationBtn) {
  newConversationBtn.addEventListener('click', createConversation);
}

if (feedSearchEl) {
  feedSearchEl.addEventListener('input', handleFeedSearch);
}

if (feedTypeFilterEl) {
  feedTypeFilterEl.addEventListener('change', handleFeedTypeChange);
}

if (studioToggleBtn) {
  studioToggleBtn.addEventListener('click', () => toggleStudio(true));
}

if (studioCloseBtn) {
  studioCloseBtn.addEventListener('click', () => toggleStudio(false));
}

if (studioGenerateForm) {
  studioGenerateForm.addEventListener('submit', handleGenerateAsset);
}

if (studioAssetTypeEl) {
  studioAssetTypeEl.addEventListener('change', () => {
    syncDurationVisibility();
  });
}

if (studioGalleryForm) {
  studioGalleryForm.addEventListener('submit', handleCreateGallery);
}

if (studioGallerySearchEl) {
  studioGallerySearchEl.addEventListener('input', handleGallerySearch);
}

if (studioGalleryFilterEl) {
  studioGalleryFilterEl.addEventListener('change', handleGalleryFilter);
}

if (composerGallerySelectEl) {
  composerGallerySelectEl.addEventListener('change', handleComposerSourceChange);
}

if (composerRenderBtn) {
  composerRenderBtn.addEventListener('click', handleComposerRender);
}

if (composerClearBtn) {
  composerClearBtn.addEventListener('click', () => {
    state.composer.selectedAssets = [];
    renderComposerTimeline();
    renderComposerLibrary();
  });
}

zoomButtons.forEach((button) => {
  button.addEventListener('click', handleZoomButton);
});

if (addWidgetBtn) {
  addWidgetBtn.addEventListener('click', toggleDropdown);
}

addWidgetOptions.forEach((option) => {
  option.addEventListener('click', handleAddWidgetOption);
});

if (canvasContentEl) {
  canvasContentEl.addEventListener('pointerdown', handlePointerDown);
  canvasContentEl.addEventListener('click', handleWidgetAction);
}

if (canvasWrapperEl) {
  canvasWrapperEl.addEventListener('wheel', handleCanvasWheel, { passive: false });
}

window.addEventListener('pointermove', handlePointerMove);
window.addEventListener('pointerup', handlePointerUp);

document.addEventListener('click', handleDocumentClick);

if (agentsToggleBtn) {
  agentsToggleBtn.addEventListener('click', () => toggleAgents(true));
}

if (agentsCloseBtn) {
  agentsCloseBtn.addEventListener('click', () => toggleAgents(false));
}

if (audioToggleBtn) {
  audioToggleBtn.addEventListener('click', () => toggleAudio(true));
}

if (audioCloseBtn) {
  audioCloseBtn.addEventListener('click', () => toggleAudio(false));
}

if (audioFormEl) {
  audioFormEl.addEventListener('submit', handleAudioGenerate);
}

if (agentBuilderForm) {
  agentBuilderForm.addEventListener('submit', handleAgentBuild);
}

if (agentBuilderClearBtn) {
  agentBuilderClearBtn.addEventListener('click', handleAgentBuilderClear);
}

if (agentPlanSaveBtn) {
  agentPlanSaveBtn.addEventListener('click', handleAgentPlanSave);
}

if (agentPlanDismissBtn) {
  agentPlanDismissBtn.addEventListener('click', handleAgentPlanDismiss);
}

if (agentNewFromPlanBtn) {
  agentNewFromPlanBtn.addEventListener('click', () => {
    focusAgentBuilder();
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (studioEl && studioEl.classList.contains('is-open')) {
      toggleStudio(false);
      return;
    }
    if (agentsPanelEl && agentsPanelEl.classList.contains('is-open')) {
      toggleAgents(false);
      return;
    }
    if (audioPanelEl && audioPanelEl.classList.contains('is-open')) {
      toggleAudio(false);
      return;
    }
    setDropdownOpen(false);
  }
});

initialiseStudioNavigation();
bindChatWorkspace();
initialiseWidgets();
setCanvasScale(state.canvasScale);
syncDurationVisibility();
renderAgentPlan();
loadConversations();
loadWidgets();
loadGallery();
loadGalleries();
loadAgents();
