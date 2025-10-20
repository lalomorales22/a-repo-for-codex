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
  dataCatalog: null,
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
const dataPanelEl = document.getElementById('data');
const dataToggleBtn = document.getElementById('data-toggle');
const dataCloseBtn = document.getElementById('data-close');
const dataSummaryEl = document.getElementById('data-summary');
const dataCatalogEl = document.getElementById('data-catalog');
const dataStatusEl = document.getElementById('data-status');
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
let zoomHoldTimeout = null;
let zoomHoldInterval = null;
let zoomHoldButton = null;

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
    
    // Create editable title element
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'conversation-list__title-input';
    titleInput.value = conversation.title;
    titleInput.readOnly = true;
    titleInput.addEventListener('click', () => {
      console.log('Conversation clicked:', conversation.id, conversation.title);
      openConversationWidget(conversation.id);
    });
    
    // Double-click to edit
    titleInput.addEventListener('dblclick', (event) => {
      event.stopPropagation();
      titleInput.readOnly = false;
      titleInput.focus();
      titleInput.select();
    });
    
    // Save on blur or Enter
    const saveEdit = async () => {
      const newTitle = titleInput.value.trim();
      if (newTitle && newTitle !== conversation.title) {
        try {
          const updated = await fetchJSON(`/api/conversations/${conversation.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ title: newTitle }),
          });
          if (updated) {
            conversation.title = newTitle;
            state.conversations.sort(
              (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
            );
          }
        } catch (error) {
          console.error(error);
          titleInput.value = conversation.title; // Revert on error
        }
      } else {
        titleInput.value = conversation.title; // Revert if empty
      }
      titleInput.readOnly = true;
    };
    
    titleInput.addEventListener('blur', saveEdit);
    titleInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        titleInput.blur();
      } else if (event.key === 'Escape') {
        titleInput.value = conversation.title;
        titleInput.readOnly = true;
        titleInput.blur();
      }
    });

    const actions = document.createElement('div');
    actions.className = 'conversation-list__actions';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'conversation-list__btn';
    deleteButton.title = 'Delete conversation';
    deleteButton.setAttribute('aria-label', `Delete ${conversation.title}`);
    deleteButton.textContent = '🗑';
    deleteButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      await deleteConversation(conversation.id);
    });

    actions.appendChild(deleteButton);
    li.appendChild(titleInput);
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
  console.log('createConversation called');
  // Create with default name, user can edit inline
  const timestamp = new Date().toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  const title = `New conversation (${timestamp})`;
  console.log('Creating conversation with title:', title);
  
  const conversation = await fetchJSON('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
  console.log('Conversation created:', conversation);
  state.conversations.unshift(conversation);
  renderConversations();
  await selectConversation(conversation.id);
  
  // Open the conversation in its own widget
  console.log('Opening conversation widget...');
  openConversationWidget(conversation.id);
}

// Inline editing is now handled directly in renderConversations()
// This function is kept for backwards compatibility but is no longer used
async function editConversation(conversationId) {
  // No-op - editing is done inline now
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

async function openConversationWidget(conversationId) {
  console.log('openConversationWidget called with ID:', conversationId);
  const conversation = state.conversations.find((c) => c.id === conversationId);
  if (!conversation) {
    console.error('Conversation not found:', conversationId);
    return;
  }
  console.log('Found conversation:', conversation);
  
  // Check if widget already exists for this conversation
  const existingWidget = document.getElementById(`widget-conversation-${conversationId}`);
  if (existingWidget) {
    console.log('Widget already exists, focusing:', existingWidget.id);
    existingWidget.classList.remove('is-minimized');
    existingWidget.hidden = false;
    focusWidget(existingWidget);
    return existingWidget;
  }
  
  console.log('Creating new widget for conversation:', conversationId);
  
  // Load messages for this conversation
  await selectConversation(conversationId);
  
  // Create new widget for this conversation
  const widget = document.createElement('section');
  widget.id = `widget-conversation-${conversationId}`;
  widget.dataset.widget = '';
  widget.dataset.widgetType = 'conversation';
  widget.dataset.conversationId = conversationId;
  widget.className = 'widget';
  
  const position = nextWidgetPosition();
  widget.style.width = '520px';
  widget.style.height = '520px';
  widget.style.left = `${position.left}px`;
  widget.style.top = `${position.top}px`;
  
  widget.innerHTML = `
    <header class="widget__header" data-drag-handle>
      <h2 class="widget__title">${conversation.title}</h2>
      <div class="widget__toolbar">
        <button class="widget__icon" data-action="minimize" type="button" aria-label="Minimize">▭</button>
        <button class="widget__icon" data-action="close" type="button" aria-label="Close">✕</button>
      </div>
    </header>
    <div class="widget__body">
      <div class="chat-thread" data-conversation-thread></div>
      <form class="chat-form" data-conversation-form>
        <textarea
          data-conversation-input
          placeholder="Ask anything about your next product milestone..."
        ></textarea>
        <div class="chat-form__controls">
          <select data-conversation-model>
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
  
  console.log('Mounting widget...');
  mountWidget(widget);
  console.log('Widget mounted successfully');
  
  // Bind the chat functionality for this specific conversation
  const form = widget.querySelector('[data-conversation-form]');
  const input = widget.querySelector('[data-conversation-input]');
  const thread = widget.querySelector('[data-conversation-thread]');
  const modelSelect = widget.querySelector('[data-conversation-model]');
  
  // Render existing messages
  renderMessagesInThread(thread, conversationId);
  
  // Handle form submission
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const userMessage = input.value.trim();
    if (!userMessage) return;
    
    input.value = '';
    input.disabled = true;
    
    try {
      const model = modelSelect.value;
      const response = await fetchJSON(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: userMessage, model }),
      });
      
      // Update state with new messages
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      state.messages[conversationId].push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: response.response }
      );
      
      // Re-render messages in this specific thread
      renderMessagesInThread(thread, conversationId);
    } catch (error) {
      console.error(error);
      alert('Failed to send message.');
    } finally {
      input.disabled = false;
      input.focus();
    }
  });
  
  return widget;
}

