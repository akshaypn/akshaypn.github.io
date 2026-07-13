const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-nav');
const header = document.querySelector('.site-header');

function setMenu(open) {
  if (!menuToggle || !nav) return;
  menuToggle.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('is-open', open);
  document.body.classList.toggle('nav-open', open);
  const label = menuToggle.querySelector('.sr-only');
  if (label) label.textContent = open ? 'Close navigation' : 'Open navigation';
}

if (menuToggle && nav) {
  menuToggle.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') === 'true';
    setMenu(!open);
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMenu(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenu(false);
  });

  document.addEventListener('click', (event) => {
    if (header && !header.contains(event.target)) setMenu(false);
  });
}

function updateHeader() {
  if (header) header.classList.toggle('is-scrolled', window.scrollY > 24);
}

updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

const navigationLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
const navigationSections = navigationLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

if ('IntersectionObserver' in window) {
  const navigationObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navigationLinks.forEach((link) => {
        const active = link.getAttribute('href') === `#${entry.target.id}`;
        if (active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-32% 0px -58% 0px' });
  navigationSections.forEach((section) => navigationObserver.observe(section));
}

const revealObserver = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
  : null;

function watchReveals(root = document) {
  const elements = root.querySelectorAll('.focus-card, .release-card, .artifact-card, .method-card, .timeline article, .publication-list > *');
  elements.forEach((element) => {
    if (element.dataset.revealBound) return;
    element.dataset.revealBound = 'true';
    if (revealObserver) {
      element.classList.add('reveal-ready');
      revealObserver.observe(element);
    }
  });
}

watchReveals();

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

const artifactGrid = document.getElementById('artifact-grid');
const artifactStatus = document.getElementById('artifact-status');
const artifactMore = document.getElementById('artifact-more');
const artifactFilters = document.querySelectorAll('[data-artifact-filter]');
let artifactSnapshot = null;
let activeArtifactFilter = 'models';
const expandedArtifactFilters = new Set();

function compactNumber(value) {
  if (!Number.isFinite(value)) return 'Not listed';
  return new Intl.NumberFormat('en', {
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1
  }).format(value);
}

function friendlyDate(value, includeYear = true) {
  if (!value) return 'Not listed';
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
  const expanded = expandedArtifactFilters.has(activeArtifactFilter);
  const visibleArtifacts = expanded ? artifacts : artifacts.slice(0, 4);
  artifactGrid.replaceChildren(...visibleArtifacts.map(buildArtifactCard));
  artifactGrid.setAttribute('aria-busy', 'false');
  watchReveals(artifactGrid);

  const categoryName = activeArtifactFilter === 'models' ? 'models and checkpoints' : activeArtifactFilter;
  const countText = visibleArtifacts.length === artifacts.length ? `${artifacts.length}` : `Showing ${visibleArtifacts.length} of ${artifacts.length}`;
  artifactStatus.textContent = `${countText} ${categoryName} · Hugging Face snapshot ${friendlyDate(artifactSnapshot.updatedAt)} · monthly downloads do not represent unique users.`;

  if (artifactMore) {
    const remaining = artifacts.length - 4;
    artifactMore.hidden = artifacts.length <= 4;
    artifactMore.setAttribute('aria-expanded', String(expanded));
    artifactMore.textContent = expanded ? `Show fewer ${categoryName}` : `Show ${remaining} more ${categoryName}`;
  }
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

if (artifactMore) {
  artifactMore.addEventListener('click', () => {
    if (expandedArtifactFilters.has(activeArtifactFilter)) expandedArtifactFilters.delete(activeArtifactFilter);
    else expandedArtifactFilters.add(activeArtifactFilter);
    renderArtifacts();
  });
}

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
      artifactStatus.textContent = 'Repository statistics are unavailable. Public repository links remain available.';
      const fallback = document.createElement('a');
      fallback.href = 'https://huggingface.co/qvac';
      fallback.target = '_blank';
      fallback.rel = 'noreferrer';
      fallback.textContent = 'Browse QVAC artifacts on Hugging Face ↗';
      fallback.className = 'text-link';
      artifactGrid.replaceChildren(fallback);
    });
}
