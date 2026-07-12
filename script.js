const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-nav');

if (menuToggle && nav) {
  menuToggle.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!open));
    nav.classList.toggle('is-open', !open);
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menuToggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
    });
  });
}

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

const artifactGrid = document.getElementById('artifact-grid');
const artifactStatus = document.getElementById('artifact-status');
const artifactFilters = document.querySelectorAll('[data-artifact-filter]');
let artifactSnapshot = null;
let activeArtifactFilter = 'models';

function compactNumber(value) {
  if (!Number.isFinite(value)) return 'Not reported';
  return new Intl.NumberFormat('en', {
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1
  }).format(value);
}

function friendlyDate(value, includeYear = true) {
  if (!value) return 'Not reported';
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    ...(includeYear ? { year: 'numeric' } : {})
  }).format(new Date(value));
}

function appendTextElement(parent, tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  parent.appendChild(element);
  return element;
}

function buildArtifactCard(artifact) {
  const card = document.createElement('article');
  card.className = 'artifact-card';

  const top = document.createElement('div');
  top.className = 'artifact-card-top';
  appendTextElement(top, 'p', 'artifact-type', artifact.classification);
  appendTextElement(top, 'span', 'artifact-updated', `Updated ${friendlyDate(artifact.stats?.lastModified, false)}`);
  card.appendChild(top);

  const title = appendTextElement(card, 'h3', '', '');
  const titleLink = document.createElement('a');
  titleLink.href = artifact.links[0].url;
  titleLink.target = '_blank';
  titleLink.rel = 'noreferrer';
  titleLink.textContent = artifact.name;
  title.appendChild(titleLink);

  appendTextElement(card, 'p', 'artifact-capability', artifact.capability);

  const facts = document.createElement('ul');
  facts.className = 'artifact-facts';
  [artifact.scale, artifact.formats, artifact.task, artifact.size].forEach((fact) => {
    appendTextElement(facts, 'li', '', fact);
  });
  card.appendChild(facts);

  const signals = document.createElement('dl');
  signals.className = 'artifact-signals';
  [
    ['Monthly downloads', compactNumber(artifact.stats?.downloads)],
    ['Likes', compactNumber(artifact.stats?.likes)],
    ['License', artifact.stats?.license?.toUpperCase() ?? 'See card']
  ].forEach(([label, value]) => {
    const item = document.createElement('div');
    appendTextElement(item, 'dt', '', label);
    appendTextElement(item, 'dd', '', value);
    signals.appendChild(item);
  });
  card.appendChild(signals);

  appendTextElement(card, 'p', 'artifact-description', artifact.description);

  const results = document.createElement('ul');
  results.className = 'artifact-results';
  artifact.results.forEach((result) => appendTextElement(results, 'li', '', result));
  card.appendChild(results);

  const contribution = document.createElement('p');
  contribution.className = 'artifact-contribution';
  appendTextElement(contribution, 'strong', '', 'My contribution');
  contribution.append(document.createTextNode(artifact.contribution));
  card.appendChild(contribution);

  const links = document.createElement('div');
  links.className = 'artifact-links';
  artifact.links.forEach((link) => {
    const anchor = document.createElement('a');
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noreferrer';
    anchor.textContent = `${link.label} ↗`;
    links.appendChild(anchor);
  });
  card.appendChild(links);

  return card;
}

function renderArtifacts() {
  if (!artifactGrid || !artifactSnapshot) return;
  const artifacts = artifactSnapshot.artifacts.filter((artifact) => artifact.category === activeArtifactFilter);
  artifactGrid.replaceChildren(...artifacts.map(buildArtifactCard));
  artifactGrid.setAttribute('aria-busy', 'false');

  const categoryName = activeArtifactFilter === 'models' ? 'models and checkpoints' : activeArtifactFilter;
  artifactStatus.textContent = `${artifacts.length} ${categoryName} · Hugging Face snapshot ${friendlyDate(artifactSnapshot.updatedAt)} · downloads represent the last month, not unique users.`;
}

artifactFilters.forEach((button) => {
  button.addEventListener('click', () => {
    activeArtifactFilter = button.dataset.artifactFilter;
    artifactFilters.forEach((filter) => {
      const selected = filter === button;
      filter.classList.toggle('is-active', selected);
      filter.setAttribute('aria-pressed', String(selected));
    });
    renderArtifacts();
  });
});

if (artifactGrid && artifactStatus) {
  fetch('data/hf-artifacts.json')
    .then((response) => {
      if (!response.ok) throw new Error(`Artifact snapshot returned ${response.status}`);
      return response.json();
    })
    .then((snapshot) => {
      artifactSnapshot = snapshot;
      renderArtifacts();
    })
    .catch(() => {
      artifactGrid.setAttribute('aria-busy', 'false');
      artifactStatus.textContent = 'The artifact snapshot is temporarily unavailable.';
      const fallback = document.createElement('a');
      fallback.href = 'https://huggingface.co/qvac';
      fallback.target = '_blank';
      fallback.rel = 'noreferrer';
      fallback.textContent = 'Browse QVAC artifacts on Hugging Face ↗';
      fallback.className = 'text-link';
      artifactGrid.replaceChildren(fallback);
    });
}
