/**
 * IPAPPLUS — Package Catalog Engine
 * Deb RFC 822 Stream Parser, Filter, and Architecture Build Manager
 */

(() => {
  'use strict';

  let rawPackages = [];
  let unifiedPackages = [];
  let currentArchFilter = 'all';
  let currentSearchQuery = '';

  const packagesGrid = document.getElementById('packages-grid');
  const searchField = document.getElementById('catalog-search-field');
  const countIndicator = document.getElementById('catalog-count-indicator');
  const modalScrim = document.getElementById('build-modal-scrim');
  const modalTitle = document.getElementById('modal-pkg-title');
  const modalBuildsList = document.getElementById('modal-builds-list');
  const modalCloseBtn = document.getElementById('modal-close-btn');

  function getArchitectureLabel(arch) {
    if (!arch) return 'Universal';
    const a = arch.toLowerCase();
    if (a.includes('arm64e')) return 'RootHide';
    if (a.includes('arm64')) return 'Rootless';
    if (a === 'iphoneos-arm' || a.includes('arm')) return 'Rootful';
    return arch;
  }

  function formatFileSize(bytes) {
    if (!bytes || isNaN(bytes)) return '';
    const n = parseInt(bytes, 10);
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }

  function sanitizeCopy(text) {
    if (!text) return '';
    return text
      .replace(/[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}]/gu, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function parseRFC822Packages(content) {
    const records = content.split(/\n\n+/);
    const parsed = [];

    for (const record of records) {
      if (!record.trim()) continue;
      const lines = record.split(/\n/);
      const entry = {};
      let activeKey = null;

      for (const line of lines) {
        if (/^\s+/.test(line)) {
          if (activeKey && entry[activeKey]) {
            entry[activeKey] += ' ' + line.trim();
          }
        } else {
          const colon = line.indexOf(':');
          if (colon > 0) {
            activeKey = line.slice(0, colon).trim().toLowerCase();
            entry[activeKey] = line.slice(colon + 1).trim();
          }
        }
      }

      if (entry.package) {
        parsed.push(entry);
      }
    }
    return parsed;
  }

  function consolidatePackages(rawList) {
    const map = new Map();

    for (const item of rawList) {
      const pkgId = item.package;
      if (!map.has(pkgId)) {
        map.set(pkgId, {
          id: pkgId,
          name: item.name || pkgId,
          author: item.author || item.maintainer || 'Independent Contributor',
          description: item.description || 'Verified tweak package for iOS environments.',
          section: item.section || 'Tweaks',
          builds: []
        });
      }

      const entry = map.get(pkgId);
      const rawArch = item.architecture || 'iphoneos-arm';
      const cleanArch = getArchitectureLabel(rawArch);
      const filename = item.filename || '';
      const downloadUrl = filename.startsWith('http')
        ? filename
        : 'https://ipapplus.github.io/' + filename.replace(/^\.?\//, '');

      entry.builds.push({
        architecture: rawArch,
        archLabel: cleanArch,
        version: item.version || '1.0',
        size: item.size || 0,
        url: downloadUrl
      });
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  function openBuildPicker(pkg) {
    if (!modalScrim || !modalTitle || !modalBuildsList) return;
    modalTitle.textContent = pkg.name;
    modalBuildsList.innerHTML = '';

    pkg.builds.forEach(build => {
      const row = document.createElement('div');
      row.className = 'build-variant-row';
      const archClass = build.archLabel === 'Rootless' ? 'tech-tag-teal' : (build.archLabel === 'RootHide' ? 'tech-tag-blue' : '');
      row.innerHTML = `
        <div>
          <span class="tech-tag-chip ${archClass}">${sanitizeCopy(build.archLabel)}</span>
          <span style="font-weight: 700; margin-left: 8px;">v${sanitizeCopy(build.version)}</span>
          <span style="color: var(--text-muted); font-size: var(--step-small); margin-left: 6px;">(${formatFileSize(build.size)})</span>
        </div>
        <a href="${build.url}" class="cta-shimmer-btn" style="min-height: 40px; padding: 6px 14px; font-size: var(--step-small);" download>
          Download .deb
        </a>
      `;
      modalBuildsList.appendChild(row);
    });

    modalScrim.classList.add('is-open');
    modalScrim.setAttribute('aria-hidden', 'false');
  }

  function closeBuildPicker() {
    if (!modalScrim) return;
    modalScrim.classList.remove('is-open');
    modalScrim.setAttribute('aria-hidden', 'true');
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeBuildPicker);
  if (modalScrim) {
    modalScrim.addEventListener('click', (e) => {
      if (e.target === modalScrim) closeBuildPicker();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeBuildPicker();
  });

  function renderCatalogFeed() {
    if (!packagesGrid) return;

    const filtered = unifiedPackages.filter(pkg => {
      if (currentArchFilter !== 'all') {
        const hasArch = pkg.builds.some(b => b.archLabel.toLowerCase() === currentArchFilter.toLowerCase());
        if (!hasArch) return false;
      }

      if (currentSearchQuery) {
        const q = currentSearchQuery.toLowerCase();
        const matchName = pkg.name.toLowerCase().includes(q);
        const matchId = pkg.id.toLowerCase().includes(q);
        const matchDesc = pkg.description.toLowerCase().includes(q);
        const matchAuthor = pkg.author.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchDesc && !matchAuthor) return false;
      }

      return true;
    });

    if (countIndicator) {
      countIndicator.textContent = `Showing ${filtered.length} of ${unifiedPackages.length} verified packages`;
    }

    if (filtered.length === 0) {
      packagesGrid.innerHTML = `
        <div style="background: var(--bg-card); padding: 40px 24px; text-align: center; border-radius: var(--radius-lg);">
          <p style="font-size: var(--step-subhead); font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">No packages found</p>
          <p style="color: var(--text-secondary); margin-bottom: 20px;">No packages match your search query or architecture criteria.</p>
          <button id="btn-clear-search" class="btn-tech-secondary">Clear Search &amp; Filters</button>
        </div>
      `;
      const clearBtn = document.getElementById('btn-clear-search');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          if (searchField) searchField.value = '';
          currentSearchQuery = '';
          currentArchFilter = 'all';
          document.querySelectorAll('.arch-filter-btn').forEach(btn => {
            btn.classList.toggle('is-selected', btn.getAttribute('data-arch') === 'all');
          });
          renderCatalogFeed();
        });
      }
      return;
    }

    const cardsHtml = filtered.map(pkg => {
      const archPills = Array.from(new Set(pkg.builds.map(b => b.archLabel)))
        .map(arch => {
          const archClass = arch === 'Rootless' ? 'tech-tag-teal' : (arch === 'RootHide' ? 'tech-tag-blue' : '');
          return `<span class="tech-tag-chip ${archClass}">${sanitizeCopy(arch)}</span>`;
        })
        .join(' ');

      const mainBuild = pkg.builds[0];
      const hasVariants = pkg.builds.length > 1;

      let actionMarkup = '';
      if (hasVariants) {
        actionMarkup = `
          <button type="button" class="btn-tech-secondary" data-trigger="open-variants" data-pkg-id="${pkg.id}">
            Select Build (${pkg.builds.length})
          </button>
        `;
      } else {
        actionMarkup = `
          <a href="${mainBuild.url}" class="cta-shimmer-btn" style="min-height: 42px; padding: 8px 16px; font-size: var(--step-small);" download>
            Download .deb (${formatFileSize(mainBuild.size)})
          </a>
        `;
      }

      return `
        <article class="package-item-card">
          <div class="card-topline">
            <h2 class="pkg-title">${sanitizeCopy(pkg.name)}</h2>
            <span class="pkg-version-pill">v${sanitizeCopy(mainBuild.version)}</span>
          </div>
          <div class="card-meta-chips">
            <code class="pkg-id-code">${sanitizeCopy(pkg.id)}</code>
            <span class="tech-tag-chip">${sanitizeCopy(pkg.section)}</span>
            ${archPills}
          </div>
          <p class="pkg-description">${sanitizeCopy(pkg.description)}</p>
          <div class="card-action-bar">
            <span class="pkg-author-label">Maintainer: ${sanitizeCopy(pkg.author.replace(/<[^>]*>/g, '').trim())}</span>
            <div>
              ${actionMarkup}
            </div>
          </div>
        </article>
      `;
    });

    packagesGrid.innerHTML = cardsHtml.join('');

    packagesGrid.querySelectorAll('[data-trigger="open-variants"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-pkg-id');
        const found = unifiedPackages.find(p => p.id === id);
        if (found) openBuildPicker(found);
      });
    });
  }

  // Filter Event Listeners
  const filterButtons = document.querySelectorAll('.arch-filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      currentArchFilter = btn.getAttribute('data-arch') || 'all';
      renderCatalogFeed();
    });
  });

  // Search Field Input
  if (searchField) {
    searchField.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value.trim();
      renderCatalogFeed();
    });
  }

  // Fetch and Initialize Packages
  async function loadRepositoryCatalog() {
    try {
      const resp = await fetch('./Packages');
      if (!resp.ok) throw new Error('HTTP error ' + resp.status);
      const text = await resp.text();
      rawPackages = parseRFC822Packages(text);
      unifiedPackages = consolidatePackages(rawPackages);
      renderCatalogFeed();
    } catch (err) {
      if (packagesGrid) {
        packagesGrid.innerHTML = `
          <div style="background: var(--bg-card); padding: 32px 20px; border-radius: var(--radius-lg);">
            <p style="font-weight: 700; color: var(--accent-blue); margin-bottom: 8px;">Repository Manifest Offline</p>
            <p style="color: var(--text-secondary);">Unable to stream live Packages manifest file. Verify HTTP server or deployment endpoint.</p>
          </div>
        `;
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadRepositoryCatalog);
  } else {
    loadRepositoryCatalog();
  }
})();
