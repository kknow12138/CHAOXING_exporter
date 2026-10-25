/**
 * 字体解密器 - 支持动态解析页面加密字体
 *
 * 针对超星（chaoxing）和长江雨课堂（yuketang）的字体加密：
 * 1. 从页面 CSS 中提取 @font-face 声明的 base64 字体数据（或字体 URL）
 * 2. 使用 Typr.js 解析字体，提取 glyph path
 * 3. 通过 MD5(path) → mapping table 查找真实字符
 * 4. 对页面文字进行解密替换
 *
 * 映射表来源: forestpolice.org（glyph path hash → Unicode code point）
 */
class FontDecryptor {
  constructor() {
    /** @type {Map[]} 动态构建的映射表（从页面字体实时解析） */
    this.dynamicMaps = [];
    /** @type {Map|null} 静态雨课堂映射表（yuketang-font-map.json） */
    this.staticMap = null;
    /** @type {Map[]} 当前字体的映射表，仅供诊断 */
    this.allMaps = [];
    this.fontMaps = new Map();
    this._sourceNodes = new WeakMap();
    /** @type {boolean} 初始化是否完成 */
    this.ready = false;
    /** @type {Object|null} forestpolice.org 映射表缓存 */
    this._glyphMappingTable = null;
    /** @type {string|null} 从页面提取的字体 URL */
    this._fontUrl = null;

    this._init();
  }

  // ---- 初始化 ----

  async _init() {
    try {
      // 历史字符表仅供诊断；导出只使用当前字体的字形映射。
      await this._loadStaticMapping();
      await this._loadGlyphMappingTable();

      // 2. 查找页面上的加密字体
      const fontSources = this._findAllEncryptedFontSources();

      // 没有加密字体时，原文无需替换。
      if (fontSources.length === 0) {
        this._buildCombinedMaps();
        this.ready = true;
        console.log('Font decryptor ready (no encrypted fonts on page)');
        return;
      }

      // 随机字体的码点随页面变化，必须等待当前字体的字形映射。
      console.log('Found', fontSources.length, 'encrypted font(s), building glyph-hash map (foreground)…');
      for (var fi = 0; fi < fontSources.length; fi++) {
        console.log('  [' + fi + ']', fontSources[fi].label, '| url:', fontSources[fi].url || '(inline base64)');
      }

      for (const source of fontSources) {
        let map = null;
        try {
          if (this._glyphMappingTable) map = await this._buildDynamicMapping(source);
        } catch (e) {
          console.warn('Dynamic mapping failed for:', source.label, e.message);
        }
        this._registerFontMapping(source, map);
      }

      this._buildCombinedMaps();
      this.ready = true;
      console.log(
        'Font decryptor ready (glyph-hash) | static:' + (this.staticMap ? this.staticMap.size : 0) +
        ' | dynamic:' + this.dynamicMaps.length + ' map(s) | total maps:' + this.allMaps.length
      );
    } catch (e) {
      console.error('Font decryptor init error:', e);
    } finally {
      // 初始化失败也结束等待；实际使用未识别的加密字体时明确报错。
      this.ready = true;
    }
  }

