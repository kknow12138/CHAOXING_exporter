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
    /** @type {Map[]} 合并后按优先级排列的映射表 */
    this.allMaps = [];
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
      // 1. 加载静态雨课堂映射表 —— 这是解密的主力，且只需读取本地 JSON（~100ms）
      await this._loadStaticMapping();

      // 2. 静态表一就绪即构建合并表并放行，绝不等待动态映射（forestpolice 拉取 +
      //    2 万次 glyph MD5 计算）。这避免了「静态表明明可用却被慢操作挡在 isReady()
      //    后面、parser 在 5s 超时后拿到乱码」的根因 bug。
      this._buildCombinedMaps();
      if (this.staticMap && this.staticMap.size > 0) {
        this.ready = true;
        console.log('Font decryptor ready (static map):', this.staticMap.size, 'entries — 可立即解密');
      }

      // 3. 动态映射（forestpolice 通用表 + 当前页字体）放到后台异步构建，
      //    完成后再合并进来作为补充，全程不阻塞 ready。
      this._initDynamicInBackground();
    } catch (e) {
      console.error('Font decryptor init error:', e);
    } finally {
      // 即便静态表为空也放行，避免 parser 永久等待
      this.ready = true;
    }
  }

  /**
   * 后台异步构建动态映射，不阻塞 ready。
   * forestpolice 拉取与字体下载均带超时，避免网络卡死拖垮整个流程。
   */
  async _initDynamicInBackground() {
    try {
      const fontSources = this._findAllEncryptedFontSources();
      if (fontSources.length === 0) {
        console.log('No encrypted fonts found on page, relying on static mapping');
        return;
      }

      console.log('Found', fontSources.length, 'encrypted font(s) on page (background mapping):');
      for (var fi = 0; fi < fontSources.length; fi++) {
        console.log('  [' + fi + ']', fontSources[fi].label, '| url:', fontSources[fi].url || '(inline base64)');
      }

      await this._loadGlyphMappingTable();
      if (!this._glyphMappingTable) {
        console.warn('Glyph mapping table unavailable, dynamic mapping skipped (static map still active)');
        return;
      }

      for (var fi2 = 0; fi2 < fontSources.length; fi2++) {
        try {
          const map = await this._buildDynamicMapping(fontSources[fi2]);
          if (map && map.size > 0) {
            this.dynamicMaps.push(map);
          }
        } catch (e) {
          console.warn('Dynamic mapping failed for:', fontSources[fi2].label, e.message);
        }
      }

      // 重新合并，把动态映射作为补充纳入
      this._buildCombinedMaps();
      console.log(
        'Background dynamic mapping merged | static:' + (this.staticMap ? this.staticMap.size : 0) +
        ' | dynamic:' + this.dynamicMaps.length + ' map(s) | total maps:' + this.allMaps.length
      );
    } catch (e) {
      console.warn('Background dynamic mapping skipped (forestpolice unreachable or parse error):', e.message);
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
    return sources.filter(function (s) {
      var key = s.base64 ? s.base64.slice(0, 100) : s.url;
      if (!key || seen.has(key)) return false;
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
    var font = Typr.parse(fontData);
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
    var mappedCount = 0;
    var totalCount = codePoints.length;
    var skippedCount = 0;
    var batchSize = 500; // 每批处理 500 个字符，避免阻塞

    // 分批处理
    for (var batchStart = 0; batchStart < codePoints.length; batchStart += batchSize) {
      var batchEnd = Math.min(batchStart + batchSize, codePoints.length);

      for (var i = batchStart; i < batchEnd; i++) {
        var charCode = codePoints[i];

        try {
          // 获取字符对应的 glyph index
          var glyphIndex = Typr.U.codeToGlyph(font, charCode);

          // 跳过 .notdef
          if (glyphIndex === 0 || glyphIndex == null) {
            skippedCount++;
            continue;
          }

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
            var sourceChar = String.fromCharCode(charCode);
            var targetChar = String.fromCodePoint(targetCode);

            // 只有当源码字符与目标字符不同时才加入映射（排除未加密的字符）
            if (sourceChar !== targetChar) {
              // 安全检查：目标字符必须在常用 CJK 范围内
              // 避免 hash 碰撞导致的错误映射（如映射到拉丁字符或罕见符号）
              if (self._isValidTargetChar(targetCode)) {
                map.set(sourceChar, targetChar);
                mappedCount++;
              }
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

  /**
   * 解密文本：将加密字符替换为真实字符。
   *
   * 优先级调整（v2）：
   * 静态映射（雨课堂专用 yuketang-font-map.json）优先，因为它是针对特定字体文件构建的。
   * 动态映射（forestpolice.org 通用映射）作为补充，仅用于静态映射未覆盖的字符。
   *
   * 同时内置防双重解密保护：已经被映射过的字符不会再被二次映射。
   */
  decrypt(text) {
    if (!text || this.allMaps.length === 0) return text;

    // 快速路径：纯 ASCII 文本无需处理
    if (/^[\x00-\x7F]*$/.test(text)) return text;

    var result = '';
    for (var i = 0; i < text.length; i++) {
      var char = text[i];
      var decrypted = char;

      for (var j = 0; j < this.allMaps.length; j++) {
        var mapped = this.allMaps[j].get(char);
        if (mapped !== undefined) {
          decrypted = mapped;
          break;
        }
      }

      result += decrypted;
    }

    return result;
  }

  /**
   * 递归解密 DOM 节点中的文本。
   */
  decryptNodeText(node) {
    if (!node) return '';

    // 文本节点
    if (node.nodeType === 3) {
      return this.decrypt(node.nodeValue || '');
    }

    if (node.nodeType !== 1) return '';

    // 加密字体元素（class 包含 encrypted-font 特征）
    var cls = (node.className || '');
    if (typeof cls === 'string') {
      if (cls.indexOf('encrypted-font') !== -1 ||
          cls.indexOf('font-cxsecret') !== -1 ||
          cls.indexOf('cxsecret') !== -1) {
        return this.decrypt(node.textContent || '');
      }
    }

    // 递归处理子节点
    var childNodes = node.childNodes || [];
    var result = '';
    for (var i = 0; i < childNodes.length; i++) {
      result += this.decryptNodeText(childNodes[i]);
    }
    return result;
  }

  // ---- 工具方法 ----

  /**
   * 构建合并后的映射表（按优先级排列）。
   *
   * 策略（v2 - 自适应优先级）：
   *
   * 场景判断：
   * A) 无 dynamic 映射 → 只用 static
   * B) dynamic 与 static 高度一致（≥50%） → static 为主，dynamic 补充
   * C) dynamic 与 static 不一致，但 dynamic 覆盖量大（≥200 条） → dynamic 可能
   *    来自新版字体，dynamic 为主，static 补充
   * D) dynamic 与 static 不一致且 dynamic 覆盖量小 → dynamic 可能使用了错误的
   *    hash 函数，丢弃 dynamic，只用 static
   * E) 无 static 映射 → 直接用 dynamic
   */
  _buildCombinedMaps() {
    this.allMaps = [];

    // 合并所有 dynamic maps 为一个
    var mergedDynamic = new Map();
    for (var i = 0; i < this.dynamicMaps.length; i++) {
      this.dynamicMaps[i].forEach(function (value, key) {
        if (!mergedDynamic.has(key)) {
          mergedDynamic.set(key, value);
        }
      });
    }

    var dynSize = mergedDynamic.size;
    var staSize = this.staticMap ? this.staticMap.size : 0;

    // 场景 A: 无 dynamic
    if (dynSize === 0) {
      if (this.staticMap && staSize > 0) {
        this.allMaps.push(this.staticMap);
      }
      console.log('Strategy: static only (' + staSize + ' entries)');
      return;
    }

    // 场景 E: 无 static
    if (!this.staticMap || staSize === 0) {
      this.allMaps.push(mergedDynamic);
      console.log('Strategy: dynamic only (' + dynSize + ' entries)');
      return;
    }

    // 计算重叠一致性
    var overlapKeys = 0;
    var agreeCount = 0;
    var self = this;

    mergedDynamic.forEach(function (dynValue, key) {
      var staticValue = self.staticMap.get(key);
      if (staticValue !== undefined) {
        overlapKeys++;
        if (dynValue === staticValue) {
          agreeCount++;
        }
      }
    });

    var agreementRate = overlapKeys > 0 ? agreeCount / overlapKeys : 0;
    console.log(
      'Map comparison: dynamic=' + dynSize + ' static=' + staSize +
      ' overlap=' + overlapKeys + ' agree=' + agreeCount +
      ' (' + Math.round(agreementRate * 100) + '%)'
    );

    // 场景 C: 低一致性 + 大覆盖 → dynamic 可能来自新版字体，优先 dynamic
    if (overlapKeys >= 20 && agreementRate < 0.5 && dynSize >= 200) {
      console.log('Strategy: dynamic primary (high coverage, likely new font version), static supplement');
      this.allMaps.push(mergedDynamic);
      // static 补充 dynamic 未覆盖的
      var staticSupplement = new Map();
      this.staticMap.forEach(function (value, key) {
        if (!mergedDynamic.has(key)) {
          staticSupplement.set(key, value);
        }
      });
      if (staticSupplement.size > 0) {
        this.allMaps.push(staticSupplement);
      }
      return;
    }

    // 场景 D: 低一致性 + 小覆盖 → dynamic 不可靠，只用 static
    if (overlapKeys >= 10 && agreementRate < 0.3 && dynSize < 200) {
      console.warn(
        'Strategy: static only (dynamic unreliable: ' + dynSize +
        ' entries, ' + Math.round(agreementRate * 100) + '% agreement)'
      );
      this.allMaps.push(this.staticMap);
      return;
    }

    // 场景 B (默认): static 优先，dynamic 补充
    console.log('Strategy: static primary, dynamic supplement');
    this.allMaps.push(this.staticMap);

    var dynamicSupplement = new Map();
    mergedDynamic.forEach(function (value, key) {
      if (!self.staticMap.has(key)) {
        dynamicSupplement.set(key, value);
      }
    });

    if (dynamicSupplement.size > 0) {
      this.allMaps.push(dynamicSupplement);
      console.log('Dynamic supplement: ' + dynamicSupplement.size + ' additional characters');
    }
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
