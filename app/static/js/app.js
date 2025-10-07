const state = {
  conversations: [],
  currentConversationId: null,
  messages: {},
  assets: [],
  galleries: [],
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
};

const conversationListEl = document.getElementById('conversation-list');
const chatThreadEl = document.getElementById('chat-thread');
const chatFormEl = document.getElementById('chat-form');
const chatInputEl = document.getElementById('chat-input');
const modelSelectEl = document.getElementById('model-select');
const newConversationBtn = document.getElementById('new-conversation');
const galleryEl = document.getElementById('gallery');
const feedSearchEl = document.getElementById('feed-search');
const feedTypeFilterEl = document.getElementById('feed-type-filter');

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

async function loadGallery() {
  const assets = await fetchJSON('/api/gallery');
  state.assets = assets;
  syncComposerSelection();
  renderGallery();
  renderComposerLibrary();
  renderComposerTimeline();
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

async function handleGenerateAsset(event) {
  event.preventDefault();
  const prompt = studioPromptEl.value.trim();
  if (!prompt) return;
  const type = studioAssetTypeEl.value;
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
  } catch (error) {
    console.error(error);
    alert('Generation failed. Ensure your API key is configured.');
  }
}

async function loadGalleries() {
  const galleries = await fetchJSON('/api/galleries');
  state.galleries = galleries;
  syncComposerSelection();
  populateGalleryFilter();
  renderGallery();
  renderStudioGalleries();
  renderComposerLibrary();
  populateComposerSources();
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

newConversationBtn.addEventListener('click', createConversation);
chatFormEl.addEventListener('submit', sendMessage);
feedSearchEl.addEventListener('input', handleFeedSearch);
feedTypeFilterEl.addEventListener('change', handleFeedTypeChange);
studioToggleBtn.addEventListener('click', () => toggleStudio(true));
studioCloseBtn.addEventListener('click', () => toggleStudio(false));
studioGenerateForm.addEventListener('submit', handleGenerateAsset);
studioAssetTypeEl.addEventListener('change', () => {
  syncDurationVisibility();
});
studioGalleryForm.addEventListener('submit', handleCreateGallery);
studioGallerySearchEl.addEventListener('input', handleGallerySearch);
studioGalleryFilterEl.addEventListener('change', handleGalleryFilter);
composerGallerySelectEl.addEventListener('change', (event) => {
  handleComposerSourceChange(event);
});
composerRenderBtn.addEventListener('click', handleComposerRender);
composerClearBtn.addEventListener('click', () => {
  state.composer.selectedAssets = [];
  renderComposerTimeline();
  renderComposerLibrary();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && studioEl.classList.contains('is-open')) {
    toggleStudio(false);
  }
});

initialiseStudioNavigation();
syncDurationVisibility();
loadConversations();
loadGallery();
loadGalleries();