function renderMessagesInThread(threadEl, conversationId) {
  if (!threadEl) return;
  const messages = state.messages[conversationId] || [];
  threadEl.innerHTML = '';
  
  if (!messages.length) {
    const placeholder = document.createElement('div');
    placeholder.className = 'message message--assistant';
    placeholder.textContent = 'No messages yet. Ask a question to start the conversation.';
    threadEl.appendChild(placeholder);
    return;
  }

  messages.forEach((message) => {
    const bubble = document.createElement('div');
    bubble.classList.add('message');
    bubble.classList.add(message.role === 'user' ? 'message--user' : 'message--assistant');
    bubble.innerText = message.content;
    threadEl.appendChild(bubble);
  });

  threadEl.scrollTop = threadEl.scrollHeight;
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
    width: 640,
    height: 560,
    offset: { left: 300, top: 200 },
    body: `
      <div class="code-widget code-widget--ide">
        <aside class="code-widget__sidebar" aria-label="Project explorer">
          <div class="code-widget__section">
            <label class="code-widget__label">
              <span>Project</span>
              <select class="code-widget__select" data-code-project aria-label="Select project"></select>
            </label>
          </div>
          <div class="code-widget__section">
            <h3>Files</h3>
            <div class="code-widget__files" data-code-files>
              <p class="code-widget__empty">Loading files…</p>
            </div>
          </div>
          <form class="code-widget__new-file" data-code-new-file>
            <input type="text" name="path" placeholder="folder/new_file.py" required />
            <select name="language">
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="markdown">Markdown</option>
              <option value="text">Plain text</option>
            </select>
            <button type="submit" class="btn btn--ghost btn--sm">Add file</button>
          </form>
        </aside>
        <section class="code-widget__workspace" aria-label="Editor workspace">
          <header class="code-widget__header">
            <div>
              <h3 data-code-file-name>Choose a file</h3>
              <span class="code-widget__status" data-code-status>Workspace initialising</span>
            </div>
            <div class="code-widget__header-actions">
              <label class="code-widget__label">
                <span>Language</span>
                <select data-code-language>
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="markdown">Markdown</option>
                  <option value="text">Plain text</option>
                </select>
              </label>
              <button type="button" class="btn btn--primary btn--sm" data-code-save disabled>Save file</button>
            </div>
          </header>
          <textarea
            class="code-widget__editor"
            data-code-editor
            placeholder="Select a file to start editing"
            disabled
            spellcheck="false"
          ></textarea>
          <div class="code-widget__actions">
            <form class="code-widget__ai-form" data-code-ai-form>
              <label class="code-widget__label">
                <span>Ask AI for help</span>
                <textarea name="prompt" rows="2" placeholder="Generate integration tests…" required></textarea>
              </label>
              <div class="code-widget__ai-actions">
                <button type="submit" class="btn btn--primary btn--sm">Generate</button>
              </div>
            </form>
            <div class="code-widget__ai-meta">
              <span class="code-widget__environment" data-code-env>Sandbox idle</span>
              <button type="button" class="btn btn--ghost btn--sm" data-code-apply disabled>Apply suggestion</button>
            </div>
          </div>
          <section class="code-widget__console" aria-live="polite">
            <header class="code-widget__console-header">
              <h4>AI console</h4>
            </header>
            <pre data-code-output>// Awaiting prompt.</pre>
          </section>
        </section>
      </div>
    `,
  });

  const projectSelect = widget.querySelector('[data-code-project]');
  const filesContainer = widget.querySelector('[data-code-files]');
  const newFileForm = widget.querySelector('[data-code-new-file]');
  const editor = widget.querySelector('[data-code-editor]');
  const saveButton = widget.querySelector('[data-code-save]');
  const statusEl = widget.querySelector('[data-code-status]');
  const fileNameEl = widget.querySelector('[data-code-file-name]');
  const languageSelect = widget.querySelector('[data-code-language]');
  const envIndicator = widget.querySelector('[data-code-env]');
  const aiForm = widget.querySelector('[data-code-ai-form]');
  const aiOutput = widget.querySelector('[data-code-output]');
  const applyButton = widget.querySelector('[data-code-apply]');

  let projects = [];
  let files = [];
  let currentProjectId = null;
  let currentFile = null;
  let pendingSuggestion = null;
  let isDirty = false;

  const languageGuess = (path) => {
    if (!path) return 'text';
    if (path.endsWith('.py')) return 'python';
    if (path.endsWith('.js')) return 'javascript';
    if (path.endsWith('.md')) return 'markdown';
    return 'text';
  };

  const setStatus = (text) => {
    if (statusEl) {
      statusEl.textContent = text;
    }
  };

  const markDirty = () => {
    if (!currentFile || !saveButton) return;
    isDirty = true;
    saveButton.disabled = false;
    setStatus('Unsaved changes');
  };

  const clearSuggestion = () => {
    pendingSuggestion = null;
    if (applyButton) {
      applyButton.disabled = true;
    }
    if (aiOutput) {
      aiOutput.textContent = '// Awaiting prompt.';
    }
  };

  const renderFileList = () => {
    if (!filesContainer) return;
    filesContainer.innerHTML = '';
    if (!files.length) {
      const empty = document.createElement('p');
      empty.className = 'code-widget__empty';
      empty.textContent = 'No files yet — add one to begin.';
      filesContainer.appendChild(empty);
      return;
    }
    const list = document.createElement('ul');
    list.className = 'code-widget__file-list';
    files.forEach((file) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'code-widget__file';
      button.dataset.fileId = String(file.id);
      button.textContent = file.path;
      if (currentFile && currentFile.id === file.id) {
        button.classList.add('is-active');
      }
      button.addEventListener('click', () => selectFile(file.id));
      item.appendChild(button);
      list.appendChild(item);
    });
    filesContainer.appendChild(list);
  };

  const selectFile = (fileId) => {
    const next = files.find((file) => file.id === Number(fileId));
    if (!next) return;
    currentFile = { ...next };
    if (editor) {
      editor.value = next.content || '';
      editor.disabled = false;
      editor.focus();
    }
    if (fileNameEl) {
      fileNameEl.textContent = next.path;
    }
    if (languageSelect) {
      languageSelect.value = next.language || languageGuess(next.path);
    }
    if (saveButton) {
      saveButton.disabled = true;
    }
    isDirty = false;
    setStatus('Viewing saved file');
    clearSuggestion();
    renderFileList();
  };

  const updateFileInState = (updated) => {
    const index = files.findIndex((file) => file.id === updated.id);
    if (index >= 0) {
      files[index] = updated;
    } else {
      files.push(updated);
    }
  };

  const loadFiles = async (projectId) => {
    if (!projectId) return;
    setStatus('Loading files…');
    try {
      const response = await fetchJSON(`/api/code/projects/${projectId}/files`);
      files = response;
      renderFileList();
      if (files.length) {
        const existing = files.find((file) => currentFile && file.id === currentFile.id);
        selectFile(existing ? existing.id : files[0].id);
      } else {
        if (editor) {
          editor.value = '';
          editor.disabled = true;
        }
        if (fileNameEl) {
          fileNameEl.textContent = 'Create a file';
        }
        clearSuggestion();
        setStatus('Add a file to begin editing');
      }
    } catch (error) {
      console.error(error);
      setStatus('Unable to load files');
    }
  };

  const renderProjects = (items) => {
    if (!projectSelect) return;
    projectSelect.innerHTML = '';
    items.forEach((project) => {
      const option = document.createElement('option');
      option.value = String(project.id);
      option.textContent = `${project.name} (${project.file_count})`;
      projectSelect.appendChild(option);
    });
    if (!items.length) {
      const option = document.createElement('option');
      option.textContent = 'No projects';
      option.disabled = true;
      projectSelect.appendChild(option);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await fetchJSON('/api/code/projects');
      projects = response;
      renderProjects(projects);
      if (projects.length) {
        if (!currentProjectId) {
          currentProjectId = projects[0].id;
        }
        if (projectSelect) {
          projectSelect.value = String(currentProjectId);
        }
        await loadFiles(currentProjectId);
        setStatus('Project synced');
      }
    } catch (error) {
      console.error(error);
      setStatus('Unable to load project');
    }
  };

  if (editor) {
    editor.addEventListener('input', markDirty);
  }
  if (languageSelect) {
    languageSelect.addEventListener('change', markDirty);
  }
  if (projectSelect) {
    projectSelect.addEventListener('change', async (event) => {
      currentProjectId = Number(event.target.value);
      await loadFiles(currentProjectId);
    });
  }
  if (newFileForm) {
    newFileForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!currentProjectId) return;
      const formData = new FormData(newFileForm);
      const path = String(formData.get('path') || '').trim();
      const language = String(formData.get('language') || 'text');
      if (!path) return;
      try {
        const file = await fetchJSON(`/api/code/projects/${currentProjectId}/files`, {
          method: 'POST',
          body: JSON.stringify({ path, language }),
        });
        updateFileInState(file);
        renderFileList();
        selectFile(file.id);
        newFileForm.reset();
        setStatus(`Created ${file.path}`);
      } catch (error) {
        console.error(error);
        alert('Unable to create file. Check server logs for details.');
      }
    });
  }
  if (saveButton) {
    saveButton.addEventListener('click', async () => {
      if (!currentProjectId || !currentFile || !editor) return;
      try {
        const payload = {
          content: editor.value,
          language: languageSelect ? languageSelect.value : currentFile.language,
        };
        const updated = await fetchJSON(
          `/api/code/projects/${currentProjectId}/files/${currentFile.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify(payload),
          },
        );
        updateFileInState(updated);
        currentFile = { ...updated };
        if (saveButton) saveButton.disabled = true;
        isDirty = false;
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setStatus(`Saved • ${timestamp}`);
        if (envIndicator) {
          envIndicator.textContent = `Saved ${timestamp}`;
        }
        renderFileList();
      } catch (error) {
        console.error(error);
        alert('Unable to save file.');
      }
    });
  }
  if (aiForm) {
    aiForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!currentProjectId) {
        alert('Select a project before requesting code suggestions.');
        return;
      }
      const formData = new FormData(aiForm);
      const prompt = String(formData.get('prompt') || '').trim();
      if (!prompt) return;
      try {
        setStatus('Generating suggestion…');
        if (envIndicator) {
          envIndicator.textContent = 'Generating…';
        }
        const response = await fetchJSON(`/api/code/projects/${currentProjectId}/generate`, {
          method: 'POST',
          body: JSON.stringify({
            prompt,
            language: languageSelect ? languageSelect.value : null,
            context: editor && editor.value ? editor.value.slice(-2000) : null,
            file_path: currentFile ? currentFile.path : null,
          }),
        });
        pendingSuggestion = response;
        if (aiOutput) {
          aiOutput.textContent = `${response.code || '// No code generated.'}\n\n// ${response.explanation || 'No explanation provided.'}`;
        }
        if (applyButton) {
          applyButton.disabled = !response.code;
        }
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (envIndicator) {
          envIndicator.textContent = `${response.model || 'ai'} • ${timestamp}`;
        }
        setStatus('Suggestion ready');
        aiForm.reset();
      } catch (error) {
        console.error(error);
        setStatus('Unable to generate suggestion');
        if (envIndicator) {
          envIndicator.textContent = 'AI unavailable';
        }
      }
    });
  }
  if (applyButton) {
    applyButton.addEventListener('click', () => {
      if (!pendingSuggestion || !pendingSuggestion.code || !editor) return;
      editor.value = pendingSuggestion.code;
      markDirty();
      setStatus('Applied AI suggestion. Review and save.');
    });
  }

  loadProjects();

  return widget;
}

