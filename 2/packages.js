/**
 * IPAPPLUS ARCHIVE — Package Catalog Engine
 * Deb RFC 822 Parser, Filter, and Architecture Build Manager
 */

(() => {
  'use strict';

  let rawPackages = [];
  let unifiedPackages = [];
  let activeFilter = 'all';
  let searchQuery = '';

  const packagesContainer = document.getElementById('packages-stream');
  const searchInput = document.getElementById('catalog-search');
  const statusElement = document.getElementById('catalog-count-label');
  const dialogBackdrop = document.getElementById('build-dialog-backdrop');
  const dialogTitle = document.getElementById('build-dialog-title');
  const dialogList = document.getElementById('build-dialog-list');
  const dialogCloseBtn = document.getElementById('build-dialog-close');

  function getArchLabel(arch) {
    if (!arch) return 'Universal';
    const a = arch.toLowerCase();
    if (a.includes('arm64e')) return 'RootHide';
    if (a.includes('arm64')) return 'Rootless';
    if (a === 'iphoneos-arm' || a.includes('arm')) return 'Rootful';
    return arch;
  }

  function formatBytes(bytes) {
    if (!bytes || isNaN(bytes)) return '';
    const num = parseInt(bytes, 10);
    if (num < 1024) return num + ' B';
    if (num < 1048576) return (num / 1024).toFixed(1) + ' KB';
    return (num / 1048576).toFixed(1) + ' MB';
  }

  function sanitizeText(str) {
    if (!str) return '';
    // Strip emojis to maintain strict typographical standards
    return str
      .replace(/[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}]/gu, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function parseDebianPackages(text) {
    const records = text.split(/\n\n+/);
    const parsed = [];

    for (const record of records) {
      if (!record.trim()) continue;
      const lines = record.split(/\n/);
      const entry = {};
      let currentKey = null;

      for (const line of lines) {
        if (/^\s+/.test(line)) {
          if (currentKey && entry[currentKey]) {
            entry[currentKey] += ' ' + line.trim();
          }
        } else {
          const colonIdx = line.indexOf(':');
          if (colonIdx > 0) {
            currentKey = line.slice(0, colonIdx).trim().toLowerCase();
            entry[currentKey] = line.slice(colonIdx + 1).trim();
          }
        }
      }

      if (entry.package) {
        parsed.push(entry);
      }
    }
    return parsed;
  }

  function aggregatePackages(raw) {
    const map = new Map();

    for (const item of raw) {
      const pkgId = item.package;
      if (!map.has(pkgId)) {
        map.set(pkgId, {
          id: pkgId,
          name: item.name || pkgId,
          author: item.author || item.maintainer || 'Independent Contributor',
          description: item.description || 'System tweak package for iOS environments.',
          section: item.section || 'Tweaks',
          builds: []
        });
      }

      const record = map.get(pkgId);
      const arch = item.architecture || 'iphoneos-arm';
      const cleanArch = getArchLabel(arch);
      const debFilename = item.filename || '';
      const downloadUrl = debFilename.startsWith('http')
        ? debFilename
        : 'https://ipapplus.github.io/' + debFilename.replace(/^\.?\//, '');

      record.builds.push({
        architecture: arch,
        archLabel: cleanArch,
        version: item.version || '1.0',
        size: item.size || 0,
        url: downloadUrl
      });
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  function openBuildModal(pkg) {
    if (!dialogBackdrop || !dialogTitle || !dialogList) return;
    dialogTitle.textContent = pkg.name;
    dialogList.innerHTML = '';

    pkg.builds.forEach(build => {
      const item = document.createElement('div');
      item.className = 'dialog-build-item';
      item.innerHTML = `
        <div>
          <strong>${sanitizeText(build.archLabel)}</strong>
          <span style="color: var(--text-secondary); margin-left: 8px;">v${sanitizeText(build.version)}</span>
          <span style="color: var(--text-muted); margin-left: 6px;">(${formatBytes(build.size)})</span>
        </div>
        <a href="${build.url}" class="btn-primary" style="min-height: 40px; padding: 6px 14px; font-size: var(--step-small);" download>
          Download .deb
        </a>
      `;
      dialogList.appendChild(item);
    });

    dialogBackdrop.classList.add('is-visible');
    dialogBackdrop.setAttribute('aria-hidden', 'false');
  }

  function closeBuildModal() {
    if (!dialogBackdrop) return;
    dialogBackdrop.classList.remove('is-visible');
    dialogBackdrop.setAttribute('aria-hidden', 'true');
  }

  if (dialogCloseBtn) {
    dialogCloseBtn.addEventListener('click', closeBuildModal);
  }

  if (dialogBackdrop) {
    dialogBackdrop.addEventListener('click', (e) => {
      if (e.target === dialogBackdrop) closeBuildModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeBuildModal();
  });

  function renderPackages() {
    if (!packagesContainer) return;

    const filtered = unifiedPackages.filter(pkg => {
      // 1. Architecture Filter
      if (activeFilter !== 'all') {
        const matchesArch = pkg.builds.some(b => b.archLabel.toLowerCase() === activeFilter.toLowerCase());
        if (!matchesArch) return false;
      }

      // 2. Search Query Filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const inName = pkg.name.toLowerCase().includes(q);
        const inId = pkg.id.toLowerCase().includes(q);
        const inDesc = pkg.description.toLowerCase().includes(q);
        const inAuthor = pkg.author.toLowerCase().includes(q);
        if (!inName && !inId && !inDesc && !inAuthor) return false;
      }

      return true;
    });

    if (statusElement) {
      statusElement.textContent = `Showing ${filtered.length} of ${unifiedPackages.length} archived packages`;
    }

    if (filtered.length === 0) {
      packagesContainer.innerHTML = `
        <div style="background: var(--bg-surface); padding: var(--space-6); text-align: center; border-radius: var(--radius-subtle);">
          <p style="font-size: var(--step-subhead); font-weight: 700; margin-bottom: 8px;">No archived packages found</p>
          <p style="color: var(--text-secondary); margin-bottom: 16px;">No entries matched your search query or architecture filter.</p>
          <button id="reset-catalog-btn" class="btn-secondary">Reset Search Filters</button>
        </div>
      `;
      const resetBtn = document.getElementById('reset-catalog-btn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          if (searchInput) searchInput.value = '';
          searchQuery = '';
          activeFilter = 'all';
          document.querySelectorAll('.filter-pill').forEach(p => {
            p.classList.toggle('is-active', p.getAttribute('data-arch') === 'all');
          });
          renderPackages();
        });
      }
      return;
    }

    // Render package docket entries
    const htmlFragments = filtered.map(pkg => {
      const archTags = Array.from(new Set(pkg.builds.map(b => b.archLabel)))
        .map(arch => `<span class="tag-badge ${arch === 'Rootless' ? 'tag-badge-vermilion' : ''}">${sanitizeText(arch)}</span>`)
        .join(' ');

      const latestBuild = pkg.builds[0];
      const hasMultipleBuilds = pkg.builds.length > 1;

      let actionHtml = '';
      if (hasMultipleBuilds) {
        actionHtml = `
          <button class="btn-secondary" data-action="open-builds" data-pkg-id="${pkg.id}">
            Select Build (${pkg.builds.length})
          </button>
        `;
      } else {
        actionHtml = `
          <a href="${latestBuild.url}" class="btn-primary" style="padding: 8px 16px; min-height: 44px; font-size: var(--step-small);" download>
            Download .deb (${formatBytes(latestBuild.size)})
          </a>
        `;
      }

      return `
        <article class="package-docket-entry">
          <div class="docket-topline">
            <h2 class="package-title">${sanitizeText(pkg.name)}</h2>
            <span class="package-version-label">v${sanitizeText(latestBuild.version)}</span>
          </div>
          <div class="docket-meta-row">
            <code class="docket-package-id">${sanitizeText(pkg.id)}</code>
            <span class="tag-badge">${sanitizeText(pkg.section)}</span>
            ${archTags}
          </div>
          <p class="package-description-text">${sanitizeText(pkg.description)}</p>
          <div class="docket-footer-bar">
            <span class="package-author-note">Maintainer: ${sanitizeText(pkg.author.replace(/<[^>]*>/g, '').trim())}</span>
            <div class="package-actions-cluster">
              ${actionHtml}
            </div>
          </div>
        </article>
      `;
    });

    packagesContainer.innerHTML = htmlFragments.join('');

    // Attach event listeners for multi-build buttons
    packagesContainer.querySelectorAll('[data-action="open-builds"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-pkg-id');
        const pkg = unifiedPackages.find(p => p.id === id);
        if (pkg) openBuildModal(pkg);
      });
    });
  }

  // Filter Pills Event Listeners
  const filterPills = document.querySelectorAll('.filter-pill');
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('is-active'));
      pill.classList.add('is-active');
      activeFilter = pill.getAttribute('data-arch') || 'all';
      renderPackages();
    });
  });

  // Search Input Event Listener
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderPackages();
    });
  }

  // Load Packages data
  async function initPackages() {
    try {
      const response = await fetch('./Packages');
      if (!response.ok) throw new Error('Failed to load Packages file');
      const text = await response.text();
      rawPackages = parseDebianPackages(text);
      unifiedPackages = aggregatePackages(rawPackages);
      renderPackages();
    } catch (err) {
      if (packagesContainer) {
        packagesContainer.innerHTML = `
          <div style="background: var(--bg-surface); padding: var(--space-6); border-radius: var(--radius-subtle);">
            <p style="font-weight: 700; color: var(--accent-vermilion); margin-bottom: 8px;">Catalog Index Loading Note</p>
            <p style="color: var(--text-secondary);">Unable to fetch Packages file directly. Please access using local HTTP server or verified APT mirror.</p>
          </div>
        `;
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPackages);
  } else {
    initPackages();
  }
})();
