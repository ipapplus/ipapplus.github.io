(function() {
  'use strict';

  const $ = id => document.getElementById(id);
  const searchInput = $('package-search');
  const searchClear = $('search-clear');
  const packageList = $('package-list');
  const packageStatus = $('package-status');
  const resetFiltersBtn = $('reset-filters');
  const emptyState = $('empty-state');
  const emptyHeading = $('empty-heading');
  const emptyMessage = $('empty-message');
  const emptyAction = $('empty-action');
  const backToTopBtn = $('back-to-top');
  const filterBtns = [...document.querySelectorAll('[data-architecture]')];

  const archKeyMap = {
    'iphoneos-arm': 'archRootful',
    'iphoneos-arm64': 'archRootless',
    'iphoneos-arm64e': 'archRootHide'
  };

  const archOrder = ['iphoneos-arm', 'iphoneos-arm64', 'iphoneos-arm64e'];

  function archDisplayName(arch) {
    const key = archKeyMap[arch];
    if (key && window.RepoUI) {
      return RepoUI.t(key);
    }
    return arch || 'Other';
  }

  const downloadIconSvg = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg>';
  const copyIconOrigSvg = '<svg aria-hidden="true" class="copy-orig-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></svg>';
  const copyIconCheckSvg = '<svg aria-hidden="true" class="copy-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  const closeIconSvg = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

  const indexURL = new URL('Packages', document.baseURI);
  const packageBaseURL = new URL('/', indexURL);

  let entries = [];
  let selectedArch = '';
  let activeEntryForSheet = null;
  let expandedEntry = null;
  let loadState = 'loading';
  let addedDates = new Map();

  // Create build choices sheet modal dynamically
  let buildModalBackdrop = document.querySelector('.build-modal-backdrop');
  if (!buildModalBackdrop) {
    buildModalBackdrop = document.createElement('div');
    buildModalBackdrop.className = 'build-modal-backdrop';
    document.body.appendChild(buildModalBackdrop);
  }

  let buildSheet = document.getElementById('build-menu');
  if (!buildSheet) {
    buildSheet = document.createElement('div');
    buildSheet.id = 'build-menu';
    buildSheet.className = 'package-choices-sheet';
    buildSheet.setAttribute('role', 'dialog');
    buildSheet.setAttribute('aria-modal', 'true');
    buildSheet.setAttribute('aria-label', 'Choose architecture build');
    document.body.appendChild(buildSheet);
  }

  function resolveDownloadURL(filename) {
    if (!filename) return null;
    try {
      const url = new URL(filename, packageBaseURL);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch (e) {
      return null;
    }
  }

  function formatSize(val) {
    const size = Number(val);
    if (!val || !Number.isFinite(size) || size <= 0) return '';
    if (size < 1024) return size + ' B';
    if (size < 1048576) return (size / 1024).toFixed(1) + ' KB';
    return (size / 1048576).toFixed(1) + ' MB';
  }

  function stripEmoji(text) {
    if (!text) return '';
    return text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
  }

  function parsePackagesText(rawText) {
    return rawText.replace(/\r\n?/g, '\n').split(/\n[ \t]*\n/).filter(b => b.trim()).map(block => {
      const fields = Object.create(null);
      let curKey = '';
      for (const line of block.split('\n')) {
        if (/^[ \t]/.test(line)) {
          if (curKey) fields[curKey] += '\n' + (line.trim() === '.' ? '' : line.slice(1));
        } else {
          const colon = line.indexOf(':');
          curKey = colon > 0 ? line.slice(0, colon) : '';
          if (curKey) fields[curKey] = line.slice(colon + 1).trim();
        }
      }
      return fields;
    });
  }

  function groupPackageBuilds(pkgList) {
    const groups = new Map();
    for (const pkg of pkgList) {
      if (!pkg.Package) continue;
      const key = pkg.Package + '::' + (pkg.Version || '0');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(pkg);
    }
    return [...groups.values()];
  }

  function getDeveloperName(group) {
    for (const field of ['Author', 'Maintainer']) {
      for (const pkg of group) {
        const name = (pkg[field] || '').replace(/<[^>]*>/g, '').trim();
        if (name) return name;
      }
    }
    return '';
  }

  function closeBuildSheet() {
    buildSheet.classList.remove('is-open');
    buildModalBackdrop.classList.remove('is-open');
    activeEntryForSheet = null;
  }

  buildModalBackdrop.addEventListener('click', closeBuildSheet);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && buildSheet.classList.contains('is-open')) {
      closeBuildSheet();
    }
  });

  function openBuildSheet(entry) {
    activeEntryForSheet = entry;
    const fragment = document.createDocumentFragment();

    const header = document.createElement('div');
    header.className = 'sheet-header';

    const title = document.createElement('h3');
    title.className = 'sheet-title';
    title.textContent = RepoUI.t('chooseBuildTitle');
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'icon-btn';
    closeBtn.setAttribute('aria-label', RepoUI.t('closeMenu'));
    closeBtn.innerHTML = closeIconSvg;
    closeBtn.addEventListener('click', closeBuildSheet);
    header.appendChild(closeBtn);

    fragment.appendChild(header);

    const listContainer = document.createElement('div');
    listContainer.className = 'sheet-builds-list';

    for (const variant of entry.available) {
      const row = document.createElement('div');
      row.className = 'build-option-row';

      const info = document.createElement('div');
      info.className = 'build-option-info';

      const archName = document.createElement('span');
      archName.className = 'build-arch-name';
      archName.textContent = archDisplayName(variant.pkg.Architecture);
      info.appendChild(archName);

      const sizeStr = formatSize(variant.pkg.Size);
      if (sizeStr) {
        const sizeSpan = document.createElement('span');
        sizeSpan.className = 'build-file-size';
        sizeSpan.innerHTML = '<bdi>' + sizeStr + '</bdi>';
        info.appendChild(sizeSpan);
      }
      row.appendChild(info);

      const actions = document.createElement('div');
      actions.className = 'build-option-actions';

      const dlLink = document.createElement('a');
      dlLink.className = 'btn-build-download';
      dlLink.href = variant.url;
      dlLink.setAttribute('download', '');
      dlLink.innerHTML = downloadIconSvg + '<span>' + RepoUI.t('download') + '</span>';
      dlLink.addEventListener('click', () => closeBuildSheet());
      actions.appendChild(dlLink);

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'btn-build-copy';
      copyBtn.setAttribute('aria-label', RepoUI.t('copyDownloadLink') + ' · ' + archDisplayName(variant.pkg.Architecture));
      copyBtn.innerHTML = copyIconOrigSvg + '<span>' + RepoUI.t('copyRepoUrl') + '</span>';
      copyBtn.addEventListener('click', async () => {
        closeBuildSheet();
        await handleCopyLink(entry, variant.url, null);
      });
      actions.appendChild(copyBtn);

      row.appendChild(actions);
      listContainer.appendChild(row);
    }

    fragment.appendChild(listContainer);
    buildSheet.replaceChildren(fragment);

    buildModalBackdrop.classList.add('is-open');
    buildSheet.classList.add('is-open');
  }

  async function handleCopyLink(entry, url, copyBtnElement) {
    try {
      await RepoUI.copyText(url);
      RepoUI.toast(RepoUI.t('linkCopied'));
      if (copyBtnElement) {
        copyBtnElement.classList.add('is-copied');
        const textSpan = copyBtnElement.querySelector('.btn-copy-label');
        if (textSpan) textSpan.textContent = RepoUI.t('linkCopied');
        clearTimeout(copyBtnElement._copyTimer);
        copyBtnElement._copyTimer = setTimeout(() => {
          copyBtnElement.classList.remove('is-copied');
          if (textSpan) textSpan.textContent = RepoUI.t('copyDownloadLink');
        }, 2200);
      }
    } catch (e) {
      RepoUI.toast(RepoUI.t('unableToCopy'));
    }
  }

  function toggleCardExpansion(entry) {
    const isExpanding = expandedEntry !== entry;
    if (expandedEntry) {
      expandedEntry.card.classList.remove('is-expanded');
      expandedEntry.expandBtn.setAttribute('aria-expanded', 'false');
      expandedEntry = null;
    }
    if (isExpanding) {
      expandedEntry = entry;
      entry.card.classList.add('is-expanded');
      entry.expandBtn.setAttribute('aria-expanded', 'true');
    }
  }

  function createPackageCard(group, index) {
    const primary = group[0];
    const name = primary.Name || primary.Package || 'Unnamed Package';
    const version = primary.Version ? 'v' + primary.Version.replace(/^v+/i, '') : '';
    const developer = getDeveloperName(group);

    const card = document.createElement('article');
    card.className = 'package-entry';
    card.id = 'tweak-card-' + index;

    // Header row
    const headerRow = document.createElement('div');
    headerRow.className = 'card-header-row';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'card-title-group';

    const h2 = document.createElement('h2');
    const expandBtn = document.createElement('button');
    expandBtn.type = 'button';
    expandBtn.className = 'package-expand-btn';
    expandBtn.textContent = name;
    expandBtn.setAttribute('aria-expanded', 'false');
    expandBtn.setAttribute('aria-controls', 'tweak-desc-' + index);
    h2.appendChild(expandBtn);
    titleGroup.appendChild(h2);

    // Badges row
    const badgesRow = document.createElement('div');
    badgesRow.className = 'card-badges-row';

    if (version) {
      const vBadge = document.createElement('span');
      vBadge.className = 'badge-version';
      vBadge.innerHTML = '<bdi class="tweak-version">' + version + '</bdi>';
      badgesRow.appendChild(vBadge);
    }

    const archBadge = document.createElement('span');
    archBadge.className = 'badge-arch';
    badgesRow.appendChild(archBadge);

    if (developer) {
      const devSpan = document.createElement('span');
      devSpan.className = 'card-developer';
      devSpan.textContent = developer.startsWith('@') ? developer : '@' + developer;
      badgesRow.appendChild(devSpan);
    }
    titleGroup.appendChild(badgesRow);
    headerRow.appendChild(titleGroup);

    // Actions in top corner
    const actionsGroup = document.createElement('div');
    actionsGroup.className = 'card-actions-group';

    const dlAction = document.createElement('a');
    dlAction.className = 'btn-action-download';
    dlAction.innerHTML = downloadIconSvg + '<span class="btn-dl-label">' + RepoUI.t('download') + '</span>';
    dlAction.setAttribute('download', '');
    actionsGroup.appendChild(dlAction);

    const copyAction = document.createElement('button');
    copyAction.type = 'button';
    copyAction.className = 'btn-action-copy';
    copyAction.innerHTML = copyIconOrigSvg + copyIconCheckSvg + '<span class="btn-copy-label">' + RepoUI.t('copyDownloadLink') + '</span>';
    actionsGroup.appendChild(copyAction);

    headerRow.appendChild(actionsGroup);
    card.appendChild(headerRow);

    // Description snippet (sanitized of emoji)
    const descP = document.createElement('p');
    descP.id = 'tweak-desc-' + index;
    descP.className = 'card-description';
    descP.textContent = stripEmoji(primary.Description) || RepoUI.t('noDescription');
    card.appendChild(descP);

    // Meta footer
    const metaFooter = document.createElement('div');
    metaFooter.className = 'card-meta-footer';

    const sizeTimeGroup = document.createElement('div');
    sizeTimeGroup.className = 'meta-size-time';

    const sizeSpan = document.createElement('span');
    sizeSpan.className = 'card-size';
    sizeTimeGroup.appendChild(sizeSpan);

    const addedAtTime = addedDates.get(RepoUI.versionKey(primary.Package, primary.Version));
    if (addedAtTime) {
      const timeEl = document.createElement('time');
      timeEl.className = 'card-added-time';
      timeEl.dateTime = addedAtTime;
      timeEl.textContent = '· ' + RepoUI.additionTime(new Date(addedAtTime));
      sizeTimeGroup.appendChild(timeEl);
    }
    metaFooter.appendChild(sizeTimeGroup);

    const detailsIndicator = document.createElement('span');
    detailsIndicator.className = 'meta-expand-indicator';
    detailsIndicator.textContent = RepoUI.t('detailsLabel');
    metaFooter.appendChild(detailsIndicator);

    card.appendChild(metaFooter);

    // Expanded technical drawer
    const drawer = document.createElement('div');
    drawer.className = 'card-expanded-drawer';

    function addDetail(keyText, valHtml) {
      const row = document.createElement('div');
      row.className = 'detail-row';
      const k = document.createElement('span');
      k.className = 'detail-key';
      k.textContent = keyText;
      const v = document.createElement('span');
      v.className = 'detail-val';
      v.innerHTML = valHtml;
      row.append(k, v);
      drawer.appendChild(row);
    }

    addDetail(RepoUI.t('packageIdLabel'), '<bdi class="tweak-id">' + (primary.Package || '') + '</bdi>');
    if (primary.Section) addDetail(RepoUI.t('sectionLabel'), primary.Section);
    if (primary.Depends) addDetail(RepoUI.t('dependsLabel'), '<bdi>' + primary.Depends + '</bdi>');
    if (primary.Homepage) addDetail('Homepage', '<a href="' + primary.Homepage + '" target="_blank" rel="noopener noreferrer">' + primary.Homepage + '</a>');
    if (primary.Depiction) addDetail('Depiction', '<a href="' + primary.Depiction + '" target="_blank" rel="noopener noreferrer">' + primary.Depiction + '</a>');

    card.appendChild(drawer);

    // Prepare variants
    const variants = group.map(item => ({
      pkg: item,
      url: resolveDownloadURL(item.Filename),
      searchText: [item.Name, item.Package, stripEmoji(item.Description), item.Filename, item.Author, item.Maintainer].filter(Boolean).join('\n').toLowerCase()
    }));

    variants.sort((a, b) => {
      const ai = archOrder.indexOf(a.pkg.Architecture);
      const bi = archOrder.indexOf(b.pkg.Architecture);
      return (ai < 0 ? archOrder.length : ai) - (bi < 0 ? archOrder.length : bi);
    });

    const entry = {
      card,
      expandBtn,
      name,
      archBadge,
      sizeSpan,
      dlAction,
      copyAction,
      variants,
      available: [],
      primary
    };

    // Card tap toggles expansion
    card.addEventListener('click', event => {
      if (event.target.closest('.card-actions-group, a, .btn-build-download, .btn-build-copy')) return;
      toggleCardExpansion(entry);
    });

    dlAction.addEventListener('click', event => {
      event.stopPropagation();
      if (entry.available.length > 1) {
        event.preventDefault();
        openBuildSheet(entry);
      } else if (entry.available.length === 1 && !entry.available[0].url) {
        event.preventDefault();
      }
    });

    copyAction.addEventListener('click', async event => {
      event.stopPropagation();
      if (entry.available.length > 1) {
        openBuildSheet(entry);
      } else if (entry.available.length === 1 && entry.available[0].url) {
        await handleCopyLink(entry, entry.available[0].url, copyAction);
      }
    });

    return entry;
  }

  function configureCardActions(entry) {
    const available = entry.available;
    const sizes = available.map(v => v.pkg.Size).filter(s => /^\d+$/.test(s)).map(Number);
    const minSize = sizes.length ? Math.min(...sizes) : 0;
    entry.sizeSpan.innerHTML = minSize ? '<bdi>' + formatSize(minSize) + '</bdi>' : '';

    const archNames = [...new Set(available.map(v => archDisplayName(v.pkg.Architecture)))];
    entry.archBadge.textContent = archNames.join(' · ') || archDisplayName(entry.primary.Architecture);

    const dlLabel = entry.dlAction.querySelector('.btn-dl-label');
    const copyLabel = entry.copyAction.querySelector('.btn-copy-label');

    if (available.length > 1) {
      entry.dlAction.removeAttribute('href');
      entry.dlAction.setAttribute('role', 'button');
      if (dlLabel) dlLabel.textContent = RepoUI.t('chooseBuild');
      if (copyLabel) copyLabel.textContent = RepoUI.t('copyDownloadLink');
      entry.dlAction.title = RepoUI.t('chooseBuild') + ' · ' + entry.name;
      entry.dlAction.setAttribute('aria-label', RepoUI.t('chooseBuild') + ' · ' + entry.name);
      entry.copyAction.title = RepoUI.t('copyDownloadLink') + ' · ' + entry.name;
      entry.copyAction.setAttribute('aria-label', RepoUI.t('copyDownloadLink') + ' · ' + entry.name);
      entry.copyAction.disabled = false;
    } else if (available.length === 1 && available[0].url) {
      entry.dlAction.href = available[0].url;
      entry.dlAction.removeAttribute('role');
      if (dlLabel) dlLabel.textContent = RepoUI.t('download');
      if (copyLabel) copyLabel.textContent = RepoUI.t('copyDownloadLink');
      entry.dlAction.title = RepoUI.t('download') + ' · ' + entry.name;
      entry.dlAction.setAttribute('aria-label', RepoUI.t('download') + ' · ' + entry.name);
      entry.copyAction.title = RepoUI.t('copyDownloadLink') + ' · ' + entry.name;
      entry.copyAction.setAttribute('aria-label', RepoUI.t('copyDownloadLink') + ' · ' + entry.name);
      entry.copyAction.disabled = false;
    } else {
      entry.dlAction.removeAttribute('href');
      entry.dlAction.setAttribute('aria-disabled', 'true');
      entry.copyAction.disabled = true;
    }
  }

  function filterPackages() {
    searchClear.hidden = searchInput.value.length === 0;
    if (loadState !== 'ready') return;

    const query = searchInput.value.trim().toLowerCase();
    let count = 0;

    for (const entry of entries) {
      const matched = entry.variants.filter(v => {
        const matchesQuery = !query || v.searchText.includes(query);
        const matchesArch = !selectedArch || v.pkg.Architecture === selectedArch;
        return matchesQuery && matchesArch;
      });

      entry.card.hidden = matched.length === 0;
      if (entry.card.hidden) {
        if (expandedEntry === entry) {
          entry.card.classList.remove('is-expanded');
          entry.expandBtn.setAttribute('aria-expanded', 'false');
          expandedEntry = null;
        }
        continue;
      }

      count++;
      entry.available = matched.filter(v => v.url);
      configureCardActions(entry);
    }

    // Status text
    if (count === 0) {
      packageStatus.textContent = RepoUI.t('packageCountNone');
    } else if (count === 1 && entries.length === 1) {
      packageStatus.textContent = RepoUI.t('packageCountSingle');
    } else {
      packageStatus.textContent = RepoUI.t('packageCount', { count, total: entries.length });
    }

    resetFiltersBtn.hidden = !query && !selectedArch;
    emptyState.hidden = count !== 0;
    emptyHeading.textContent = entries.length ? RepoUI.t('noPackagesFound') : RepoUI.t('packageCountNone');
    emptyMessage.textContent = entries.length ? RepoUI.t('noPackagesFoundDesc') : '';
    emptyAction.textContent = RepoUI.t('resetFilters');
    emptyAction.hidden = !entries.length;
  }

  function resetFilters() {
    searchInput.value = '';
    selectedArch = '';
    filterBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.architecture === '')));
    filterPackages();
  }

  searchInput.addEventListener('input', filterPackages);
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    filterPackages();
    searchInput.focus();
  });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedArch = btn.dataset.architecture;
      filterBtns.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      filterPackages();
    });
  });

  resetFiltersBtn.addEventListener('click', resetFilters);
  emptyAction.addEventListener('click', () => {
    if (loadState === 'error') loadPackageIndex();
    else resetFilters();
  });

  // Back to top observer
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      backToTopBtn.classList.toggle('is-visible', !entry.isIntersecting);
      backToTopBtn.disabled = entry.isIntersecting;
    });
    const sentinel = $('top-sentinel');
    if (sentinel) observer.observe(sentinel);
  }

  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Re-run filter on language change to translate badges, counts, titles
  document.addEventListener('repolangchange', () => {
    if (loadState === 'ready') {
      filterPackages();
    }
  });

  async function loadPackageIndex() {
    loadState = 'loading';
    packageStatus.textContent = RepoUI.t('loadingPackages');
    packageList.setAttribute('aria-busy', 'true');
    emptyState.hidden = true;

    try {
      const [packagesRes, additionsList] = await Promise.all([
        fetch('Packages', { cache: 'no-cache' }),
        RepoUI.loadAdditions().catch(() => [])
      ]);

      if (!packagesRes.ok) throw new Error('Package index HTTP error ' + packagesRes.status);
      RepoUI.trackModified($('last-updated'), packagesRes.headers.get('Last-Modified'), 'lastUpdated');

      const packagesText = await packagesRes.text();
      const rawPackages = parsePackagesText(packagesText);
      const groups = groupPackageBuilds(rawPackages);

      addedDates = new Map(additionsList.map(item => [
        RepoUI.versionKey(item.package, item.version),
        item.addedAt
      ]));

      // Sort packages by latest additions date first
      groups.sort((a, b) => {
        const da = Date.parse(addedDates.get(RepoUI.versionKey(a[0].Package, a[0].Version))) || 0;
        const db = Date.parse(addedDates.get(RepoUI.versionKey(b[0].Package, b[0].Version))) || 0;
        return db - da;
      });

      entries = groups.map(createPackageCard);
      const fragment = document.createDocumentFragment();
      entries.forEach(e => fragment.appendChild(e.card));
      packageList.replaceChildren(fragment);

      loadState = 'ready';
      filterPackages();
    } catch (err) {
      loadState = 'error';
      packageStatus.textContent = RepoUI.t('loadErrorTitle');
      emptyState.hidden = false;
      emptyHeading.textContent = RepoUI.t('loadErrorTitle');
      emptyMessage.textContent = RepoUI.t('loadErrorDesc');
      emptyAction.hidden = false;
      emptyAction.textContent = RepoUI.t('tryAgain');
    } finally {
      packageList.setAttribute('aria-busy', 'false');
    }
  }

  loadPackageIndex();
})();