function createDocumentWidget(record) {
  const widget = buildWidgetShell('document', record, {
    title: 'Document writer',
    width: 620,
    height: 520,
    offset: { left: 360, top: 140 },
    body: `
      <div class="document-widget document-widget--upgraded">
        <section class="document-widget__inputs" aria-label="Draft brief">
          <div class="widget-app__panel-header">
            <h3>Brief</h3>
            <span class="document-widget__badge" data-document-status>Awaiting details</span>
          </div>
          <form class="document-widget__form" data-document-form>
            <label class="document-widget__field">
              <span>Topic</span>
              <input type="text" name="topic" placeholder="Launch strategy memo" required />
            </label>
            <label class="document-widget__field">
              <span>Audience</span>
              <input type="text" name="audience" placeholder="Executive team" required />
            </label>
            <label class="document-widget__field">
              <span>Tone</span>
              <select name="tone">
                <option value="pragmatic" selected>Pragmatic</option>
                <option value="inspirational">Inspirational</option>
                <option value="analytical">Analytical</option>
              </select>
            </label>
            <label class="document-widget__field">
              <span>Key points</span>
              <textarea name="keypoints" rows="4" placeholder="Differentiated insight\nRisk mitigation plan"></textarea>
            </label>
            <div class="document-widget__actions">
              <button type="submit" class="btn btn--primary">Draft with AI</button>
            </div>
          </form>
        </section>
        <section class="document-widget__output" aria-live="polite">
          <article class="document-widget__summary">
            <h3 data-document-title>Strategy brief</h3>
            <p class="document-widget__summary-text" data-document-summary>
              Provide a topic and audience to generate a tailored memo.
            </p>
          </article>
          <div class="document-widget__grid">
            <div class="document-widget__outline">
              <h4>Outline</h4>
              <ol class="document-widget__outline-list" data-document-outline>
                <li class="document-widget__placeholder">Outline will populate after generation.</li>
              </ol>
            </div>
            <div class="document-widget__cta">
              <h4>Call to action</h4>
              <ul class="document-widget__cta-list" data-document-cta>
                <li class="document-widget__placeholder">Actions will appear here.</li>
              </ul>
            </div>
          </div>
          <div class="document-widget__sections" data-document-sections></div>
        </section>
      </div>
    `,
  });

  const form = widget.querySelector('[data-document-form]');
  const statusEl = widget.querySelector('[data-document-status]');
  const titleEl = widget.querySelector('[data-document-title]');
  const summaryEl = widget.querySelector('[data-document-summary]');
  const outlineEl = widget.querySelector('[data-document-outline]');
  const ctaEl = widget.querySelector('[data-document-cta]');
  const sectionsEl = widget.querySelector('[data-document-sections]');

  const setStatus = (text) => {
    if (statusEl) {
      statusEl.textContent = text;
    }
  };

  const renderList = (container, items, emptyMessage) => {
    if (!container) return;
    container.innerHTML = '';
    if (!items || !items.length) {
      const placeholder = document.createElement('li');
      placeholder.className = 'document-widget__placeholder';
      placeholder.textContent = emptyMessage;
      container.appendChild(placeholder);
      return;
    }
    items.forEach((item) => {
      const listItem = document.createElement(container.tagName === 'OL' ? 'li' : 'li');
      listItem.textContent = item;
      container.appendChild(listItem);
    });
  };

  const renderSections = (sections) => {
    if (!sectionsEl) return;
    sectionsEl.innerHTML = '';
    if (!sections || !sections.length) {
      const placeholder = document.createElement('p');
      placeholder.className = 'document-widget__placeholder';
      placeholder.textContent = 'Add more context to generate section drafts.';
      sectionsEl.appendChild(placeholder);
      return;
    }
    sections.forEach((section) => {
      const card = document.createElement('article');
      card.className = 'document-widget__section-card';
      const heading = document.createElement('h4');
      heading.textContent = section.heading;
      const paragraph = document.createElement('p');
      paragraph.textContent = section.content;
      card.appendChild(heading);
      card.appendChild(paragraph);
      sectionsEl.appendChild(card);
    });
  };

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const topic = String(formData.get('topic') || '').trim();
      const audience = String(formData.get('audience') || '').trim();
      const tone = String(formData.get('tone') || 'pragmatic');
      const keypointsRaw = String(formData.get('keypoints') || '');
      const keyPoints = keypointsRaw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      if (!topic || !audience) return;

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      setStatus('Drafting with AI…');

      try {
        const response = await fetchJSON('/api/document/draft', {
          method: 'POST',
          body: JSON.stringify({ topic, audience, tone, key_points: keyPoints }),
        });
        if (titleEl) titleEl.textContent = response.title;
        if (summaryEl) summaryEl.textContent = response.summary;
        renderList(outlineEl, response.outline, 'Outline will populate after generation.');
        renderList(ctaEl, response.call_to_actions, 'Add context to receive call to actions.');
        renderSections(response.sections);
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setStatus(`Draft ready • ${response.model} @ ${timestamp}`);
      } catch (error) {
        console.error(error);
        setStatus('Unable to generate draft');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
  return widget;
}

function createPresentationWidget(record) {
  const widget = buildWidgetShell('presentation', record, {
    title: 'Presentation builder',
    width: 640,
    height: 540,
    offset: { left: 420, top: 220 },
    body: `
      <div class="presentation-widget presentation-widget--upgraded">
        <section class="presentation-widget__inputs" aria-label="Presentation brief">
          <div class="widget-app__panel-header">
            <h3>Deck brief</h3>
            <span class="presentation-widget__badge" data-presentation-status>Awaiting goals</span>
          </div>
          <form class="presentation-widget__form" data-presentation-form>
            <label class="presentation-widget__field">
              <span>Theme</span>
              <input type="text" name="theme" placeholder="AI assistant launch" required />
            </label>
            <label class="presentation-widget__field">
              <span>Audience</span>
              <input type="text" name="audience" placeholder="Executive staff meeting" required />
            </label>
            <label class="presentation-widget__field">
              <span>Duration (minutes)</span>
              <input type="number" name="duration" min="5" max="90" value="20" />
            </label>
            <label class="presentation-widget__field">
              <span>Goals</span>
              <textarea name="goals" rows="3" placeholder="Secure funding\nAlign launch owners"></textarea>
            </label>
            <div class="presentation-widget__actions">
              <button type="submit" class="btn btn--primary">Plan slides</button>
            </div>
          </form>
        </section>
        <section class="presentation-widget__output" aria-live="polite">
          <article class="presentation-widget__headline">
            <h3 data-presentation-headline>Pitch narrative</h3>
            <p class="presentation-widget__summary" data-presentation-summary>Set the context to generate slide guidance.</p>
          </article>
          <div class="presentation-widget__slides" data-presentation-slides>
            <p class="presentation-widget__placeholder">Slides will appear once the brief is drafted.</p>
          </div>
          <div class="presentation-widget__next">
            <h4>Next steps</h4>
            <ul class="presentation-widget__actions-list" data-presentation-actions>
              <li class="presentation-widget__placeholder">Next steps will populate after generation.</li>
            </ul>
          </div>
        </section>
      </div>
    `,
  });

  const form = widget.querySelector('[data-presentation-form]');
  const statusEl = widget.querySelector('[data-presentation-status]');
  const headlineEl = widget.querySelector('[data-presentation-headline]');
  const summaryEl = widget.querySelector('[data-presentation-summary]');
  const slidesContainer = widget.querySelector('[data-presentation-slides]');
  const actionsList = widget.querySelector('[data-presentation-actions]');

  const setStatus = (text) => {
    if (statusEl) {
      statusEl.textContent = text;
    }
  };

  const renderSlides = (slides) => {
    if (!slidesContainer) return;
    slidesContainer.innerHTML = '';
    if (!slides || !slides.length) {
      const placeholder = document.createElement('p');
      placeholder.className = 'presentation-widget__placeholder';
      placeholder.textContent = 'Add more detail to generate slide structure.';
      slidesContainer.appendChild(placeholder);
      return;
    }
    slides.forEach((slide) => {
      const card = document.createElement('article');
      card.className = 'presentation-widget__slide-card';
      const title = document.createElement('h4');
      title.textContent = slide.title;
      const bulletList = document.createElement('ul');
      bulletList.className = 'presentation-widget__bullets';
      (slide.bullets || []).forEach((bullet) => {
        const item = document.createElement('li');
        item.textContent = bullet;
        bulletList.appendChild(item);
      });
      card.appendChild(title);
      if (slide.visual) {
        const caption = document.createElement('p');
        caption.className = 'presentation-widget__visual';
        caption.textContent = slide.visual;
        card.appendChild(caption);
      }
      card.appendChild(bulletList);
      slidesContainer.appendChild(card);
    });
  };

  const renderActions = (items) => {
    if (!actionsList) return;
    actionsList.innerHTML = '';
    if (!items || !items.length) {
      const placeholder = document.createElement('li');
      placeholder.className = 'presentation-widget__placeholder';
      placeholder.textContent = 'Add clear goals to receive recommended actions.';
      actionsList.appendChild(placeholder);
      return;
    }
    items.forEach((item) => {
      const listItem = document.createElement('li');
      listItem.textContent = item;
      actionsList.appendChild(listItem);
    });
  };

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const theme = String(formData.get('theme') || '').trim();
      const audience = String(formData.get('audience') || '').trim();
      const duration = Number(formData.get('duration') || 15);
      const goalsRaw = String(formData.get('goals') || '');
      const goals = goalsRaw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      if (!theme || !audience) return;

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      setStatus('Assembling slides…');

      try {
        const response = await fetchJSON('/api/presentation/plan', {
          method: 'POST',
          body: JSON.stringify({
            theme,
            audience,
            duration_minutes: duration,
            goals,
          }),
        });
        if (headlineEl) headlineEl.textContent = response.headline;
        if (summaryEl) {
          summaryEl.textContent = `Tailored for ${audience} • ${duration} minute flow.`;
        }
        renderSlides(response.slides);
        renderActions(response.next_steps);
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setStatus(`Plan ready • ${response.model} @ ${timestamp}`);
      } catch (error) {
        console.error(error);
        setStatus('Unable to generate presentation');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
  return widget;
}

function createDataWidget(record) {
  const widget = buildWidgetShell('data', record, {
    title: 'Data visualizer',
    width: 640,
    height: 500,
    offset: { left: 340, top: 260 },
    body: `
      <div class="data-widget data-widget--upgraded">
        <section class="data-widget__inputs" aria-label="Describe dataset">
          <div class="widget-app__panel-header">
            <h3>Dataset</h3>
            <span class="data-widget__status" data-data-status>Awaiting description</span>
          </div>
          <form class="data-widget__form" data-data-form>
            <label class="data-widget__field">
              <span>Dataset description</span>
              <textarea name="dataset" rows="3" placeholder="Monthly active users by region" required></textarea>
            </label>
            <label class="data-widget__field">
              <span>Chart preference</span>
              <select name="chart">
                <option value="bar">Bar</option>
                <option value="line">Line</option>
                <option value="pie">Pie</option>
              </select>
            </label>
            <label class="data-widget__field">
              <span>Decision goal</span>
              <input type="text" name="goal" placeholder="Highlight regions to prioritize" />
            </label>
            <div class="data-widget__actions">
              <button type="submit" class="btn btn--primary">Visualize</button>
            </div>
          </form>
        </section>
        <section class="data-widget__output" aria-live="polite">
          <div class="data-widget__chart" data-data-chart>
            <p class="data-widget__placeholder">Visualizations land here after generation.</p>
          </div>
          <aside class="data-widget__insights">
            <h4>Insights</h4>
            <p class="data-widget__summary" data-data-summary>Summaries appear after generation.</p>
            <ul class="data-widget__insight-list" data-data-insights>
              <li class="data-widget__placeholder">Add a dataset to surface insights.</li>
            </ul>
          </aside>
        </section>
      </div>
    `,
  });
  const form = widget.querySelector('[data-data-form]');
  const statusEl = widget.querySelector('[data-data-status]');
  const chartEl = widget.querySelector('[data-data-chart]');
  const summaryEl = widget.querySelector('[data-data-summary]');
  const insightsEl = widget.querySelector('[data-data-insights]');

  const setStatus = (text) => {
    if (statusEl) {
      statusEl.textContent = text;
    }
  };

  const renderInsights = (insights) => {
    if (!insightsEl) return;
    insightsEl.innerHTML = '';
    if (!insights || !insights.length) {
      const placeholder = document.createElement('li');
      placeholder.className = 'data-widget__placeholder';
      placeholder.textContent = 'Add a richer brief to surface insights.';
      insightsEl.appendChild(placeholder);
      return;
    }
    insights.forEach((insight) => {
      const item = document.createElement('li');
      item.textContent = insight;
      insightsEl.appendChild(item);
    });
  };

  const renderChart = (dataset, chartType) => {
    if (!chartEl) return;
    chartEl.innerHTML = '';
    if (!dataset || !dataset.length) {
      const placeholder = document.createElement('p');
      placeholder.className = 'data-widget__placeholder';
      placeholder.textContent = 'Provide more context to render a chart.';
      chartEl.appendChild(placeholder);
      return;
    }
    const area = document.createElement('div');
    area.className = `data-widget__chart-area data-widget__chart-area--${chartType}`;
    const maxValue = Math.max(...dataset.map((point) => Number(point.value) || 0));
    dataset.forEach((point) => {
      const bar = document.createElement('div');
      bar.className = 'data-widget__bar';
      const ratio = maxValue > 0 ? Math.max((Number(point.value) / maxValue) * 100, 5) : 5;
      bar.style.setProperty('--bar-height', `${ratio}%`);
      const value = document.createElement('span');
      value.className = 'data-widget__bar-value';
      value.textContent = Number(point.value).toLocaleString(undefined, { maximumFractionDigits: 1 });
      const label = document.createElement('span');
      label.className = 'data-widget__bar-label';
      label.textContent = point.label;
      bar.appendChild(value);
      bar.appendChild(label);
      area.appendChild(bar);
    });
    chartEl.appendChild(area);
  };

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const datasetDescription = String(formData.get('dataset') || '').trim();
      const chartPreference = String(formData.get('chart') || 'bar');
      const goal = String(formData.get('goal') || '').trim();
      if (!datasetDescription) return;

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      setStatus('Asking AI to chart your data…');

      try {
        const response = await fetchJSON('/api/data/visualize', {
          method: 'POST',
          body: JSON.stringify({
            dataset_description: datasetDescription,
            chart_preference: chartPreference,
            goal: goal || null,
          }),
        });
        renderChart(response.dataset, response.chart_type);
        if (summaryEl) summaryEl.textContent = response.summary;
        renderInsights(response.insights);
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setStatus(`Visualization ready • ${response.model} @ ${timestamp}`);
      } catch (error) {
        console.error(error);
        setStatus('Unable to visualize data');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
  return widget;
}

function createGameWidget(record) {
  const widget = buildWidgetShell('game', record, {
    title: 'Game builder',
    width: 620,
    height: 520,
    offset: { left: 260, top: 300 },
    body: `
      <div class="game-widget game-widget--upgraded">
        <section class="game-widget__inputs" aria-label="Concept builder">
          <div class="widget-app__panel-header">
            <h3>Concept brief</h3>
            <span class="game-widget__badge" data-game-status>Awaiting idea</span>
          </div>
          <form class="game-widget__form" data-game-form>
            <label class="game-widget__field">
              <span>Core fantasy</span>
              <input type="text" name="fantasy" placeholder="Design your own solar empire" required />
            </label>
            <label class="game-widget__field">
              <span>Genre</span>
              <select name="genre">
                <option value="strategy">Strategy</option>
                <option value="adventure">Adventure</option>
                <option value="simulation">Simulation</option>
                <option value="puzzle">Puzzle</option>
              </select>
            </label>
            <label class="game-widget__field">
              <span>Key pillars</span>
              <textarea name="pillars" rows="3" placeholder="Collaborative planning\nAI-powered world\nSeasonal events"></textarea>
            </label>
            <label class="game-widget__field">
              <span>Primary platform</span>
              <input type="text" name="platform" placeholder="Cross-platform" />
            </label>
            <div class="game-widget__actions">
              <button type="submit" class="btn btn--primary">Generate design</button>
            </div>
          </form>
        </section>
        <section class="game-widget__output" aria-live="polite">
          <article class="game-widget__pitch" data-game-pitch>
            <h3>Pitch</h3>
            <p class="game-widget__placeholder">Outline your fantasy to unlock a full design kit.</p>
          </article>
          <div class="game-widget__grid">
            <div>
              <h4>Core loop</h4>
              <ul class="game-widget__list" data-game-loop>
                <li class="game-widget__placeholder">Loop steps will appear here.</li>
              </ul>
            </div>
            <div>
              <h4>Mechanics</h4>
              <ul class="game-widget__list" data-game-mechanics>
                <li class="game-widget__placeholder">Add pillars to receive mechanics.</li>
              </ul>
            </div>
            <div>
              <h4>Progression</h4>
              <ul class="game-widget__list" data-game-progression>
                <li class="game-widget__placeholder">Progression beats will display once generated.</li>
              </ul>
            </div>
          </div>
          <div class="game-widget__meta">
            <h4>Monetization</h4>
            <ul class="game-widget__list" data-game-monetization>
              <li class="game-widget__placeholder">Monetization levers will appear here.</li>
            </ul>
          </div>
        </section>
      </div>
    `,
  });

  const form = widget.querySelector('[data-game-form]');
  const statusEl = widget.querySelector('[data-game-status]');
  const pitchEl = widget.querySelector('[data-game-pitch]');
  const loopEl = widget.querySelector('[data-game-loop]');
  const mechanicsEl = widget.querySelector('[data-game-mechanics]');
  const progressionEl = widget.querySelector('[data-game-progression]');
  const monetizationEl = widget.querySelector('[data-game-monetization]');

  const setStatus = (text) => {
    if (statusEl) {
      statusEl.textContent = text;
    }
  };

  const renderList = (container, items, placeholderText) => {
    if (!container) return;
    container.innerHTML = '';
    if (!items || !items.length) {
      const placeholder = document.createElement('li');
      placeholder.className = 'game-widget__placeholder';
      placeholder.textContent = placeholderText;
      container.appendChild(placeholder);
      return;
    }
    items.forEach((item) => {
      const listItem = document.createElement('li');
      listItem.textContent = item;
      container.appendChild(listItem);
    });
  };

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const fantasy = String(formData.get('fantasy') || '').trim();
      const genre = String(formData.get('genre') || 'strategy');
      const pillarsRaw = String(formData.get('pillars') || '');
      const platform = String(formData.get('platform') || '').trim();
      if (!fantasy) return;
      const pillars = pillarsRaw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      setStatus('Designing gameplay…');

      try {
        const response = await fetchJSON('/api/game/concept', {
          method: 'POST',
          body: JSON.stringify({
            fantasy,
            genre,
            pillars,
            platform: platform || null,
          }),
        });
        if (pitchEl) {
          pitchEl.innerHTML = `<h3>Pitch</h3><p>${response.elevator_pitch}</p>`;
        }
        renderList(loopEl, response.core_loop, 'Loop steps will appear here.');
        renderList(mechanicsEl, response.mechanics, 'Add pillars to receive mechanics.');
        renderList(progressionEl, response.progression, 'Progression beats will display once generated.');
        renderList(monetizationEl, response.monetization, 'Monetization levers will appear here.');
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setStatus(`Concept ready • ${response.model} @ ${timestamp}`);
      } catch (error) {
        console.error(error);
        setStatus('Unable to generate concept');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
  return widget;
}

function createAvatarWidget(record) {
  const widget = buildWidgetShell('avatar', record, {
    title: 'Avatar creator',
    width: 520,
    height: 480,
    offset: { left: 220, top: 340 },
    body: `
      <div class="avatar-widget avatar-widget--upgraded">
        <section class="avatar-widget__inputs" aria-label="Persona builder">
          <div class="widget-app__panel-header">
            <h3>Persona brief</h3>
            <span class="avatar-widget__badge" data-avatar-status>Awaiting direction</span>
          </div>
          <form class="avatar-widget__form" data-avatar-form>
            <label class="avatar-widget__field">
              <span>Name</span>
              <input type="text" name="name" placeholder="Aurora" required />
            </label>
            <label class="avatar-widget__field">
              <span>Visual style</span>
              <select name="style">
                <option value="illustrated">Illustrated</option>
                <option value="cyberpunk">Cyberpunk</option>
                <option value="minimal">Minimal</option>
                <option value="photorealistic">Photorealistic</option>
              </select>
            </label>
            <label class="avatar-widget__field">
              <span>Vibe</span>
              <input type="text" name="vibe" placeholder="Optimistic strategist" />
            </label>
            <label class="avatar-widget__field">
              <span>Palette hint</span>
              <input type="text" name="palette" placeholder="#38bdf8, midnight blue" />
            </label>
            <div class="avatar-widget__actions">
              <button type="submit" class="btn btn--primary">Design avatar</button>
            </div>
          </form>
        </section>
        <section class="avatar-widget__output" aria-live="polite">
          <article class="avatar-widget__summary" data-avatar-summary>
            <h3>Concept summary</h3>
            <p class="avatar-widget__placeholder">Provide a persona brief to generate style guidance.</p>
          </article>
          <div class="avatar-widget__palette" data-avatar-palette></div>
          <div class="avatar-widget__traits">
            <h4>Accessories</h4>
            <ul class="avatar-widget__list" data-avatar-accessories>
              <li class="avatar-widget__placeholder">Accessories will appear here.</li>
            </ul>
          </div>
          <div class="avatar-widget__prompt">
            <h4>Image prompt</h4>
            <code data-avatar-prompt>Waiting for brief…</code>
          </div>
        </section>
      </div>
    `,
  });

  const form = widget.querySelector('[data-avatar-form]');
  const statusEl = widget.querySelector('[data-avatar-status]');
  const summaryEl = widget.querySelector('[data-avatar-summary]');
  const paletteEl = widget.querySelector('[data-avatar-palette]');
  const accessoriesEl = widget.querySelector('[data-avatar-accessories]');
  const promptEl = widget.querySelector('[data-avatar-prompt]');

  const setStatus = (text) => {
    if (statusEl) {
      statusEl.textContent = text;
    }
  };

  const renderPalette = (palette) => {
    if (!paletteEl) return;
    paletteEl.innerHTML = '';
    if (!palette || !palette.length) {
      const placeholder = document.createElement('p');
      placeholder.className = 'avatar-widget__placeholder';
      placeholder.textContent = 'Palette suggestions will appear here.';
      paletteEl.appendChild(placeholder);
      return;
    }
    palette.forEach((hex) => {
      const swatch = document.createElement('span');
      swatch.className = 'avatar-widget__swatch';
      swatch.style.setProperty('--swatch-color', hex);
      swatch.title = hex;
      paletteEl.appendChild(swatch);
    });
  };

  const renderAccessories = (items) => {
    if (!accessoriesEl) return;
    accessoriesEl.innerHTML = '';
    if (!items || !items.length) {
      const placeholder = document.createElement('li');
      placeholder.className = 'avatar-widget__placeholder';
      placeholder.textContent = 'Add more detail to receive accessory ideas.';
      accessoriesEl.appendChild(placeholder);
      return;
    }
    items.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      accessoriesEl.appendChild(li);
    });
  };

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const name = String(formData.get('name') || '').trim();
      const style = String(formData.get('style') || 'illustrated');
      const vibe = String(formData.get('vibe') || '').trim();
      const paletteHint = String(formData.get('palette') || '').trim();
      if (!name) return;

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      setStatus('Designing persona…');

      try {
        const response = await fetchJSON('/api/avatar/design', {
          method: 'POST',
          body: JSON.stringify({
            name,
            style,
            vibe: vibe || null,
            palette_hint: paletteHint || null,
          }),
        });
        if (summaryEl) {
          summaryEl.innerHTML = `<h3>${response.concept_name}</h3><p>${response.description}</p>`;
        }
        renderPalette(response.palette);
        renderAccessories(response.accessories);
        if (promptEl) {
          promptEl.textContent = response.prompt;
        }
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setStatus(`Concept ready • ${response.model} @ ${timestamp}`);
      } catch (error) {
        console.error(error);
        setStatus('Unable to design avatar');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
  return widget;
}

function createSimulationWidget(record) {
  const widget = buildWidgetShell('simulation', record, {
    title: 'Simulation sandbox',
    width: 640,
    height: 500,
    offset: { left: 420, top: 320 },
    body: `
      <div class="simulation-widget simulation-widget--upgraded">
        <section class="simulation-widget__inputs" aria-label="Scenario setup">
          <div class="widget-app__panel-header">
            <h3>Scenario setup</h3>
            <span class="simulation-widget__badge" data-simulation-status>Idle</span>
          </div>
          <form class="simulation-widget__form" data-simulation-form>
            <label class="simulation-widget__field">
              <span>Scenario</span>
              <input type="text" name="scenario" placeholder="Launch day traffic surge" required />
            </label>
            <label class="simulation-widget__field">
              <span>Time horizon</span>
              <input type="text" name="horizon" placeholder="30 days" />
            </label>
            <label class="simulation-widget__field">
              <span>Key metrics</span>
              <textarea name="metrics" rows="3" placeholder="Conversion rate\nLatency\nSupport volume"></textarea>
            </label>
            <div class="simulation-widget__actions">
              <button type="submit" class="btn btn--primary">Run simulation</button>
            </div>
          </form>
        </section>
        <section class="simulation-widget__output" aria-live="polite">
          <article class="simulation-widget__summary" data-simulation-summary>
            <h3>Simulation summary</h3>
            <p class="simulation-widget__placeholder">Describe a scenario to preview AI-driven projections.</p>
          </article>
          <div class="simulation-widget__timeline" data-simulation-timeline></div>
          <div class="simulation-widget__metrics" data-simulation-metrics></div>
          <div class="simulation-widget__risks">
            <h4>Risks &amp; follow-ups</h4>
            <ul class="simulation-widget__list" data-simulation-risks>
              <li class="simulation-widget__placeholder">Risks will appear here once the run completes.</li>
            </ul>
          </div>
        </section>
      </div>
    `,
  });

  const form = widget.querySelector('[data-simulation-form]');
  const statusEl = widget.querySelector('[data-simulation-status]');
  const summaryEl = widget.querySelector('[data-simulation-summary]');
  const timelineEl = widget.querySelector('[data-simulation-timeline]');
  const metricsEl = widget.querySelector('[data-simulation-metrics]');
  const risksEl = widget.querySelector('[data-simulation-risks]');

  const setStatus = (text) => {
    if (statusEl) {
      statusEl.textContent = text;
    }
  };

  const renderTimeline = (timeline) => {
    if (!timelineEl) return;
    timelineEl.innerHTML = '';
    if (!timeline || !timeline.length) {
      const placeholder = document.createElement('p');
      placeholder.className = 'simulation-widget__placeholder';
      placeholder.textContent = 'Timeline beats will appear here.';
      timelineEl.appendChild(placeholder);
      return;
    }
    const list = document.createElement('ol');
    list.className = 'simulation-widget__timeline-list';
    timeline.forEach((entry) => {
      const item = document.createElement('li');
      const label = document.createElement('strong');
      label.textContent = entry.phase;
      const detail = document.createElement('span');
      detail.textContent = entry.details;
      item.appendChild(label);
      item.appendChild(detail);
      list.appendChild(item);
    });
    timelineEl.appendChild(list);
  };

  const renderMetrics = (metrics) => {
    if (!metricsEl) return;
    metricsEl.innerHTML = '';
    if (!metrics || !metrics.length) {
      const placeholder = document.createElement('p');
      placeholder.className = 'simulation-widget__placeholder';
      placeholder.textContent = 'Include metrics in your brief to track them here.';
      metricsEl.appendChild(placeholder);
      return;
    }
    const table = document.createElement('div');
    table.className = 'simulation-widget__metrics-grid';
    metrics.forEach((metric) => {
      const card = document.createElement('div');
      card.className = 'simulation-widget__metric-card';
      const name = document.createElement('span');
      name.className = 'simulation-widget__metric-name';
      name.textContent = metric.name;
      const value = document.createElement('strong');
      value.className = 'simulation-widget__metric-value';
      value.textContent = metric.value;
      card.appendChild(name);
      card.appendChild(value);
      table.appendChild(card);
    });
    metricsEl.appendChild(table);
  };

  const renderRisks = (risks) => {
    if (!risksEl) return;
    risksEl.innerHTML = '';
    if (!risks || !risks.length) {
      const placeholder = document.createElement('li');
      placeholder.className = 'simulation-widget__placeholder';
      placeholder.textContent = 'No risks identified yet.';
      risksEl.appendChild(placeholder);
      return;
    }
    risks.forEach((risk) => {
      const item = document.createElement('li');
      item.textContent = risk;
      risksEl.appendChild(item);
    });
  };

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const scenario = String(formData.get('scenario') || '').trim();
      const horizon = String(formData.get('horizon') || '').trim();
      const metricsRaw = String(formData.get('metrics') || '');
      if (!scenario) return;
      const metrics = metricsRaw
        .split('\n')
        .map((value) => value.trim())
        .filter(Boolean);

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      setStatus('Running simulation…');

      try {
        const response = await fetchJSON('/api/simulation/run', {
          method: 'POST',
          body: JSON.stringify({
            scenario,
            horizon: horizon || '30 days',
            metrics,
          }),
        });
        if (summaryEl) {
          summaryEl.innerHTML = `<h3>${response.scenario}</h3><p>${response.summary}</p>`;
        }
        renderTimeline(response.timeline);
        renderMetrics(response.metrics);
        renderRisks(response.risks);
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setStatus(`Simulation ready • ${response.model} @ ${timestamp}`);
      } catch (error) {
        console.error(error);
        setStatus('Unable to run simulation');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
  return widget;
}

function createWhiteboardWidget(record) {
  const widget = buildWidgetShell('whiteboard', record, {
    title: 'Collaboration whiteboard',
    width: 640,
    height: 520,
    offset: { left: 380, top: 360 },
    body: `
      <div class="whiteboard-widget whiteboard-widget--upgraded">
        <section class="whiteboard-widget__inputs" aria-label="Add note">
          <div class="widget-app__panel-header">
            <h3>New card</h3>
            <span class="whiteboard-widget__badge" data-whiteboard-status>0 notes</span>
          </div>
          <form class="whiteboard-widget__form" data-whiteboard-form>
            <label class="whiteboard-widget__field">
              <span>Note</span>
              <input type="text" name="note" placeholder="Capture a decision or task" required />
            </label>
            <label class="whiteboard-widget__field">
              <span>Category</span>
              <select name="category">
                <option value="Idea">Idea</option>
                <option value="Decision">Decision</option>
                <option value="Risk">Risk</option>
              </select>
            </label>
            <div class="whiteboard-widget__actions">
              <button type="submit" class="btn">Add note</button>
              <button type="button" class="btn btn--ghost" data-whiteboard-ai>Summarize with AI</button>
            </div>
          </form>
        </section>
        <section class="whiteboard-widget__board" aria-live="polite">
          <div class="whiteboard-widget__column" data-whiteboard-column="Idea">
            <h4>Ideas</h4>
            <ul class="whiteboard-widget__notes" data-whiteboard-list="Idea"></ul>
          </div>
          <div class="whiteboard-widget__column" data-whiteboard-column="Decision">
            <h4>Decisions</h4>
            <ul class="whiteboard-widget__notes" data-whiteboard-list="Decision"></ul>
          </div>
          <div class="whiteboard-widget__column" data-whiteboard-column="Risk">
            <h4>Risks</h4>
            <ul class="whiteboard-widget__notes" data-whiteboard-list="Risk"></ul>
          </div>
        </section>
        <aside class="whiteboard-widget__summary" aria-live="polite">
          <h4>Highlights</h4>
          <ul class="whiteboard-widget__list" data-whiteboard-highlights>
            <li class="whiteboard-widget__placeholder">Ask AI to summarize your board.</li>
          </ul>
          <div class="whiteboard-widget__clusters" data-whiteboard-clusters></div>
          <div class="whiteboard-widget__follow-ups">
            <h4>Follow-ups</h4>
            <ul class="whiteboard-widget__list" data-whiteboard-followups>
              <li class="whiteboard-widget__placeholder">AI follow-ups will appear here.</li>
            </ul>
          </div>
        </aside>
      </div>
    `,
  });

  const form = widget.querySelector('[data-whiteboard-form]');
  const statusEl = widget.querySelector('[data-whiteboard-status]');
  const summarizeBtn = widget.querySelector('[data-whiteboard-ai]');
  const highlightsEl = widget.querySelector('[data-whiteboard-highlights]');
  const clustersEl = widget.querySelector('[data-whiteboard-clusters]');
  const followupsEl = widget.querySelector('[data-whiteboard-followups]');

  const boardLists = {
    Idea: widget.querySelector('[data-whiteboard-list="Idea"]'),
    Decision: widget.querySelector('[data-whiteboard-list="Decision"]'),
    Risk: widget.querySelector('[data-whiteboard-list="Risk"]'),
  };

  const notes = [];

  const setStatus = () => {
    if (statusEl) {
      statusEl.textContent = `${notes.length} note${notes.length === 1 ? '' : 's'}`;
    }
  };

  const renderBoard = () => {
    Object.entries(boardLists).forEach(([category, list]) => {
      if (!list) return;
      list.innerHTML = '';
      const categoryNotes = notes.filter((note) => note.category === category);
      if (!categoryNotes.length) {
        const placeholder = document.createElement('li');
        placeholder.className = 'whiteboard-widget__placeholder';
        placeholder.textContent = 'No notes yet.';
        list.appendChild(placeholder);
        return;
      }
      categoryNotes.forEach((note) => {
        const item = document.createElement('li');
        item.textContent = note.text;
        list.appendChild(item);
      });
    });
    setStatus();
  };

  const renderHighlights = (highlights) => {
    if (!highlightsEl) return;
    highlightsEl.innerHTML = '';
    if (!highlights || !highlights.length) {
      const placeholder = document.createElement('li');
      placeholder.className = 'whiteboard-widget__placeholder';
      placeholder.textContent = 'Add notes and summarize to see highlights.';
      highlightsEl.appendChild(placeholder);
      return;
    }
    highlights.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      highlightsEl.appendChild(li);
    });
  };

  const renderClusters = (clusters) => {
    if (!clustersEl) return;
    clustersEl.innerHTML = '';
    if (!clusters || !clusters.length) {
      const placeholder = document.createElement('p');
      placeholder.className = 'whiteboard-widget__placeholder';
      placeholder.textContent = 'AI clusters will show up after summarizing.';
      clustersEl.appendChild(placeholder);
      return;
    }
    clusters.forEach((cluster) => {
      const section = document.createElement('section');
      section.className = 'whiteboard-widget__cluster';
      const title = document.createElement('h5');
      title.textContent = cluster.label;
      const list = document.createElement('ul');
      list.className = 'whiteboard-widget__list';
      (cluster.items || []).forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        list.appendChild(li);
      });
      section.appendChild(title);
      section.appendChild(list);
      clustersEl.appendChild(section);
    });
  };

  const renderFollowUps = (items) => {
    if (!followupsEl) return;
    followupsEl.innerHTML = '';
    if (!items || !items.length) {
      const placeholder = document.createElement('li');
      placeholder.className = 'whiteboard-widget__placeholder';
      placeholder.textContent = 'No follow-ups suggested yet.';
      followupsEl.appendChild(placeholder);
      return;
    }
    items.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      followupsEl.appendChild(li);
    });
  };

  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const text = String(formData.get('note') || '').trim();
      const category = String(formData.get('category') || 'Idea');
      if (!text) return;
      notes.push({ text, category });
      renderBoard();
      form.reset();
    });
  }

  if (summarizeBtn) {
    summarizeBtn.addEventListener('click', async () => {
      if (!notes.length) {
        alert('Add a few notes before summarizing.');
        return;
      }
      summarizeBtn.disabled = true;
      setStatus('Summarizing…');
      try {
        const response = await fetchJSON('/api/whiteboard/summarize', {
          method: 'POST',
          body: JSON.stringify({ notes }),
        });
        renderHighlights(response.highlights);
        renderClusters(response.clusters);
        renderFollowUps(response.follow_ups);
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setStatus(`Summarized • ${response.model} @ ${timestamp}`);
      } catch (error) {
        console.error(error);
        setStatus('Unable to summarize right now');
      } finally {
        summarizeBtn.disabled = false;
      }
    });
  }

  renderBoard();
  return widget;
}