  /**
   * 带超时的 fetch，避免无超时的网络请求（如国内访问 forestpolice.org）永久挂起。
   */
  async _fetchWithTimeout(url, opts, ms) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, ms || 3000);
    try {
      var merged = Object.assign({}, opts || {}, { signal: controller.signal });
      return await fetch(url, merged);
    } finally {
      clearTimeout(timer);
    }
  }

  // ---- 静态映射表 ----

  async _loadStaticMapping() {
    try {
      const url = chrome.runtime.getURL('lib/yuketang-font-map.json');
      const resp = await fetch(url);
      if (!resp.ok) return;

      const payload = await resp.json();
      const rawMap = payload.map || payload;
      const map = new Map();

      Object.entries(rawMap || {}).forEach(function (entry) {
        var key = entry[0];
        var value = entry[1];
        if (!value) return;

        // key 可能是数字（Unicode code point）或单个字符
        var sourceChar = /^\d+$/.test(key)
          ? String.fromCharCode(Number(key))
          : key;
        map.set(sourceChar, String(value));
      });

      if (map.size > 0) {
        this.staticMap = map;
        console.log('Static yuketang map loaded:', map.size, 'entries');
      }
    } catch (e) {
      console.warn('Failed to load static yuketang mapping:', e);
    }
  }

  // ---- 字体发现 ----

  /**
   * 从页面中查找所有加密字体来源。
   * 支持三种方式：
   *   1. document.styleSheets 中的 CSS 规则（最准确）
   *   2. 内联 <style> 标签中的 base64 数据
   *   3. 性能 API 中已加载的字体资源
   */
  _findAllEncryptedFontSources() {
    var sources = [];

    // 方式 1：从 document.styleSheets 中检测（能处理外部 URL 的字体）
    var cssFonts = this._findFontsFromStyleSheets();
    sources = sources.concat(cssFonts);

    // 方式 2：从内联 <style> 标签提取 base64 字体
    var styles = document.querySelectorAll('style');
    for (var i = 0; i < styles.length; i++) {
      var text = styles[i].textContent || '';
      var extracted = this._extractFontsFromCss(text);
      sources = sources.concat(extracted);
    }

    // 方式 3：从 performance API 获取已加载的字体 URL
    if (sources.length === 0) {
      var perfUrl = this._findFontUrlFromPerformance();
      if (perfUrl) {
        sources.push({
          label: 'performance API (' + perfUrl.split('/').pop() + ')',
          base64: null,
          url: perfUrl,
          fontFamily: 'exam-data-decrypt-font'
        });
      }
    }

    // 去重
    var seen = new Set();
    return sources.filter((s) => {
      var key = this._normalizeFamily(s.fontFamily) + ':' + (s.base64 || s.url || '');
      if ((!s.base64 && !s.url) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * 从 document.styleSheets 中查找加密字体 URL。
   * 这是最高效的方式，不需要遍历所有 <style> 文本。
   */
  _findFontsFromStyleSheets() {
    var results = [];
    try {
      for (var i = 0; i < document.styleSheets.length; i++) {
        var ss = document.styleSheets[i];
        try {
          var rules = ss.cssRules || ss.rules || [];
          for (var j = 0; j < rules.length; j++) {
            var cssText = rules[j].cssText || '';
            // 匹配 雨课堂 加密字体: exam-data-decrypt-font / exam-font
            if (!/exam-data-decrypt-font|exam-font|font-cxsecret|xuetangx-com-encrypted-font/i.test(cssText)) {
              continue;
            }
            if (!/url\(/.test(cssText)) continue;

            var urlMatch = cssText.match(/url\(["']?([^"')]+)["']?\)/);
            if (!urlMatch) continue;

            var fontUrl = urlMatch[1];

            // 提取 font-family
            var familyMatch = cssText.match(/font-family\s*:\s*['"]?([^'";}]+)['"]?/i);
            var family = familyMatch ? familyMatch[1].trim().replace(/['"]/g, '') : 'encrypted-font';

            if (fontUrl.indexOf('base64,') !== -1) {
              // base64 内联字体
              var b64Match = fontUrl.match(/base64,([A-Za-z0-9+/=]+)/);
              if (b64Match) {
                results.push({
                  label: family + ' (inline via styleSheets)',
                  base64: b64Match[1],
                  url: null,
                  fontFamily: family
                });
              }
            } else if (/\.(?:ttf|woff2?)/i.test(fontUrl)) {
              // 外部 URL 字体 - 标记为需要 fetch
              results.push({
                label: family + ' (' + fontUrl.split('/').pop() + ')',
                base64: null,
                url: fontUrl,
                fontFamily: family
              });
            }
          }
        } catch (e) {
          // 跨域 CSS 无法读取 cssRules，跳过
        }
      }
    } catch (e) {
      // document.styleSheets 不可用
    }
    return results;
  }

  /**
   * 从 performance API 中查找已加载的加密字体 URL。
   * 兜底方案：有些页面通过 JS 动态加载字体，不在 styleSheets 中。
   */
  _findFontUrlFromPerformance() {
    try {
      var entries = performance.getEntriesByType('resource') || [];
      for (var i = 0; i < entries.length; i++) {
        var url = entries[i].name || '';
        if (/exam_font_[\w-]+\.ttf/i.test(url)) {
          return url;
        }
      }
    } catch (e) {
      // performance API 不可用
    }
    return null;
  }

  /**
   * 从 CSS 文本中提取所有 @font-face 声明的加密字体。
   * 加密字体的特征：
   *   - 包含 base64 编码的 TTF/WOFF 数据
   *   - 或者包含指向 .ttf/.woff 的外部 URL
   *   - font-family 通常为 font-cxsecret / exam-font 等
   */
  _extractFontsFromCss(cssText) {
    var results = [];

    // 匹配完整的 @font-face 块
    // 使用更宽松的正则匹配 base64 字体数据
    var fontFaceRegex = /@font-face\s*\{[^}]*?\}/gi;
    var matches = cssText.match(fontFaceRegex);

    if (!matches) return results;

    for (var i = 0; i < matches.length; i++) {
      var block = matches[i];

      // 提取 font-family
      var familyMatch = block.match(/font-family\s*:\s*['"]?([^'";}]+)['"]?/i);
      var family = familyMatch ? familyMatch[1].trim().replace(/['"]/g, '') : 'unknown';
      if (!this._isEncryptedFamily(family)) continue;

      // 尝试 base64 TTF/WOFF
      var base64Match = block.match(
        /url\s*\(\s*['"]?data\s*:\s*(?:application\/(?:x-font-ttf|x-font-woff|font-ttf|font-woff)|font\/(?:ttf|woff))[^'")]*?base64,([A-Za-z0-9+/=]+)['"]?\s*\)/i
      );

      if (base64Match) {
        results.push({
          label: family + ' (inline base64)',
          base64: base64Match[1],
          url: null,
          fontFamily: family
        });
        continue;
      }

      // 尝试普通 data URI（不含明确 MIME 但包含 base64,）
      var genericBase64Match = block.match(
        /url\s*\(\s*['"]?data:[^'")]*?base64,([A-Za-z0-9+/=]{100,})['"]?\s*\)/i
      );

      if (genericBase64Match) {
        results.push({
          label: family + ' (inline base64)',
          base64: genericBase64Match[1],
          url: null,
          fontFamily: family
        });
        continue;
      }

      // 尝试外部 URL (.ttf / .woff)
      var urlMatch = block.match(
        /url\s*\(\s*['"]?(https?:\/\/[^'")]*?\.(?:ttf|woff2?)[^'")]*?)['"]?\s*\)/i
      );

      if (urlMatch) {
        var url = urlMatch[1];
        results.push({
          label: family + ' (' + url.split('/').pop() + ')',
          base64: null,
          url: url,
          fontFamily: family
        });
      }
    }

    return results;
  }

  // ---- 动态映射构建 ----

  async _loadGlyphMappingTable() {
    if (this._glyphMappingTable) return;

    // 优先加载扩展内置的自建「字形哈希 → 真字」表（离线、无网络依赖）。
    // 雨课堂每次请求返回随机字体（码点随机）但字形轮廓固定，
    // 因此该表跨字体通用，是 forestpolice.org 的本地替代品。
    try {
      var localUrl = chrome.runtime.getURL('lib/yuketang-glyph-hash-map.json');
      var localResp = await fetch(localUrl);
      if (localResp.ok) {
        this._glyphMappingTable = await localResp.json();
        console.log('Glyph mapping table loaded (bundled):',
          Object.keys(this._glyphMappingTable).length, 'entries');
        return;
      }
    } catch (e) {
      console.warn('Bundled glyph hash map unavailable, falling back to remote:', e.message);
    }

    // 远程兜底：仅当内置表缺失时尝试 forestpolice.org
    try {
      var urls = [
        'https://www.forestpolice.org/ttf/2.0/table.json',
        'https://forestpolice.org/ttf/2.0/table.json'
      ];

      for (var i = 0; i < urls.length; i++) {
        try {
          var resp = await this._fetchWithTimeout(urls[i], { cache: 'force-cache' }, 3000);
          if (resp.ok) {
            this._glyphMappingTable = await resp.json();
            console.log('Glyph mapping table loaded from', urls[i], ':',
              Object.keys(this._glyphMappingTable).length, 'entries');
            return;
          }
        } catch (e) {
          // try next URL
        }
      }

      console.warn('Could not load glyph mapping table from any source');
    } catch (e) {
      console.warn('Failed to load glyph mapping table:', e);
    }
  }

  /**
   * 从字体数据构建字符映射表。
   *
   * 流程：
   * 1. base64 → ArrayBuffer → Typr.parse
   * 2. 遍历 cmap 中每个 code point → glyph index
   * 3. glyph index → Typr.U.glyphToPath → path data
   * 4. path data → MD5(JSON.stringify(path)) → 取后 8 位 hex
   * 5. hex → parseInt(hex, 16) → 在 mapping table 中查找
   * 6. 找到的 Unicode code point → String.fromCodePoint → 真实字符
   * 7. 构建 Map: 源码字符 → 真实字符
   */
  async _buildDynamicMapping(source) {
    var self = this;

    // 获取字体数据
    var fontData;
    if (source.base64) {
      fontData = this._base64ToBuffer(source.base64);
    } else if (source.url) {
      // 外部 URL：下载字体文件
      try {
        console.log('Fetching font from URL:', source.url);
        var resp = await this._fetchWithTimeout(source.url, { cache: 'force-cache' }, 8000);
        if (!resp.ok) {
          console.warn('Failed to fetch font URL:', source.url, resp.status);
          return null;
        }
        var arrayBuf = await resp.arrayBuffer();
        fontData = arrayBuf;
        console.log('Font downloaded:', (arrayBuf.byteLength / 1024).toFixed(1), 'KB');
      } catch (e) {
        console.warn('Error fetching font URL:', source.url, e);
        return null;
      }
    } else {
      return null;
    }

    // 解析字体
    // Typr.parse 对可变/集合字体（如雨课堂用的 Source Han Sans SC VF）返回字体【数组】，
    // 必须取第一个 master，否则 font.cmap 为 undefined → 误判「missing cmap」→ 动态表
    // 永远建不出来 → 退回静态表 → 随机字体下乱码。这是「又抓取不正确」的真正根因之一。
    var parsed = Typr.parse(fontData);
    var font = Array.isArray(parsed) ? parsed[0] : parsed;
    if (!font || !font.cmap) {
      console.warn('Failed to parse font or missing cmap table');
      return null;
    }

    // 获取最佳 cmap 子表
    var ctab = this._getBestCmap(font);
    if (!ctab) {
      console.warn('No usable cmap subtable');
      return null;
    }

    var table = this._glyphMappingTable;
    if (!table) {
      console.warn('No glyph mapping table available, skipping dynamic mapping');
      return null;
    }

    // 获取字体中所有被覆盖的 code point
    var codePoints = this._getCoveredCodePoints(ctab);
    if (codePoints.length === 0) {
      console.warn('No code points found in cmap table');
      return null;
    }

    var map = new Map();
    map.unresolvedCharacters = new Set();
    var mappedCount = 0;
    var totalCount = codePoints.length;
    var skippedCount = 0;
    var batchSize = 500; // 每批处理 500 个字符，避免阻塞

    // 分批处理
    for (var batchStart = 0; batchStart < codePoints.length; batchStart += batchSize) {
      var batchEnd = Math.min(batchStart + batchSize, codePoints.length);

      for (var i = batchStart; i < batchEnd; i++) {
        var charCode = codePoints[i];

        var sourceChar = String.fromCodePoint(charCode);
        try {
          // 获取字符对应的 glyph index
          var glyphIndex = Typr.U.codeToGlyph(font, charCode);

          // 跳过 .notdef
          if (glyphIndex === 0 || glyphIndex == null) {
            skippedCount++;
            continue;
          }
          map.unresolvedCharacters.add(sourceChar);

          // 转换 glyph index → path 数据
          var path = Typr.U.glyphToPath(font, glyphIndex);
          if (!path || !path.cmds || path.cmds.length === 0) {
            skippedCount++;
            continue;
          }

          // 跳过 bitmap glyph（path.cmds[0] 是 data: URL）
          if (typeof path.cmds[0] === 'string' && path.cmds[0].indexOf('data:') === 0) {
            skippedCount++;
            continue;
          }

          // 计算 glyph hash
          var hashDecimal = self._computeGlyphHash(path);
          if (hashDecimal === null) {
            skippedCount++;
            continue;
          }

          // 查映射表
          var targetCode = table[hashDecimal];
          // table 的 key 可能是字符串型的数字
          if (targetCode === undefined) {
            targetCode = table[String(hashDecimal)];
          }

          if (targetCode && targetCode > 0) {
            var targetChar = String.fromCodePoint(targetCode);
            if (self._isValidTargetChar(targetCode)) {
              map.set(sourceChar, targetChar);
              map.unresolvedCharacters.delete(sourceChar);
              mappedCount++;
            }
          }
        } catch (e) {
          skippedCount++;
        }
      }
    }

    console.log(
      'Dynamic mapping: ' + mappedCount + ' encrypted chars found / ' +
      totalCount + ' total (' +
      (totalCount > 0 ? Math.round(mappedCount / totalCount * 100) : 0) + '%), ' +
      skippedCount + ' skipped'
    );

    return map;
  }

  /**
   * 验证目标字符是否在有效的 CJK 范围内。
   * 用于过滤 hash 碰撞导致的错误映射。
   */
  _isValidTargetChar(code) {
    // CJK Unified Ideographs
    if (code >= 0x4E00 && code <= 0x9FFF) return true;
    // CJK Unified Ideographs Extension A
    if (code >= 0x3400 && code <= 0x4DBF) return true;
    // CJK Compatibility Ideographs
    if (code >= 0xF900 && code <= 0xFAFF) return true;
    // CJK Symbols and Punctuation
    if (code >= 0x3000 && code <= 0x303F) return true;
    // Fullwidth Forms (including fullwidth digits/letters)
    if (code >= 0xFF00 && code <= 0xFFEF) return true;
    // General Punctuation
    if (code >= 0x2000 && code <= 0x206F) return true;
    // Halfwidth and Fullwidth Forms
    if (code >= 0xFF00 && code <= 0xFFEF) return true;
    // Latin-1 Supplement (for basic punctuation that might be encrypted)
    if (code >= 0x00A0 && code <= 0x00FF) return true;

    // 不在已知有效范围内，拒绝
    return false;
  }

  /**
   * 获取 cmap 表中覆盖的所有 Unicode code point。
   * 支持 format 4（分段映射）和 format 12（分组映射）等常见格式。
   *
   * 优化：只遍历 CJK 常用汉字范围（U+4E00 ~ U+9FFF）以提升性能，
   * 因为加密字体几乎只用于中文字符。
   */
  _getCoveredCodePoints(ctab) {
    var fmt = ctab.format;
    var covered = [];

    // CJK 统一表意文字主要范围
    var cjkRanges = [
      [0x4E00, 0x9FFF],  // CJK Unified Ideographs (常用汉字)
      [0x3400, 0x4DBF],  // CJK Unified Ideographs Extension A
      [0x2000, 0x206F],  // General Punctuation
      [0x3000, 0x303F],  // CJK Symbols and Punctuation
      [0xFF00, 0xFFEF],  // Halfwidth and Fullwidth Forms
      [0x2E80, 0x2EFF],  // CJK Radicals Supplement
      [0x2F00, 0x2FDF],  // Kangxi Radicals
      [0x2FF0, 0x2FFF],  // Ideographic Description Characters
      [0x3000, 0x303F],  // CJK Symbols and Punctuation
      [0x3100, 0x312F],  // Bopomofo
      [0x31A0, 0x31BF],  // Bopomofo Extended
      [0xFE30, 0xFE4F],  // CJK Compatibility Forms
    ];

    if (fmt === 4) {
      // Format 4: 分段映射
      // startCount/endCount 数组定义了各段的起止码点
      var startCount = ctab.startCount || [];
      var endCount = ctab.endCount || [];
      var segCount = startCount.length;

      // 遍历每个 CJK 范围
      for (var r = 0; r < cjkRanges.length; r++) {
        var rangeStart = cjkRanges[r][0];
        var rangeEnd = cjkRanges[r][1];

        for (var s = 0; s < segCount; s++) {
          var segStart = Math.max(startCount[s], rangeStart);
          var segEnd = Math.min(endCount[s], rangeEnd);

          if (segStart <= segEnd && endCount[s] !== 0xFFFF) {
            for (var code = segStart; code <= segEnd; code++) {
              covered.push(code);
            }
          }
        }
      }
    } else if (fmt === 12) {
      // Format 12: 分组映射（groups 数组每 3 项为 [start, end, startGlyphID]）
      var groups = ctab.groups || [];

      for (var r2 = 0; r2 < cjkRanges.length; r2++) {
        var rs = cjkRanges[r2][0];
        var re = cjkRanges[r2][1];

        for (var g = 0; g < groups.length; g += 3) {
          var gs = Math.max(groups[g], rs);
          var ge = Math.min(groups[g + 1], re);

          if (gs <= ge) {
            for (var code2 = gs; code2 <= ge; code2++) {
              covered.push(code2);
            }
          }
        }
      }
    } else {
      // 未知格式：回退到 CJK 范围全扫描
      console.warn('Unknown cmap format:', fmt, ', falling back to full CJK scan');
      for (var r3 = 0; r3 < cjkRanges.length; r3++) {
        for (var code3 = cjkRanges[r3][0]; code3 <= cjkRanges[r3][1]; code3++) {
          covered.push(code3);
        }
      }
    }

    return covered;
  }

  /**
   * 计算 glyph path 的 hash 值，用于在 mapping table 中查找。
   *
   * hash = MD5(JSON.stringify(path)).slice(24) → parseInt(..., 16)
   *
   * path 结构: { cmds: ["M","L","C",...], crds: [x1,y1,x2,y2,...] }
   */
  _computeGlyphHash(path) {
    try {
      var json = JSON.stringify(path);
      var md5hex = md5(json);
      // 取后 8 位 hex 字符（32 位 MD5 的后 8 位 = 4 字节）
      var last8hex = md5hex.slice(24);
      return parseInt(last8hex, 16);
    } catch (e) {
      return null;
    }
  }

  /**
   * 获取 cmap 表中的最佳子表。
   * 优先级: platform 3 + encoding 10 (Unicode full) >
   *          platform 3 + encoding 1 (Unicode BMP) >
   *          platform 0 + encoding ... >
   *          第一个可用的
   */
  _getBestCmap(font) {
    var cmap = font.cmap;
    if (!cmap || !cmap.tables || cmap.tables.length === 0) return null;

    // 按优先级查找
    var priorityPatterns = ['p3e10', 'p0e4', 'p3e1', 'p1e0', 'p0e3', 'p0e1', 'p3e0', 'p3e5'];

    for (var i = 0; i < priorityPatterns.length; i++) {
      var pattern = priorityPatterns[i];
      if (cmap.ids && cmap.ids[pattern] != null) {
        return cmap.tables[cmap.ids[pattern]];
      }
    }

    // 回退：使用第一个 table
    return cmap.tables[0];
  }

  // ---- 解密 ----

  _normalizeFamily(family) {
    return String(family || '').trim().replace(/^['"]|['"]$/g, '').toLowerCase();
  }

  _isEncryptedFamily(family) {
    return /^(?:exam-data-decrypt-font|exam-font|font-cxsecret|cxsecret|xuetangx-com-encrypted-font)$/i.test(this._normalizeFamily(family));
  }

  _registerFontMapping(source, map) {
    const family = this._normalizeFamily(source.fontFamily);
    const records = this.fontMaps.get(family) || [];
    records.push({ source, map: map && map.size > 0 ? map : null });
    this.fontMaps.set(family, records);
    if (map && map.size > 0) this.dynamicMaps.push(map);
  }

  _fontError() {
    const error = new Error('当前加密字体未能可靠识别，请刷新页面后重试导出');
    error.code = 'FONT_DECRYPTION_FAILED';
    return error;
  }

  getSourceNode(node) {
    return this._sourceNodes.get(node) || node;
  }

  // 脱离页面的副本不再继承字体，保留原节点以读取真实的计算样式。
  cloneForExtraction(node) {
    const clone = node.cloneNode(true);
    const remember = (source, copy) => {
      this._sourceNodes.set(copy, this.getSourceNode(source));
      Array.from(source.childNodes || []).forEach((child, index) => remember(child, copy.childNodes[index]));
    };
    remember(node, clone);
    return clone;
  }

  _mapForNode(node) {
    const source = this.getSourceNode(node);
    const element = source?.nodeType === 3 ? source.parentElement : source;
    if (!element || element.nodeType !== 1) return null;
    let family = '';
    try {
      family = this._normalizeFamily(getComputedStyle(element).fontFamily.split(',')[0]);
    } catch (error) {
      family = this._normalizeFamily(element.style?.fontFamily?.split(',')[0]);
    }
    if (!this._isEncryptedFamily(family) && !this.fontMaps.has(family)) return null;
    const records = this.fontMaps.get(family) || [];
    // 同名字体的多个来源可能使用不同码点，不能合并后猜测。
    if (records.length !== 1 || !records[0].map) throw this._fontError();
    return records[0].map;
  }

  /** 仅在原始 DOM 文本叶节点上调用，普通字符串没有字体依据。 */
  decrypt(text, node) {
    if (!text || !node || !this.ready || /^[\x00-\x7F]*$/.test(text)) return text;
    const map = this._mapForNode(node);
    if (!map) return text;
    return Array.from(text, (char) => {
      if (map.unresolvedCharacters?.has(char)) throw this._fontError();
      return map.get(char) ?? char;
    }).join('');
  }

  decryptNodeText(node) {
    if (!node) return '';
    if (node.nodeType === 3) return this.decrypt(node.nodeValue || '', node);
    if (node.nodeType !== 1 || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(node.tagName)) return '';
    if (node.tagName === 'BR') return '\n';
    return Array.from(node.childNodes || [], (child) => this.decryptNodeText(child)).join('');
  }

  _buildCombinedMaps() {
    this.allMaps = this.dynamicMaps.slice();
  }

  _base64ToBuffer(base64) {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  isReady() {
    return this.ready;
  }

  /**
   * 调试：对指定字符显示所有映射表的查找结果。
   * 在控制台调用: fontDecryptor.debugChar('于')
   */
  debugChar(char) {
    console.log('=== Debug char: "' + char + '" (U+' + char.charCodeAt(0).toString(16).toUpperCase() + ') ===');
    console.log('Total maps:', this.allMaps.length);
    for (var i = 0; i < this.allMaps.length; i++) {
      var val = this.allMaps[i].get(char);
      if (val !== undefined) {
        console.log('  Map ' + i + ': "' + char + '" -> "' + val + '"');
      } else {
        console.log('  Map ' + i + ': no mapping for "' + char + '"');
      }
    }
    console.log('Final decrypt result: "' + this.decrypt(char) + '"');
    console.log('=== End debug ===');
    return this.decrypt(char);
  }

  /**
   * 返回诊断信息
   */
  getDiagnostics() {
    return {
      ready: this.ready,
      dynamicMaps: this.dynamicMaps.length,
      staticMapSize: this.staticMap ? this.staticMap.size : 0,
      totalMaps: this.allMaps.length,
      fontUrl: this._fontUrl,
      mappingTableLoaded: this._glyphMappingTable !== null,
      mappingTableSize: this._glyphMappingTable
        ? Object.keys(this._glyphMappingTable).length
        : 0
    };
  }
}

// 全局初始化
window.fontDecryptor = new FontDecryptor();
