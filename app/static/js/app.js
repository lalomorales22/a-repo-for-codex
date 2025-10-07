const state = {
  conversations: [],
  currentConversationId: null,
  messages: {},
};

const conversationListEl = document.getElementById('conversation-list');
const chatThreadEl = document.getElementById('chat-thread');
const chatFormEl = document.getElementById('chat-form');
const chatInputEl = document.getElementById('chat-input');
const modelSelectEl = document.getElementById('model-select');
const newConversationBtn = document.getElementById('new-conversation');
const imageFormEl = document.getElementById('image-form');
const imagePromptEl = document.getElementById('image-prompt');
const imageSizeEl = document.getElementById('image-size');
const imageQualityEl = document.getElementById('image-quality');
const galleryEl = document.getElementById('gallery');

async function fetchJSON(url, options) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Request failed');
  }
  return res.json();
}

function renderConversations() {
  conversationListEl.innerHTML = '';
  state.conversations.forEach((conversation) => {
    const li = document.createElement('li');
    li.textContent = conversation.title;
    if (conversation.id === state.currentConversationId) {
      li.classList.add('active');
    }
    li.addEventListener('click', () => selectConversation(conversation.id));
    conversationListEl.appendChild(li);
  });
}

function renderMessages(conversationId) {
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

async function sendMessage(event) {
  event.preventDefault();
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

async function loadGallery() {
  const assets = await fetchJSON('/api/gallery');
  galleryEl.innerHTML = '';
  assets.forEach((asset) => {
    const card = document.createElement('article');
    card.className = 'gallery-card';
    const img = document.createElement('img');
    img.src = asset.url;
    img.alt = asset.title;
    const content = document.createElement('div');
    content.className = 'gallery-card__content';
    const title = document.createElement('h3');
    title.className = 'gallery-card__title';
    title.textContent = asset.title;
    const meta = document.createElement('p');
    meta.className = 'gallery-card__meta';
    meta.textContent = asset.description || 'Generated asset';

    content.appendChild(title);
    content.appendChild(meta);
    card.appendChild(img);
    card.appendChild(content);
    galleryEl.appendChild(card);
  });
}

async function generateImage(event) {
  event.preventDefault();
  const prompt = imagePromptEl.value.trim();
  if (!prompt) return;
  try {
    const response = await fetchJSON('/api/images', {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        size: imageSizeEl.value,
        quality: imageQualityEl.value.toLowerCase(),
      }),
    });
    imagePromptEl.value = '';
    state.gallery = state.gallery || [];
    await loadGallery();
  } catch (error) {
    console.error(error);
    alert('Image generation failed. Ensure your API key is configured.');
  }
}

newConversationBtn.addEventListener('click', createConversation);
chatFormEl.addEventListener('submit', sendMessage);
imageFormEl.addEventListener('submit', generateImage);

loadConversations();
loadGallery();