function createKnowledgeWidget(record) {
  const widget = buildWidgetShell('knowledge', record, {
    title: 'Knowledge board',
    width: 640,
    height: 520,
    offset: { left: 440, top: 380 },
    body: `
      <div class="knowledge-widget knowledge-widget--upgraded">
        <section class="knowledge-widget__inputs" aria-label="Curate board">
          <div class="widget-app__panel-header">
            <h3>Board brief</h3>
            <span class="knowledge-widget__badge" data-knowledge-status>Awaiting theme</span>
          </div>
          <form class="knowledge-widget__form" data-knowledge-form>
            <label class="knowledge-widget__field">
              <span>Theme</span>
              <input type="text" name="theme" placeholder="AI adoption playbook" required />
            </label>
            <label class="knowledge-widget__field">
              <span>Objective</span>
              <input type="text" name="objective" placeholder="Enable field teams" />
            </label>
            <label class="knowledge-widget__field">
              <span>Audience</span>
              <input type="text" name="audience" placeholder="Product and GTM leaders" />
            </label>
            <div class="knowledge-widget__actions">
              <button type="submit" class="btn btn--primary">Curate board</button>
            </div>
          </form>
        </section>
        <section class="knowledge-widget__board" aria-live="polite">
          <div class="knowledge-widget__columns" data-knowledge-columns>
            <p class="knowledge-widget__placeholder">Generate a board to see curated columns.</p>
          </div>
          <aside class="knowledge-widget__actions-list" aria-label="Recommended actions">
            <h4>Recommended actions</h4>
            <ul data-knowledge-actions>
              <li class="knowledge-widget__placeholder">Actions appear after curation.</li>
            </ul>
          </aside>
        </section>
      </div>
    `,
  });

  const form = widget.querySelector('[data-knowledge-form]');
  const statusEl = widget.querySelector('[data-knowledge-status]');
  const columnsEl = widget.querySelector('[data-knowledge-columns]');
  const actionsEl = widget.querySelector('[data-knowledge-actions]');

  const setStatus = (text) => {
    if (statusEl) {
      statusEl.textContent = text;
    }
  };

  const renderColumns = (columns) => {
    if (!columnsEl) return;
    columnsEl.innerHTML = '';
    if (!columns || !columns.length) {
      const placeholder = document.createElement('p');
      placeholder.className = 'knowledge-widget__placeholder';
      placeholder.textContent = 'No curated insights yet.';
      columnsEl.appendChild(placeholder);
      return;
    }
    columns.forEach((column) => {
      const section = document.createElement('section');
      section.className = 'knowledge-widget__column';
      const heading = document.createElement('h4');
      heading.textContent = column.title;
      const list = document.createElement('ul');
      list.className = 'knowledge-widget__card-list';
      (column.items || []).forEach((item) => {
        const li = document.createElement('li');
        li.className = 'knowledge-widget__card';
        const title = document.createElement('h5');
        title.textContent = item.title;
        const summary = document.createElement('p');
        summary.textContent = item.summary;
        li.appendChild(title);
        li.appendChild(summary);
        if (item.link) {
          const link = document.createElement('a');
          link.href = item.link;
          link.target = '_blank';
          link.rel = 'noopener';
          link.textContent = 'Open source';
          li.appendChild(link);
        }
        list.appendChild(li);
      });
      section.appendChild(heading);
      section.appendChild(list);
      columnsEl.appendChild(section);
    });
  };

  const renderActions = (actions) => {
    if (!actionsEl) return;
    actionsEl.innerHTML = '';
    if (!actions || !actions.length) {
      const placeholder = document.createElement('li');
      placeholder.className = 'knowledge-widget__placeholder';
      placeholder.textContent = 'No actions recommended yet.';
      actionsEl.appendChild(placeholder);
      return;
    }
    actions.forEach((action) => {
      const li = document.createElement('li');
      li.textContent = action;
      actionsEl.appendChild(li);
    });
  };

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const theme = String(formData.get('theme') || '').trim();
      const objective = String(formData.get('objective') || '').trim();
      const audience = String(formData.get('audience') || '').trim();
      if (!theme) return;

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      setStatus('Curating insights…');

      try {
        const response = await fetchJSON('/api/knowledge/curate', {
          method: 'POST',
          body: JSON.stringify({ theme, objective: objective || null, audience: audience || null }),
        });
        renderColumns(response.columns);
        renderActions(response.actions);
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setStatus(`Curated • ${response.model} @ ${timestamp}`);
      } catch (error) {
        console.error(error);
        setStatus('Unable to curate board');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
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
  const bounded = Math.min(2.5, Math.max(0.2, scale));
  state.canvasScale = bounded;
  if (canvasContentEl) {
    canvasContentEl.style.transform = `scale(${bounded})`;
  }
  if (zoomIndicatorEl) {
    zoomIndicatorEl.textContent = `${Math.round(bounded * 100)}%`;
  }
}

function adjustCanvasScale(action, factorOverride) {
  if (action === 'in') {
    const factor = factorOverride ?? 1.1;
    setCanvasScale(state.canvasScale * factor);
  } else if (action === 'out') {
    const factor = factorOverride ?? 0.9;
    setCanvasScale(state.canvasScale * factor);
  } else if (action === 'reset') {
    setCanvasScale(1);
  }
}

function startZoomHold(button) {
  const action = button.dataset.zoom;
  if (!action || (action !== 'in' && action !== 'out')) {
    return;
  }
  stopZoomHold();
  zoomHoldButton = button;
  zoomHoldTimeout = window.setTimeout(() => {
    zoomHoldTimeout = null;
    const factor = action === 'in' ? 1.03 : 0.97;
    zoomHoldInterval = window.setInterval(() => {
      adjustCanvasScale(action, factor);
    }, 60);
  }, 200);
}

function stopZoomHold({ shouldSkipClick = false } = {}) {
  const button = zoomHoldButton;
  if (zoomHoldTimeout) {
    window.clearTimeout(zoomHoldTimeout);
    zoomHoldTimeout = null;
  }
  if (zoomHoldInterval) {
    window.clearInterval(zoomHoldInterval);
    zoomHoldInterval = null;
  }
  if (button) {
    if (shouldSkipClick) {
      button.dataset.skipClick = 'true';
      window.setTimeout(() => {
        if (button.dataset.skipClick === 'true') {
          delete button.dataset.skipClick;
        }
      }, 0);
    }
    zoomHoldButton = null;
  }
}

function handleZoomButton(event) {
  const button = event.currentTarget;
  if (button.dataset.skipClick === 'true') {
    delete button.dataset.skipClick;
    return;
  }
  const action = button.dataset.zoom;
  adjustCanvasScale(action);
}

function handleZoomButtonPointerDown(event) {
  if (event.button !== 0) return;
  startZoomHold(event.currentTarget);
}

function handleZoomButtonPointerUp(event) {
  if (event.button !== undefined && event.button !== 0) return;
  const shouldSkipClick = Boolean(zoomHoldInterval);
  stopZoomHold({ shouldSkipClick });
}

function handleZoomButtonPointerLeave(event) {
  if (!zoomHoldButton) return;
  const shouldSkipClick = event.buttons === 1 && Boolean(zoomHoldInterval);
  stopZoomHold({ shouldSkipClick });
}

function handleZoomButtonPointerCancel() {
  if (!zoomHoldButton) return;
  const shouldSkipClick = Boolean(zoomHoldInterval);
  stopZoomHold({ shouldSkipClick });
}

function handleWindowPointerUp() {
  if (!zoomHoldButton) return;
  const shouldSkipClick = Boolean(zoomHoldInterval);
  stopZoomHold({ shouldSkipClick });
}

function handleCanvasWheel(event) {
  if (!canvasEl) return;
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault();
    const direction = event.deltaY > 0 ? 0.95 : 1.05;
    setCanvasScale(state.canvasScale * direction);
    return;
  }

  const target = canvasEl;

  if (event.shiftKey && event.deltaY !== 0 && Math.abs(event.deltaX) < Math.abs(event.deltaY)) {
    event.preventDefault();
    target.scrollLeft += event.deltaY;
    return;
  }

  if (event.deltaX !== 0 || event.deltaY !== 0) {
    event.preventDefault();
    if (event.deltaX !== 0) {
      target.scrollLeft += event.deltaX;
    }
    if (event.deltaY !== 0) {
      target.scrollTop += event.deltaY;
    }
  }
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

function toggleData(open) {
  if (!dataPanelEl) return;
  const isOpen = open ?? !dataPanelEl.classList.contains('is-open');
  dataPanelEl.classList.toggle('is-open', Boolean(isOpen));
  dataPanelEl.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  if (isOpen) {
    loadDataCatalog(true);
  }
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

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function truncateText(value, maxLength = 160) {
  if (!value) return '';
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

function setDataStatus(message, variant = 'info') {
  if (!dataStatusEl) return;
  dataStatusEl.textContent = message || '';
  dataStatusEl.classList.remove('is-error', 'is-success');
  if (variant === 'error') {
    dataStatusEl.classList.add('is-error');
  } else if (variant === 'success') {
    dataStatusEl.classList.add('is-success');
  }
}

function createDataCard({ tag, title, meta, description, timestamp }) {
  const card = document.createElement('article');
  card.className = 'data-card';

  if (tag || timestamp) {
    const header = document.createElement('header');
    header.className = 'data-card__header';
    if (tag) {
      const tagEl = document.createElement('span');
      tagEl.className = 'data-card__tag';
      tagEl.textContent = tag;
      header.appendChild(tagEl);
    }
    if (timestamp) {
      const timeEl = document.createElement('time');
      timeEl.className = 'data-card__time';
      const date = new Date(timestamp);
      if (!Number.isNaN(date.getTime())) {
        timeEl.dateTime = date.toISOString();
        timeEl.textContent = formatDateTime(date);
      }
      header.appendChild(timeEl);
    }
    card.appendChild(header);
  }

  const titleEl = document.createElement('h4');
  titleEl.className = 'data-card__title';
  titleEl.textContent = title || 'Untitled record';
  card.appendChild(titleEl);

  if (meta) {
    const metaEl = document.createElement('p');
    metaEl.className = 'data-card__meta';
    metaEl.textContent = meta;
    card.appendChild(metaEl);
  }

  if (description) {
    const descriptionEl = document.createElement('p');
    descriptionEl.className = 'data-card__description';
    descriptionEl.textContent = description;
    card.appendChild(descriptionEl);
  }

  return card;
}

function renderDataSummary() {
  if (!dataSummaryEl) return;
  dataSummaryEl.innerHTML = '';
  const stats = state.dataCatalog?.stats;
  if (!stats) return;
  const summaryItems = [
    { key: 'conversations', label: 'Conversations', hint: 'Strategy threads driving the work.' },
    { key: 'messages', label: 'Messages', hint: 'Ideas exchanged with copilots.' },
    { key: 'gallery_assets', label: 'Visual assets', hint: 'Images and videos in the gallery.' },
    { key: 'galleries', label: 'Galleries', hint: 'Curated collections ready to share.' },
    { key: 'agents', label: 'Agents', hint: 'Automation teammates on call.' },
    { key: 'audio_tracks', label: 'Audio tracks', hint: 'Soundscapes crafted in the studio.' },
    { key: 'widgets', label: 'Widgets', hint: 'Custom software blocks on the canvas.' },
  ];

  summaryItems.forEach(({ key, label, hint }) => {
    const value = Number.isFinite(stats[key]) ? stats[key] : 0;
    const item = document.createElement('li');
    item.className = 'data-summary__item';

    const labelEl = document.createElement('span');
    labelEl.className = 'data-summary__label';
    labelEl.textContent = label;
    item.appendChild(labelEl);

    const countEl = document.createElement('span');
    countEl.className = 'data-summary__count';
    countEl.textContent = value.toLocaleString();
    item.appendChild(countEl);

    if (hint) {
      const hintEl = document.createElement('p');
      hintEl.className = 'data-summary__hint';
      hintEl.textContent = hint;
      item.appendChild(hintEl);
    }

    dataSummaryEl.appendChild(item);
  });
}

function renderDataCatalog() {
  if (!dataCatalogEl) return;
  dataCatalogEl.innerHTML = '';
  const catalog = state.dataCatalog;
  if (!catalog) return;

  const assetItems = Array.isArray(catalog.assets) ? catalog.assets : [];
  const audioItems = Array.isArray(catalog.audio) ? catalog.audio : [];
  const agentItems = Array.isArray(catalog.agents) ? catalog.agents : [];
  const conversationItems = Array.isArray(catalog.conversations) ? catalog.conversations : [];
  const galleryItems = Array.isArray(catalog.galleries) ? catalog.galleries : [];
  const widgetItems = Array.isArray(catalog.widgets) ? catalog.widgets : [];

  const sections = [
    {
      title: 'Visual assets',
      meta: assetItems.length ? `${assetItems.length} recent` : 'No visuals yet',
      description: 'Images and motion published from the studio.',
      items: assetItems,
      empty: 'When you generate images or video, they will land here automatically.',
      render: (asset) => {
        if (!asset) return null;
        const tag = asset.asset_type === 'video' ? 'Video' : 'Image';
        const metaParts = [tag];
        const description = truncateText(asset.description, 140);
        return createDataCard({
          tag,
          title: asset.title,
          meta: metaParts.filter(Boolean).join(' • '),
          description,
          timestamp: asset.created_at,
        });
      },
    },
    {
      title: 'Audio library',
      meta: audioItems.length ? `${audioItems.length} fresh tracks` : 'No audio yet',
      description: 'Music, narration, and sound effects generated with ElevenLabs.',
      items: audioItems,
      empty: 'Compose a track in the audio workspace to fill the sound archive.',
      render: (track) => {
        if (!track) return null;
        const metaParts = [track.track_type];
        if (track.style) metaParts.push(track.style);
        if (track.voice) metaParts.push(`voice: ${track.voice}`);
        if (track.duration_seconds) metaParts.push(formatDuration(track.duration_seconds));
        return createDataCard({
          tag: 'Audio',
          title: track.title,
          meta: metaParts.filter(Boolean).join(' • '),
          description: truncateText(track.description, 140),
          timestamp: track.created_at,
        });
      },
    },
    {
      title: 'Automation agents',
      meta: agentItems.length ? `${agentItems.length} active` : 'No agents yet',
      description: 'Blueprints, missions, and capabilities for your AI teammates.',
      items: agentItems,
      empty: 'Generate an agent plan to start building your autonomous crew.',
      render: (agent) => {
        if (!agent) return null;
        const metaParts = [];
        if (Array.isArray(agent.capabilities) && agent.capabilities.length) {
          metaParts.push(agent.capabilities.join(', '));
        }
        return createDataCard({
          tag: 'Agent',
          title: agent.name,
          meta: metaParts.join(' • '),
          description: truncateText(agent.mission, 160),
          timestamp: agent.updated_at,
        });
      },
    },
    {
      title: 'Conversation intelligence',
      meta: conversationItems.length ? `${conversationItems.length} threads` : 'No conversations yet',
      description: 'Research, planning, and customer feedback sessions.',
      items: conversationItems,
      empty: 'Kick off a new conversation to seed this knowledge base.',
      render: (conversation) => {
        if (!conversation) return null;
        const messageCount = conversation.message_count || 0;
        const metaParts = [`${messageCount} ${messageCount === 1 ? 'message' : 'messages'}`];
        return createDataCard({
          tag: 'Conversation',
          title: conversation.title,
          meta: metaParts.join(' • '),
          description: `Last update ${formatDateTime(conversation.updated_at)}`,
          timestamp: conversation.updated_at,
        });
      },
    },
    {
      title: 'Curated galleries',
      meta: galleryItems.length ? `${galleryItems.length} collections` : 'No galleries yet',
      description: 'Organized sets of assets ready for campaigns and presentations.',
      items: galleryItems,
      empty: 'Create a gallery in the studio to keep launches organized.',
      render: (gallery) => {
        if (!gallery) return null;
        const metaParts = [];
        if (gallery.category) metaParts.push(gallery.category);
        if (Number.isFinite(gallery.asset_count)) {
          metaParts.push(`${gallery.asset_count} assets`);
        }
        return createDataCard({
          tag: 'Gallery',
          title: gallery.name,
          meta: metaParts.join(' • '),
          description: truncateText(gallery.description, 160),
          timestamp: gallery.updated_at,
        });
      },
    },
    {
      title: 'Workspace software',
      meta: widgetItems.length ? `${widgetItems.length} widgets` : 'No widgets yet',
      description: 'Persisted canvas widgets and bespoke tools.',
      items: widgetItems,
      empty: 'Add a widget from the canvas toolbar to populate this list.',
      render: (widget) => {
        if (!widget) return null;
        const metaParts = [widget.widget_type];
        if (widget.width && widget.height) {
          metaParts.push(`${Math.round(widget.width)} × ${Math.round(widget.height)} px`);
        }
        return createDataCard({
          tag: 'Widget',
          title: widget.title,
          meta: metaParts.filter(Boolean).join(' • '),
          description: widget.config?.description
            ? truncateText(widget.config.description, 140)
            : '',
          timestamp: widget.updated_at,
        });
      },
    },
  ];

  sections.forEach((section) => {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'data-catalog__section';

    const headerEl = document.createElement('div');
    headerEl.className = 'data-catalog__header';

    const titleEl = document.createElement('h3');
    titleEl.className = 'data-catalog__title';
    titleEl.textContent = section.title;
    headerEl.appendChild(titleEl);

    if (section.meta) {
      const metaEl = document.createElement('p');
      metaEl.className = 'data-catalog__meta';
      metaEl.textContent = section.meta;
      headerEl.appendChild(metaEl);
    }

    sectionEl.appendChild(headerEl);

    if (section.description) {
      const descriptionEl = document.createElement('p');
      descriptionEl.className = 'data-catalog__meta';
      descriptionEl.textContent = section.description;
      sectionEl.appendChild(descriptionEl);
    }

    if (!section.items.length) {
      const emptyEl = document.createElement('p');
      emptyEl.className = 'data-catalog__empty';
      emptyEl.textContent = section.empty;
      sectionEl.appendChild(emptyEl);
    } else {
      const listEl = document.createElement('ul');
      listEl.className = 'data-catalog__list';
      section.items.forEach((item) => {
        const card = section.render(item);
        if (!card) return;
        const listItem = document.createElement('li');
        listItem.appendChild(card);
        listEl.appendChild(listItem);
      });
      if (listEl.childElementCount) {
        sectionEl.appendChild(listEl);
      } else {
        const emptyEl = document.createElement('p');
        emptyEl.className = 'data-catalog__empty';
        emptyEl.textContent = section.empty;
        sectionEl.appendChild(emptyEl);
      }
    }

    dataCatalogEl.appendChild(sectionEl);
  });
}

function renderDataWarehouse() {
  renderDataSummary();
  renderDataCatalog();
}

async function loadDataCatalog(forceRefresh = false) {
  if (!dataPanelEl) return;
  if (!forceRefresh && state.dataCatalog) {
    renderDataWarehouse();
    setDataStatus('');
    return;
  }

  if (dataSummaryEl) {
    dataSummaryEl.innerHTML = '';
  }
  if (dataCatalogEl) {
    dataCatalogEl.innerHTML = '';
    dataCatalogEl.setAttribute('aria-busy', 'true');
  }

  setDataStatus('Loading the data backend mega gallery…');

  try {
    const payload = await fetchJSON('/api/data-catalog');
    state.dataCatalog = payload;
    renderDataWarehouse();
    setDataStatus('Mega gallery synced.', 'success');
  } catch (error) {
    console.error(error);
    setDataStatus('Unable to load the data backend right now.', 'error');
  } finally {
    if (dataCatalogEl) {
      dataCatalogEl.setAttribute('aria-busy', 'false');
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
  button.addEventListener('pointerdown', handleZoomButtonPointerDown);
  button.addEventListener('pointerup', handleZoomButtonPointerUp);
  button.addEventListener('pointerleave', handleZoomButtonPointerLeave);
  button.addEventListener('pointercancel', handleZoomButtonPointerCancel);
});

if (addWidgetBtn) {
  addWidgetBtn.addEventListener('click', toggleDropdown);
}

addWidgetOptions.forEach((option) => {
  option.addEventListener('click', handleAddWidgetOption);
});

if (dataToggleBtn) {
  dataToggleBtn.addEventListener('click', () => toggleData(true));
}

if (dataCloseBtn) {
  dataCloseBtn.addEventListener('click', () => toggleData(false));
}

if (canvasContentEl) {
  canvasContentEl.addEventListener('pointerdown', handlePointerDown);
  canvasContentEl.addEventListener('click', handleWidgetAction);
}

if (canvasWrapperEl) {
  canvasWrapperEl.addEventListener('wheel', handleCanvasWheel, { passive: false });
}

window.addEventListener('pointermove', handlePointerMove);
window.addEventListener('pointerup', handlePointerUp);
window.addEventListener('pointerup', handleWindowPointerUp);
window.addEventListener('pointercancel', handleWindowPointerUp);

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
    if (dataPanelEl && dataPanelEl.classList.contains('is-open')) {
      toggleData(false);
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
