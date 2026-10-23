/**
 * IPAPPLUS REPOSITORY — PACKAGE BROWSER RUNTIME
 * Apple-inspired iOS package feed, instant search, architecture filter, and build modal.
 */

(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const searchInput = $('package-search');
  const searchClear = $('search-clear');
  const packageList = $('package-list');
  const packageStatus = $('package-status');
  const resetFiltersBtn = $('reset-filters');
  const emptyState = $('empty-state');
  const emptyAction = $('empty-action');
  const archButtons = document.querySelectorAll('[data-architecture]');

  // Modal elements
  const modalScrim = $('build-modal-scrim');
  const modalTitle = $('modal-pkg-title');
  const modalList = $('modal-builds-list');
  const modalClose = $('modal-close-btn');

  const ARCH_LABELS = {
    'iphoneos-arm': 'Rootful',
    'iphoneos-arm64': 'Rootless',
    'iphoneos-arm64e': 'RootHide'
  };

  const ARCH_KEYS = {
    'iphoneos-arm': 'rootful',
    'iphoneos-arm64': 'rootless',
    'iphoneos-arm64e': 'roothide'
  };

  let allPackageGroups = [];
  let additionsMap = new Map();
  let selectedArch = '';
  let searchQuery = '';

  // --- Utility Functions ---
  function formatSize(bytes) {
    const n = Number(bytes);
    if (!bytes || !Number.isFinite(n) || n <= 0) return '';
    if (n < 1024) return `${n} B`;
    if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1048576).toFixed(1)} MB`;
  }

  const packageBaseURL = new URL('/', document.baseURI);

  function resolveDownloadURL(filename) {
    if (!filename) return '#';
    try {
      const url = new URL(filename.replace(/^\/+/, ''), packageBaseURL);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : filename;
    } catch (e) {
      return filename;
    }
  }

  function parseRFC822(text) {
    const rawBlocks = text.replace(/\r\n?/g, '\n').split(/\n[ \t]*\n/);
    const packages = [];

    for (let i = 0; i < rawBlocks.length; i++) {
      const block = rawBlocks[i].trim();
      if (!block) continue;
      const fields = {};
      let currentKey = '';

      const lines = block.split('\n');
      for (let j = 0; j < lines.length; j++) {
        const line = lines[j];
        if (/^[ \t]/.test(line)) {
          if (currentKey) {
            fields[currentKey] += '\n' + (line.trim() === '.' ? '' : line.slice(1));
          }
        } else {
          const colon = line.indexOf(':');
          if (colon > 0) {
            currentKey = line.slice(0, colon).trim();
            fields[currentKey] = line.slice(colon + 1).trim();
          }
        }
      }

      if (fields.Package) {
        packages.push(fields);
      }
    }
    return packages;
  }

  function cleanText(str) {
    return (str || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').replace(/\s+/g, ' ').trim();
  }

  function groupPackages(list) {
    const map = new Map();
    for (let i = 0; i < list.length; i++) {
      const pkg = list[i];
      const key = `${pkg.Package}@${pkg.Version || '1.0'}`;
      if (!map.has(key)) {
        map.set(key, {
          id: pkg.Package,
          name: cleanText(pkg.Name || pkg.Package),
          version: pkg.Version || '',
          section: pkg.Section || 'Tweaks',
          author: cleanText((pkg.Author || pkg.Maintainer || 'Unknown').replace(/<[^>]*>/g, '')),
          description: cleanText(pkg.Description) || 'No description provided.',
          builds: []
        });
      }
      map.get(key).builds.push(pkg);
    }
    return Array.from(map.values());
  }

  // --- Modal Bottom Sheet Controller ---
  function openBuildModal(pkgGroup) {
    if (!modalScrim) return;
    modalTitle.textContent = pkgGroup.name;
    modalList.innerHTML = '';

    pkgGroup.builds.forEach(build => {
      const arch = build.Architecture || 'iphoneos-arm';
      const archName = ARCH_LABELS[arch] || arch;
      const archKey = ARCH_KEYS[arch] || 'rootless';
      const url = resolveDownloadURL(build.Filename);
      const size = formatSize(build.Size);

      const row = document.createElement('a');
      row.className = 'variant-picker-row';
      row.href = url;
      row.download = '';
      row.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="pkg-arch-pill" data-arch="${archKey}">${archName}</span>
          <span style="font-size:0.875rem; color:var(--text-secondary);">${build.Version || pkgGroup.version}</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          ${size ? `<span style="font-size:0.75rem; color:var(--text-muted);">${size}</span>` : ''}
          <svg style="width:16px; height:16px; color:var(--accent-cyan);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </div>
      `;
      modalList.appendChild(row);
    });

    modalScrim.classList.add('is-active');
    modalScrim.setAttribute('aria-hidden', 'false');
  }

  function closeBuildModal() {
    if (!modalScrim) return;
    modalScrim.classList.remove('is-active');
    modalScrim.setAttribute('aria-hidden', 'true');
  }

  if (modalClose) modalClose.addEventListener('click', closeBuildModal);
  if (modalScrim) {
    modalScrim.addEventListener('click', e => {
      if (e.target === modalScrim) closeBuildModal();
    });
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalScrim && modalScrim.classList.contains('is-active')) {
      closeBuildModal();
    }
  });

  // --- Rendering & Filtering ---
  function renderFeed(filtered) {
    packageList.innerHTML = '';
    const total = allPackageGroups.length;
    const count = filtered.length;

    // Status strip
    if (packageStatus) {
      packageStatus.textContent = count === total
        ? `Showing ${total} packages`
        : `Showing ${count} of ${total} packages`;
    }

    if (resetFiltersBtn) {
      resetFiltersBtn.hidden = (selectedArch === '' && searchQuery === '');
    }

    // Empty state
    if (count === 0) {
      emptyState.hidden = false;
      packageList.hidden = true;
      return;
    }

    emptyState.hidden = true;
    packageList.hidden = false;

    const frag = document.createDocumentFragment();

    filtered.forEach(pkg => {
      const card = document.createElement('article');
      card.className = 'pkg-entry-card';
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-expanded', 'false');

      // Unique architectures available for this package
      const archs = Array.from(new Set(pkg.builds.map(b => b.Architecture || 'iphoneos-arm')));
      const archPillsHtml = archs.map(arch => {
        const key = ARCH_KEYS[arch] || 'rootless';
        const label = ARCH_LABELS[arch] || arch;
        return `<span class="pkg-arch-pill" data-arch="${key}">${label}</span>`;
      }).join('');

      // Min/representative size
      const sizes = pkg.builds.map(b => Number(b.Size)).filter(n => Number.isFinite(n) && n > 0);
      const minSize = sizes.length ? formatSize(Math.min(...sizes)) : '';

      // Added timestamp
      const addedRecord = additionsMap.get(`${pkg.id}@${pkg.version}`);
      const addedText = addedRecord ? window.RepoUI.formatRelativeTime(new Date(addedRecord)) : '';

      // Download Action
      const hasMultipleBuilds = pkg.builds.length > 1;
      const primaryUrl = resolveDownloadURL(pkg.builds[0].Filename);

      card.innerHTML = `
        <div class="pkg-header">
          <h2 class="pkg-title-text">${pkg.name}</h2>
          <div class="pkg-meta-row">
            ${pkg.author ? `<p class="pkg-author-text">${pkg.author}</p>` : ''}
            <div class="pkg-badge-cluster">
              <span class="pkg-ver-pill">${pkg.version}</span>
              ${archPillsHtml}
            </div>
          </div>
        </div>
        <p class="pkg-desc-text">${pkg.description}</p>
        <div class="pkg-bottom-actions">
          <div class="pkg-meta-strip">
            ${minSize ? `<span>${minSize}</span>` : ''}
            ${addedText ? `<span>• Added ${addedText}</span>` : ''}
          </div>
          <div class="pkg-action-buttons">
            <button type="button" class="btn-card-action" data-copy-link="${primaryUrl}" aria-label="Copy download link" title="Copy download link">
              <svg style="width:16px; height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="8" y="8" width="12" height="12" rx="2"></rect>
                <path d="M16 8V4H4v12h4"></path>
              </svg>
            </button>
            ${hasMultipleBuilds
              ? `<button type="button" class="btn-card-action btn-download-primary" data-open-builds="${pkg.id}@${pkg.version}">
                   <span>Builds (${pkg.builds.length})</span>
                   <svg style="width:14px; height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                 </button>`
              : `<a href="${primaryUrl}" download class="btn-card-action btn-download-primary" aria-label="Download .deb package" title="Download .deb package">
                   <svg style="width:16px; height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                     <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                     <polyline points="7 10 12 15 17 10"></polyline>
                     <line x1="12" y1="15" x2="12" y2="3"></line>
                   </svg>
                   <span>Get</span>
                 </a>`
            }
          </div>
        </div>
      `;

      // Expand card on click
      card.addEventListener('click', e => {
        if (e.target.closest('button, a')) return;
        const expanded = card.classList.toggle('is-expanded');
        card.setAttribute('aria-expanded', String(expanded));
      });

      frag.appendChild(card);
    });

    packageList.appendChild(frag);
  }

  function applyFilters() {
    const q = searchQuery.toLowerCase().trim();
    const filtered = allPackageGroups.filter(pkg => {
      // Architecture match
      if (selectedArch) {
        const matchesArch = pkg.builds.some(b => (b.Architecture || 'iphoneos-arm') === selectedArch);
        if (!matchesArch) return false;
      }
      // Search match
      if (q) {
        const haystack = `${pkg.name} ${pkg.id} ${pkg.description} ${pkg.author} ${pkg.builds.map(b => b.Filename || '').join(' ')}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    renderFeed(filtered);
  }

  // --- Event Handlers ---
  // Search input
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      if (searchClear) searchClear.hidden = !searchQuery;
      applyFilters();
    });
  }

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      searchClear.hidden = true;
      searchInput.focus();
      applyFilters();
    });
  }

  // Architecture buttons
  archButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      archButtons.forEach(b => {
        b.classList.remove('is-active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-pressed', 'true');
      selectedArch = btn.getAttribute('data-architecture') || '';
      applyFilters();
    });
  });

  // Reset filters
  function resetAllFilters() {
    searchQuery = '';
    selectedArch = '';
    if (searchInput) searchInput.value = '';
    if (searchClear) searchClear.hidden = true;
    archButtons.forEach(b => {
      const isAll = (b.getAttribute('data-architecture') || '') === '';
      b.classList.toggle('is-active', isAll);
      b.setAttribute('aria-pressed', String(isAll));
    });
    applyFilters();
  }

  if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', resetAllFilters);
  if (emptyAction) emptyAction.addEventListener('click', resetAllFilters);

  // Card delegations: Copy Download Link and Open Builds Modal
  document.addEventListener('click', e => {
    // Copy link
    const copyBtn = e.target.closest('[data-copy-link]');
    if (copyBtn) {
      e.stopPropagation();
      const link = copyBtn.getAttribute('data-copy-link');
      window.RepoUI.copyText(link, 'Download link copied');
      return;
    }

    // Open multi-build picker
    const buildsBtn = e.target.closest('[data-open-builds]');
    if (buildsBtn) {
      e.stopPropagation();
      const pkgKey = buildsBtn.getAttribute('data-open-builds');
      const target = allPackageGroups.find(p => `${p.id}@${p.version}` === pkgKey);
      if (target) openBuildModal(target);
      return;
    }
  });

  // --- Initializer ---
  async function init() {
    try {
      // 1. Fetch latest-additions.json if available
      try {
        const resAdditions = await fetch('latest-additions.json', { cache: 'no-cache' });
        if (resAdditions.ok) {
          const list = await resAdditions.json();
          if (Array.isArray(list)) {
            list.forEach(entry => {
              if (entry.package && entry.version && entry.addedAt) {
                additionsMap.set(`${entry.package}@${entry.version}`, entry.addedAt);
              }
            });
          }
        }
      } catch (e) {
        // Non-critical metadata
      }

      // 2. Fetch Packages index
      const resPackages = await fetch('Packages', { cache: 'no-cache' });
      if (!resPackages.ok) throw new Error('Failed to load Packages index');

      const lastMod = resPackages.headers.get('Last-Modified');
      const lastUpdatedEl = $('last-updated');
      if (lastUpdatedEl && lastMod) {
        const d = new Date(lastMod);
        lastUpdatedEl.textContent = `Last Updated: ${window.RepoUI.formatRelativeTime(d)}`;
      }

      const text = await resPackages.text();
      const rawList = parseRFC822(text);
      allPackageGroups = groupPackages(rawList);

      // Initial render
      applyFilters();
    } catch (err) {
      if (packageStatus) {
        packageStatus.textContent = 'Unable to load packages. Please check connection and tap refresh.';
      }
    }
  }

  // Refresh page button
  const refreshBtn = $('refresh-packages');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      window.location.reload();
    });
  }

  init();
})();
