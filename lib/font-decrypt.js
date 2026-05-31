class FontDecryptor {
  constructor() {
    this.fontMap = null;
    this.ready = false;
    this.init();
  }

  async init() {
    try {
      // 1. 查找页面中的加密字体
      const fontStyle = this.findEncryptedFont();
      if (!fontStyle) {
        console.warn('未找到加密字体，将使用原始文本');
        this.ready = true;
        return;
      }

      // 2. 提取 base64 字体数据
      const fontData = this.extractFontData(fontStyle);

      // 3. 解析 TTF 字体（使用 Typr.js）
      if (typeof Typr === 'undefined' || !Typr.parse) {
        console.warn('Typr.js 未加载，字体解密功能不可用');
        this.ready = true;
        return;
      }

      const font = Typr.parse(fontData);

      // 4. 加载字符映射表
      const mappingTable = await this.loadMappingTable();

      // 5. 构建解密映射
      this.fontMap = this.buildFontMap(font, mappingTable);
      this.ready = true;

      console.log('字体解密初始化完成，映射字符数:', this.fontMap ? this.fontMap.size : 0);
    } catch (error) {
      console.error('字体解密初始化失败:', error);
      this.ready = true; // 即使失败也标记为ready，避免阻塞
    }
  }

  findEncryptedFont() {
    const styles = document.querySelectorAll('style');
    for (const style of styles) {
      if (style.textContent.includes('font-cxsecret') &&
          style.textContent.includes('base64')) {
        return style.textContent;
      }
    }
    return null;
  }

  extractFontData(styleText) {
    const match = styleText.match(/base64,([A-Za-z0-9+/=]+)/);
    if (!match) throw new Error('无法提取字体数据');

    const base64 = match[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async loadMappingTable() {
    try {
      // 尝试从公开的映射表加载
      const response = await fetch('https://www.forestpolice.org/ttf/2.0/table.json');
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('无法加载字符映射表:', error);
    }

    // 返回空映射表作为降级方案
    return {};
  }

  buildFontMap(font, mappingTable) {
    const map = new Map();

    try {
      if (!font.cmap || !font.cmap.tables || font.cmap.tables.length === 0) {
        console.warn('字体数据无效');
        return map;
      }

      const glyphs = font.cmap.tables[0].glyphs;

      for (const [charCode, glyphIndex] of Object.entries(glyphs)) {
        const glyph = font.glyphs[glyphIndex];
        if (!glyph || !glyph.path) continue;

        // 计算路径的哈希
        const pathStr = this.glyphPathToString(glyph.path);
        const hash = this.simpleHash(pathStr);

        if (mappingTable[hash]) {
          map.set(String.fromCharCode(charCode), mappingTable[hash]);
        }
      }
    } catch (error) {
      console.error('构建字体映射失败:', error);
    }

    return map;
  }

  decrypt(text) {
    if (!this.fontMap || this.fontMap.size === 0) {
      return text;
    }

    return Array.from(text).map(char => {
      return this.fontMap.get(char) || char;
    }).join('');
  }

  isReady() {
    return this.ready;
  }

  glyphPathToString(path) {
    // 将字形路径转换为字符串用于哈希计算
    return JSON.stringify(path);
  }

  simpleHash(str) {
    // 简化的哈希函数（实际应使用 MD5）
    // 这里使用简单的字符串哈希作为占位符
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).slice(-8);
  }
}

// 全局初始化
window.fontDecryptor = new FontDecryptor();
