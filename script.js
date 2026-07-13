/* ============================================
   VISUAL EMAIL EDITOR — CORE ENGINE
   Free-form positioning, 15 effects, 15 templates, 15 block types
   ============================================ */

(function() {
'use strict';

// =============================================
// STATE
// =============================================

var blocks = [];
var selectedBlockId = null;
var history = [];
var historyIndex = -1;
var maxHistory = 40;
var idCounter = 1;
var canvasBg = '#f4f4f5';
var contentWidth = 600;
var snapEnabled = false;
var snapSize = 20;
var nextBlockY = 20;

// Drag state
var isDragging = false;
var dragBlock = null;
var dragOffsetX = 0;
var dragOffsetY = 0;

// Resize state
var isResizing = false;
var resizeBlock = null;
var resizeStartX = 0;
var resizeStartW = 0;

// =============================================
// DOM REFS
// =============================================

var canvas = document.getElementById('canvas');
var canvasEmpty = document.getElementById('canvas-empty');
var propsEmpty = document.getElementById('props-empty');
var propsPanel = document.getElementById('props-panel');
var toastEl = document.getElementById('toast');
var undoBtn = document.getElementById('undo-btn');
var redoBtn = document.getElementById('redo-btn');
var downloadBtn = document.getElementById('download-btn');
var copyBtn = document.getElementById('copy-btn');
var canvasBgInput = document.getElementById('canvas-bg');
var canvasBgLabel = document.getElementById('canvas-bg-label');
var contentWidthSelect = document.getElementById('content-width');
var hiddenFileInput = document.getElementById('hidden-file-input');
var emailTitle = document.getElementById('email-title');
var snapToggle = document.getElementById('snap-toggle');

// =============================================
// HELPERS
// =============================================

function uid() { return 'b' + (idCounter++); }

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('visible');
    setTimeout(function() { toastEl.classList.remove('visible'); }, 2500);
}

function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

function snapVal(v) {
    if (!snapEnabled) return v;
    return Math.round(v / snapSize) * snapSize;
}

// =============================================
// DEFAULT EFFECTS OBJECT
// =============================================

function defaultEffects() {
    return {
        dropShadow: false,
        glow: false,
        glowColor: '#6366f1',
        blur: false,
        gradientBorder: false,
        glassmorphism: false,
        neonOutline: false,
        neonColor: '#00ff88',
        rotate: false,
        rotateAngle: '5',
        scalePulse: false,
        float: false,
        fadeIn: false,
        slideInLeft: false,
        slideInRight: false,
        bounceIn: false,
        typewriter: false,
        colorShift: false
    };
}

// =============================================
// BLOCK DEFAULTS — 15 BLOCK TYPES
// =============================================

function createBlock(type) {
    var b = {
        id: uid(),
        type: type,
        x: 20,
        y: nextBlockY,
        w: contentWidth - 40,
        styles: {},
        effects: defaultEffects()
    };

    if (type === 'text') {
        b.content = 'Click to edit this text. You can change the font, size, color, and alignment in the properties panel.';
        b.styles = { fontSize: '16', fontWeight: 'normal', fontStyle: 'normal', color: '#333333', textAlign: 'left', lineHeight: '1.6', bgColor: '', paddingTop: '16', paddingBottom: '16', paddingLeft: '24', paddingRight: '24', borderRadius: '0', shadow: 'none' };
    } else if (type === 'image') {
        b.src = '';
        b.alt = 'Image';
        b.styles = { width: '100', borderRadius: '0', paddingTop: '0', paddingBottom: '0', paddingLeft: '0', paddingRight: '0', textAlign: 'center' };
    } else if (type === 'button') {
        b.text = 'Click Here';
        b.link = 'https://example.com';
        b.styles = { bgColor: '#6366f1', textColor: '#ffffff', fontSize: '16', fontWeight: 'bold', paddingTop: '14', paddingBottom: '14', paddingLeft: '32', paddingRight: '32', borderRadius: '8', textAlign: 'center', fullWidth: false, shadow: 'none', containerPaddingTop: '16', containerPaddingBottom: '16' };
    } else if (type === 'divider') {
        b.styles = { color: '#e2e8f0', thickness: '1', style: 'solid', paddingTop: '16', paddingBottom: '16', paddingLeft: '24', paddingRight: '24' };
    } else if (type === 'spacer') {
        b.styles = { height: '40' };
    } else if (type === 'hero') {
        b.headline = 'Welcome to Our Brand';
        b.subtext = 'Discover amazing things with us today.';
        b.btnText = 'Get Started';
        b.btnLink = 'https://example.com';
        b.styles = { bgColor: '#6366f1', bgImage: '', textColor: '#ffffff', btnBg: '#ffffff', btnColor: '#6366f1', paddingTop: '60', paddingBottom: '60', textAlign: 'center', overlayOpacity: '0.5' };
    } else if (type === 'columns') {
        b.leftContent = 'Left column content goes here. Edit this text.';
        b.rightContent = 'Right column content goes here. Edit this text.';
        b.styles = { gap: '16', bgColor: '', leftBgColor: '', rightBgColor: '', paddingTop: '16', paddingBottom: '16', paddingLeft: '24', paddingRight: '24', color: '#333333' };
    } else if (type === 'social') {
        b.links = { twitter: '#', linkedin: '#', instagram: '#', facebook: '#' };
        b.styles = { textAlign: 'center', bgColor: '#1e293b', iconColor: '#ffffff', paddingTop: '24', paddingBottom: '24' };
    } else if (type === 'threeCol') {
        b.col1 = 'Column 1 content here.';
        b.col2 = 'Column 2 content here.';
        b.col3 = 'Column 3 content here.';
        b.styles = { gap: '12', bgColor: '', col1Bg: '', col2Bg: '', col3Bg: '', paddingTop: '16', paddingBottom: '16', paddingLeft: '16', paddingRight: '16', color: '#333333' };
    } else if (type === 'video') {
        b.videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        b.thumbnailUrl = '';
        b.styles = { paddingTop: '16', paddingBottom: '16', paddingLeft: '24', paddingRight: '24', borderRadius: '8', textAlign: 'center' };
    } else if (type === 'quote') {
        b.quoteText = '"Design is not just what it looks like and feels like. Design is how it works."';
        b.author = '— Steve Jobs';
        b.styles = { borderColor: '#6366f1', borderWidth: '4', bgColor: '#f8fafc', color: '#334155', authorColor: '#64748b', fontSize: '18', paddingTop: '24', paddingBottom: '24', paddingLeft: '28', paddingRight: '28', fontStyle: 'italic' };
    } else if (type === 'list') {
        b.items = ['First item in the list', 'Second item goes here', 'Third item for demo'];
        b.listType = 'bullet';
        b.styles = { color: '#333333', fontSize: '15', lineHeight: '1.8', bgColor: '', bulletColor: '#6366f1', paddingTop: '16', paddingBottom: '16', paddingLeft: '32', paddingRight: '24' };
    } else if (type === 'countdown') {
        b.days = '07';
        b.hours = '12';
        b.minutes = '30';
        b.seconds = '00';
        b.label = 'Offer ends in:';
        b.styles = { bgColor: '#0f172a', textColor: '#ffffff', accentColor: '#6366f1', fontSize: '36', paddingTop: '30', paddingBottom: '30', textAlign: 'center' };
    } else if (type === 'footer') {
        b.companyName = 'Your Company';
        b.address = '123 Main Street, City, Country';
        b.unsubText = 'Unsubscribe';
        b.unsubLink = '#';
        b.styles = { bgColor: '#f8fafc', color: '#64748b', fontSize: '12', paddingTop: '24', paddingBottom: '24', textAlign: 'center' };
    } else if (type === 'logoHeader') {
        b.logoText = 'BRAND';
        b.navLinks = [{ text: 'Home', url: '#' }, { text: 'About', url: '#' }, { text: 'Contact', url: '#' }];
        b.styles = { bgColor: '#ffffff', textColor: '#0f172a', linkColor: '#6366f1', fontSize: '14', paddingTop: '16', paddingBottom: '16', paddingLeft: '24', paddingRight: '24', logoFontSize: '22' };
    }

    nextBlockY += 20;
    return b;
}

// =============================================
// HISTORY (UNDO / REDO)
// =============================================

function saveState() {
    history = history.slice(0, historyIndex + 1);
    history.push(clone(blocks));
    if (history.length > maxHistory) history.shift();
    historyIndex = history.length - 1;
    updateUndoRedoBtns();
}

function undo() {
    if (historyIndex <= 0) return;
    historyIndex--;
    blocks = clone(history[historyIndex]);
    selectedBlockId = null;
    renderCanvas();
    renderProps();
    updateUndoRedoBtns();
}

function redo() {
    if (historyIndex >= history.length - 1) return;
    historyIndex++;
    blocks = clone(history[historyIndex]);
    selectedBlockId = null;
    renderCanvas();
    renderProps();
    updateUndoRedoBtns();
}

function updateUndoRedoBtns() {
    undoBtn.disabled = historyIndex <= 0;
    redoBtn.disabled = historyIndex >= history.length - 1;
}

// =============================================
// RENDER CANVAS — FREE POSITIONED BLOCKS
// =============================================

function renderCanvas() {
    var oldWrappers = canvas.querySelectorAll('.block-wrapper');
    for (var i = 0; i < oldWrappers.length; i++) {
        canvas.removeChild(oldWrappers[i]);
    }

    if (blocks.length === 0) {
        canvasEmpty.style.display = '';
        canvas.style.minHeight = '400px';
        return;
    }
    canvasEmpty.style.display = 'none';

    var maxBottom = 400;

    for (var i = 0; i < blocks.length; i++) {
        var b = blocks[i];
        var wrapper = document.createElement('div');
        wrapper.className = 'block-wrapper' + (b.id === selectedBlockId ? ' selected' : '');
        wrapper.setAttribute('data-id', b.id);

        // Free positioning
        wrapper.style.left = b.x + 'px';
        wrapper.style.top = b.y + 'px';
        wrapper.style.width = b.w + 'px';
        wrapper.style.zIndex = (b.id === selectedBlockId) ? 50 : (10 + i);

        // Apply effects CSS classes
        applyEffectClasses(wrapper, b.effects);

        // Actions bar
        var actions = document.createElement('div');
        actions.className = 'block-actions';

        // Duplicate
        var dupBtn = document.createElement('button');
        dupBtn.className = 'block-action-btn';
        dupBtn.type = 'button';
        dupBtn.title = 'Duplicate';
        dupBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
        dupBtn.setAttribute('data-action', 'dup');
        dupBtn.setAttribute('data-id', b.id);

        // Delete
        var delBtn = document.createElement('button');
        delBtn.className = 'block-action-btn delete-btn';
        delBtn.type = 'button';
        delBtn.title = 'Delete';
        delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
        delBtn.setAttribute('data-action', 'delete');
        delBtn.setAttribute('data-id', b.id);

        actions.appendChild(dupBtn);
        actions.appendChild(delBtn);
        wrapper.appendChild(actions);

        // Block content
        var content = document.createElement('div');
        content.className = 'block-content';
        content.innerHTML = renderBlockHTML(b);
        wrapper.appendChild(content);

        // Resize handle
        var resizeHandle = document.createElement('div');
        resizeHandle.className = 'block-resize-handle';
        resizeHandle.setAttribute('data-id', b.id);
        wrapper.appendChild(resizeHandle);

        // Position indicator
        var posLabel = document.createElement('div');
        posLabel.className = 'block-position-indicator';
        posLabel.textContent = Math.round(b.x) + ', ' + Math.round(b.y);
        wrapper.appendChild(posLabel);

        canvas.appendChild(wrapper);

        var bottom = b.y + wrapper.offsetHeight + 40;
        if (bottom > maxBottom) maxBottom = bottom;
    }

    canvas.style.minHeight = maxBottom + 'px';
    canvas.style.backgroundColor = canvasBg;
}

function applyEffectClasses(el, effects) {
    if (!effects) return;
    if (effects.dropShadow) el.classList.add('fx-dropShadow');
    if (effects.glow) {
        el.classList.add('fx-glow');
        el.style.setProperty('--fx-glow-color', effects.glowColor || '#6366f1');
    }
    if (effects.blur) el.classList.add('fx-blur');
    if (effects.gradientBorder) el.classList.add('fx-gradientBorder');
    if (effects.glassmorphism) el.classList.add('fx-glassmorphism');
    if (effects.neonOutline) {
        el.classList.add('fx-neonOutline');
        el.style.setProperty('--fx-neon-color', effects.neonColor || '#00ff88');
    }
    if (effects.rotate) {
        el.classList.add('fx-rotate');
        el.style.setProperty('--fx-rotate-angle', (effects.rotateAngle || '5') + 'deg');
    }
    if (effects.scalePulse) el.classList.add('fx-scalePulse');
    if (effects.float) el.classList.add('fx-float');
    if (effects.fadeIn) el.classList.add('fx-fadeIn');
    if (effects.slideInLeft) el.classList.add('fx-slideInLeft');
    if (effects.slideInRight) el.classList.add('fx-slideInRight');
    if (effects.bounceIn) el.classList.add('fx-bounceIn');
    if (effects.typewriter) el.classList.add('fx-typewriter');
    if (effects.colorShift) el.classList.add('fx-colorShift');
}

// =============================================
// RENDER BLOCK HTML CONTENT
// =============================================

function renderBlockHTML(b) {
    var s = b.styles;

    if (b.type === 'text') {
        return '<div style="'
            + 'font-size:' + s.fontSize + 'px;'
            + 'font-weight:' + s.fontWeight + ';'
            + 'font-style:' + s.fontStyle + ';'
            + 'color:' + s.color + ';'
            + 'text-align:' + s.textAlign + ';'
            + 'line-height:' + s.lineHeight + ';'
            + 'padding:' + s.paddingTop + 'px ' + s.paddingRight + 'px ' + s.paddingBottom + 'px ' + s.paddingLeft + 'px;'
            + (s.bgColor ? 'background-color:' + s.bgColor + ';' : '')
            + (s.borderRadius !== '0' ? 'border-radius:' + s.borderRadius + 'px;' : '')
            + getShadowStyle(s.shadow)
            + '">' + b.content + '</div>';
    }

    if (b.type === 'image') {
        if (!b.src) {
            return '<div style="padding:40px 20px;text-align:center;background:#f8fafc;color:#94a3b8;font-size:14px;">'
                + '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" style="display:block;margin:0 auto 8px;"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'
                + 'Click here, then upload an image in the properties panel</div>';
        }
        return '<div style="text-align:' + s.textAlign + ';padding:' + s.paddingTop + 'px ' + s.paddingRight + 'px ' + s.paddingBottom + 'px ' + s.paddingLeft + 'px;">'
            + '<img src="' + b.src + '" alt="' + escapeHtml(b.alt) + '" style="max-width:' + s.width + '%;display:inline-block;border-radius:' + s.borderRadius + 'px;"></div>';
    }

    if (b.type === 'button') {
        var btnPadding = s.paddingTop + 'px ' + s.paddingRight + 'px ' + s.paddingBottom + 'px ' + s.paddingLeft + 'px';
        var btnStyle = 'display:inline-block;padding:' + btnPadding + ';background-color:' + s.bgColor + ';color:' + s.textColor + ';text-decoration:none;border-radius:' + s.borderRadius + 'px;font-size:' + s.fontSize + 'px;font-weight:' + s.fontWeight + ';' + getShadowStyle(s.shadow);
        if (s.fullWidth) btnStyle += 'display:block;text-align:center;';
        return '<div style="text-align:' + s.textAlign + ';padding:' + s.containerPaddingTop + 'px 24px ' + s.containerPaddingBottom + 'px 24px;"><a href="' + escapeHtml(b.link) + '" style="' + btnStyle + '">' + escapeHtml(b.text) + '</a></div>';
    }

    if (b.type === 'divider') {
        return '<div style="padding:' + s.paddingTop + 'px ' + s.paddingRight + 'px ' + s.paddingBottom + 'px ' + s.paddingLeft + 'px;"><hr style="border:none;border-top:' + s.thickness + 'px ' + s.style + ' ' + s.color + ';margin:0;"></div>';
    }

    if (b.type === 'spacer') {
        return '<div style="height:' + s.height + 'px;"></div>';
    }

    if (b.type === 'hero') {
        var bgStyle = 'background-color:' + s.bgColor + ';';
        if (s.bgImage) {
            bgStyle += 'background-image:url(' + s.bgImage + ');background-size:cover;background-position:center;';
        }
        bgStyle += 'padding:' + s.paddingTop + 'px 30px ' + s.paddingBottom + 'px 30px;text-align:' + s.textAlign + ';color:' + s.textColor + ';';
        var overlay = '';
        if (s.bgImage) {
            overlay = '<div style="position:absolute;inset:0;background:rgba(0,0,0,' + s.overlayOpacity + ');"></div>';
        }
        return '<div style="position:relative;' + bgStyle + '">'
            + overlay
            + '<div style="position:relative;z-index:1;">'
            + '<h1 style="margin:0 0 12px;font-size:32px;color:' + s.textColor + ';">' + escapeHtml(b.headline) + '</h1>'
            + '<p style="margin:0 0 28px;font-size:16px;opacity:0.9;color:' + s.textColor + ';">' + escapeHtml(b.subtext) + '</p>'
            + '<a href="' + escapeHtml(b.btnLink) + '" style="display:inline-block;padding:14px 32px;background:' + s.btnBg + ';color:' + s.btnColor + ';text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;">' + escapeHtml(b.btnText) + '</a>'
            + '</div></div>';
    }

    if (b.type === 'columns') {
        var colStyle = 'display:flex;gap:' + s.gap + 'px;padding:' + s.paddingTop + 'px ' + s.paddingRight + 'px ' + s.paddingBottom + 'px ' + s.paddingLeft + 'px;' + (s.bgColor ? 'background-color:' + s.bgColor + ';' : '');
        var leftStyle = 'flex:1;padding:16px;color:' + s.color + ';' + (s.leftBgColor ? 'background:' + s.leftBgColor + ';border-radius:8px;' : '');
        var rightStyle = 'flex:1;padding:16px;color:' + s.color + ';' + (s.rightBgColor ? 'background:' + s.rightBgColor + ';border-radius:8px;' : '');
        return '<div style="' + colStyle + '">'
            + '<div style="' + leftStyle + '">' + b.leftContent + '</div>'
            + '<div style="' + rightStyle + '">' + b.rightContent + '</div>'
            + '</div>';
    }

    if (b.type === 'social') {
        var socStyle = 'text-align:' + s.textAlign + ';background-color:' + s.bgColor + ';padding:' + s.paddingTop + 'px 24px ' + s.paddingBottom + 'px 24px;';
        var linkStyle = 'display:inline-block;margin:0 8px;color:' + s.iconColor + ';text-decoration:none;font-weight:600;font-size:14px;';
        return '<div style="' + socStyle + '">'
            + (b.links.twitter ? '<a href="' + b.links.twitter + '" style="' + linkStyle + '">Twitter</a>' : '')
            + (b.links.linkedin ? '<a href="' + b.links.linkedin + '" style="' + linkStyle + '">LinkedIn</a>' : '')
            + (b.links.instagram ? '<a href="' + b.links.instagram + '" style="' + linkStyle + '">Instagram</a>' : '')
            + (b.links.facebook ? '<a href="' + b.links.facebook + '" style="' + linkStyle + '">Facebook</a>' : '')
            + '</div>';
    }

    // ---- NEW BLOCK TYPES ----

    if (b.type === 'threeCol') {
        var tcStyle = 'display:flex;gap:' + s.gap + 'px;padding:' + s.paddingTop + 'px ' + s.paddingRight + 'px ' + s.paddingBottom + 'px ' + s.paddingLeft + 'px;' + (s.bgColor ? 'background-color:' + s.bgColor + ';' : '');
        var c1 = 'flex:1;padding:12px;color:' + s.color + ';font-size:14px;' + (s.col1Bg ? 'background:' + s.col1Bg + ';border-radius:8px;' : '');
        var c2 = 'flex:1;padding:12px;color:' + s.color + ';font-size:14px;' + (s.col2Bg ? 'background:' + s.col2Bg + ';border-radius:8px;' : '');
        var c3 = 'flex:1;padding:12px;color:' + s.color + ';font-size:14px;' + (s.col3Bg ? 'background:' + s.col3Bg + ';border-radius:8px;' : '');
        return '<div style="' + tcStyle + '">'
            + '<div style="' + c1 + '">' + b.col1 + '</div>'
            + '<div style="' + c2 + '">' + b.col2 + '</div>'
            + '<div style="' + c3 + '">' + b.col3 + '</div>'
            + '</div>';
    }

    if (b.type === 'video') {
        var vidThumb = b.thumbnailUrl || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="560" height="315" viewBox="0 0 560 315"><rect fill="#1e293b" width="560" height="315"/><polygon fill="#fff" points="230,100 230,215 340,157.5" opacity="0.8"/></svg>');
        return '<div style="text-align:' + s.textAlign + ';padding:' + s.paddingTop + 'px ' + s.paddingRight + 'px ' + s.paddingBottom + 'px ' + s.paddingLeft + 'px;">'
            + '<div style="position:relative;display:inline-block;max-width:100%;border-radius:' + s.borderRadius + 'px;overflow:hidden;">'
            + '<img src="' + vidThumb + '" style="width:100%;display:block;border-radius:' + s.borderRadius + 'px;" alt="Video thumbnail">'
            + '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);">'
            + '<div style="width:60px;height:60px;background:rgba(255,255,255,0.9);border-radius:50%;display:flex;align-items:center;justify-content:center;">'
            + '<div style="width:0;height:0;border-left:20px solid #333;border-top:12px solid transparent;border-bottom:12px solid transparent;margin-left:4px;"></div>'
            + '</div></div></div></div>';
    }

    if (b.type === 'quote') {
        return '<div style="padding:' + s.paddingTop + 'px ' + s.paddingRight + 'px ' + s.paddingBottom + 'px ' + s.paddingLeft + 'px;background:' + (s.bgColor || '#f8fafc') + ';border-left:' + s.borderWidth + 'px solid ' + s.borderColor + ';">'
            + '<p style="margin:0 0 8px;font-size:' + s.fontSize + 'px;color:' + s.color + ';font-style:' + s.fontStyle + ';line-height:1.6;">' + escapeHtml(b.quoteText) + '</p>'
            + '<p style="margin:0;font-size:13px;color:' + s.authorColor + ';font-weight:600;">' + escapeHtml(b.author) + '</p>'
            + '</div>';
    }

    if (b.type === 'list') {
        var listTag = b.listType === 'numbered' ? 'ol' : 'ul';
        var listItems = '';
        for (var li = 0; li < b.items.length; li++) {
            listItems += '<li style="margin-bottom:6px;">' + escapeHtml(b.items[li]) + '</li>';
        }
        var bulletStyle = b.listType === 'bullet' ? 'list-style-type:disc;' : 'list-style-type:decimal;';
        return '<div style="padding:' + s.paddingTop + 'px ' + s.paddingRight + 'px ' + s.paddingBottom + 'px ' + s.paddingLeft + 'px;' + (s.bgColor ? 'background:' + s.bgColor + ';' : '') + '">'
            + '<' + listTag + ' style="margin:0;padding-left:20px;color:' + s.color + ';font-size:' + s.fontSize + 'px;line-height:' + s.lineHeight + ';' + bulletStyle + '">'
            + listItems
            + '</' + listTag + '></div>';
    }

    if (b.type === 'countdown') {
        var boxStyle = 'display:inline-block;padding:12px 18px;background:' + s.accentColor + ';border-radius:10px;margin:0 6px;text-align:center;min-width:70px;';
        var numStyle = 'display:block;font-size:' + s.fontSize + 'px;font-weight:800;color:' + s.textColor + ';line-height:1.2;';
        var lblStyle = 'display:block;font-size:11px;color:' + s.textColor + ';opacity:0.7;text-transform:uppercase;letter-spacing:1px;margin-top:4px;';
        return '<div style="background:' + s.bgColor + ';padding:' + s.paddingTop + 'px 20px ' + s.paddingBottom + 'px 20px;text-align:' + s.textAlign + ';">'
            + '<p style="margin:0 0 16px;font-size:14px;color:' + s.textColor + ';opacity:0.8;">' + escapeHtml(b.label) + '</p>'
            + '<div style="display:inline-flex;gap:8px;">'
            + '<div style="' + boxStyle + '"><span style="' + numStyle + '">' + escapeHtml(b.days) + '</span><span style="' + lblStyle + '">Days</span></div>'
            + '<div style="' + boxStyle + '"><span style="' + numStyle + '">' + escapeHtml(b.hours) + '</span><span style="' + lblStyle + '">Hrs</span></div>'
            + '<div style="' + boxStyle + '"><span style="' + numStyle + '">' + escapeHtml(b.minutes) + '</span><span style="' + lblStyle + '">Min</span></div>'
            + '<div style="' + boxStyle + '"><span style="' + numStyle + '">' + escapeHtml(b.seconds) + '</span><span style="' + lblStyle + '">Sec</span></div>'
            + '</div></div>';
    }

    if (b.type === 'footer') {
        return '<div style="background:' + s.bgColor + ';padding:' + s.paddingTop + 'px 24px ' + s.paddingBottom + 'px 24px;text-align:' + s.textAlign + ';font-size:' + s.fontSize + 'px;color:' + s.color + ';">'
            + '<p style="margin:0 0 6px;font-weight:600;">' + escapeHtml(b.companyName) + '</p>'
            + '<p style="margin:0 0 10px;opacity:0.8;">' + escapeHtml(b.address) + '</p>'
            + '<a href="' + escapeHtml(b.unsubLink) + '" style="color:' + s.color + ';font-size:11px;text-decoration:underline;opacity:0.6;">' + escapeHtml(b.unsubText) + '</a>'
            + '</div>';
    }

    if (b.type === 'logoHeader') {
        var navHtml = '';
        if (b.navLinks && b.navLinks.length) {
            for (var n = 0; n < b.navLinks.length; n++) {
                navHtml += '<a href="' + escapeHtml(b.navLinks[n].url) + '" style="color:' + s.linkColor + ';text-decoration:none;font-size:' + s.fontSize + 'px;font-weight:500;margin:0 12px;">' + escapeHtml(b.navLinks[n].text) + '</a>';
            }
        }
        return '<div style="display:flex;align-items:center;justify-content:space-between;background:' + s.bgColor + ';padding:' + s.paddingTop + 'px ' + s.paddingRight + 'px ' + s.paddingBottom + 'px ' + s.paddingLeft + 'px;">'
            + '<div style="font-size:' + s.logoFontSize + 'px;font-weight:800;color:' + s.textColor + ';letter-spacing:2px;">' + escapeHtml(b.logoText) + '</div>'
            + '<div>' + navHtml + '</div>'
            + '</div>';
    }

    return '<div style="padding:20px;color:#999;">Unknown block type</div>';
}

function getShadowStyle(shadow) {
    if (shadow === 'subtle') return 'box-shadow:0 1px 3px rgba(0,0,0,0.1);';
    if (shadow === 'medium') return 'box-shadow:0 4px 12px rgba(0,0,0,0.12);';
    if (shadow === 'strong') return 'box-shadow:0 8px 30px rgba(0,0,0,0.18);';
    return '';
}

// =============================================
// RENDER PROPERTIES PANEL
// =============================================

function renderProps() {
    if (!selectedBlockId) {
        propsEmpty.style.display = '';
        propsPanel.style.display = 'none';
        return;
    }

    var b = findBlock(selectedBlockId);
    if (!b) {
        propsEmpty.style.display = '';
        propsPanel.style.display = 'none';
        return;
    }

    propsEmpty.style.display = 'none';
    propsPanel.style.display = '';

    var html = '';
    var s = b.styles;

    // Type header
    var typeLabels = { text: 'Text Block', image: 'Image Block', button: 'Button Block', divider: 'Divider', spacer: 'Spacer', hero: 'Hero Section', columns: '2-Column', social: 'Social Links', threeCol: '3-Column', video: 'Video Block', quote: 'Quote Block', list: 'List Block', countdown: 'Countdown', footer: 'Footer', logoHeader: 'Logo Header' };
    html += '<div class="props-section" style="background:#f8fafc;"><div style="font-weight:700;color:#0f172a;font-size:0.95rem;">' + (typeLabels[b.type] || b.type) + '</div></div>';

    // POSITION
    html += '<div class="props-section"><div class="props-section-title">Position & Size</div>'
        + propRange('pos-x', 'X Position', b.x, 0, contentWidth, 'px')
        + propRange('pos-y', 'Y Position', b.y, 0, 2000, 'px')
        + propRange('pos-w', 'Width', b.w, 60, contentWidth, 'px')
        + '</div>';

    // TYPE-SPECIFIC PROPERTIES
    if (b.type === 'text') {
        html += '<div class="props-section"><div class="props-section-title">Content</div>'
            + propTextarea('text-content', 'Text', b.content)
            + '</div>';
        html += '<div class="props-section"><div class="props-section-title">Typography</div>'
            + propRange('text-fontSize', 'Font Size', s.fontSize, 10, 48, 'px')
            + propButtonRow('text-fontWeight', 'Weight', [{ val: 'normal', label: 'Normal' }, { val: 'bold', label: 'Bold' }], s.fontWeight)
            + propButtonRow('text-fontStyle', 'Style', [{ val: 'normal', label: 'Normal' }, { val: 'italic', label: 'Italic' }], s.fontStyle)
            + propColor('text-color', 'Text Color', s.color)
            + propButtonRow('text-textAlign', 'Align', [{ val: 'left', label: '⫷' }, { val: 'center', label: '☰' }, { val: 'right', label: '⫸' }], s.textAlign)
            + propRange('text-lineHeight', 'Line Height', parseFloat(s.lineHeight) * 10, 10, 30, '', true)
            + '</div>';
        html += '<div class="props-section"><div class="props-section-title">Background & Effects</div>'
            + propColor('text-bgColor', 'Background', s.bgColor || '#ffffff')
            + propRange('text-borderRadius', 'Corner Radius', s.borderRadius, 0, 30, 'px')
            + propShadow('text-shadow', s.shadow)
            + '</div>';
        html += '<div class="props-section"><div class="props-section-title">Padding</div>'
            + propRange('text-paddingTop', 'Top', s.paddingTop, 0, 60, 'px')
            + propRange('text-paddingBottom', 'Bottom', s.paddingBottom, 0, 60, 'px')
            + propRange('text-paddingLeft', 'Left', s.paddingLeft, 0, 60, 'px')
            + propRange('text-paddingRight', 'Right', s.paddingRight, 0, 60, 'px')
            + '</div>';
    }

    if (b.type === 'image') {
        html += '<div class="props-section"><div class="props-section-title">Image Source</div>'
            + '<div class="prop-group"><button type="button" class="prop-upload-btn" id="prop-img-upload">Upload Image</button></div>'
            + propInput('img-src', 'Or paste URL', b.src)
            + propInput('img-alt', 'Alt Text', b.alt)
            + '</div>';
        html += '<div class="props-section"><div class="props-section-title">Sizing</div>'
            + propRange('img-width', 'Width', s.width, 10, 100, '%')
            + propRange('img-borderRadius', 'Corner Radius', s.borderRadius, 0, 50, 'px')
            + propButtonRow('img-textAlign', 'Align', [{ val: 'left', label: '⫷' }, { val: 'center', label: '☰' }, { val: 'right', label: '⫸' }], s.textAlign)
            + '</div>';
        html += '<div class="props-section"><div class="props-section-title">Padding</div>'
            + propRange('img-paddingTop', 'Top', s.paddingTop, 0, 60, 'px')
            + propRange('img-paddingBottom', 'Bottom', s.paddingBottom, 0, 60, 'px')
            + '</div>';
    }

    if (b.type === 'button') {
        html += '<div class="props-section"><div class="props-section-title">Button</div>'
            + propInput('btn-text', 'Button Text', b.text)
            + propInput('btn-link', 'Button Link', b.link)
            + '</div>';
        html += '<div class="props-section"><div class="props-section-title">Style</div>'
            + propColor('btn-bgColor', 'Button Color', s.bgColor)
            + propColor('btn-textColor', 'Text Color', s.textColor)
            + propRange('btn-fontSize', 'Font Size', s.fontSize, 12, 28, 'px')
            + propRange('btn-borderRadius', 'Corner Radius', s.borderRadius, 0, 30, 'px')
            + propButtonRow('btn-textAlign', 'Align', [{ val: 'left', label: '⫷' }, { val: 'center', label: '☰' }, { val: 'right', label: '⫸' }], s.textAlign)
            + propShadow('btn-shadow', s.shadow)
            + '</div>';
        html += '<div class="props-section"><div class="props-section-title">Padding (Button)</div>'
            + propRange('btn-paddingTop', 'Top', s.paddingTop, 4, 30, 'px')
            + propRange('btn-paddingBottom', 'Bottom', s.paddingBottom, 4, 30, 'px')
            + propRange('btn-paddingLeft', 'Left', s.paddingLeft, 8, 60, 'px')
            + propRange('btn-paddingRight', 'Right', s.paddingRight, 8, 60, 'px')
            + '</div>';
    }

    if (b.type === 'divider') {
        html += '<div class="props-section"><div class="props-section-title">Divider Style</div>'
            + propColor('div-color', 'Color', s.color)
            + propRange('div-thickness', 'Thickness', s.thickness, 1, 8, 'px')
            + propSelect('div-style', 'Style', [{ val: 'solid', label: 'Solid' }, { val: 'dashed', label: 'Dashed' }, { val: 'dotted', label: 'Dotted' }], s.style)
            + '</div>';
        html += '<div class="props-section"><div class="props-section-title">Spacing</div>'
            + propRange('div-paddingTop', 'Top', s.paddingTop, 0, 60, 'px')
            + propRange('div-paddingBottom', 'Bottom', s.paddingBottom, 0, 60, 'px')
            + '</div>';
    }

    if (b.type === 'spacer') {
        html += '<div class="props-section"><div class="props-section-title">Spacer</div>'
            + propRange('spc-height', 'Height', s.height, 8, 120, 'px')
            + '</div>';
    }

    if (b.type === 'hero') {
        html += '<div class="props-section"><div class="props-section-title">Content</div>'
            + propInput('hero-headline', 'Headline', b.headline)
            + propTextarea('hero-subtext', 'Subtext', b.subtext)
            + propInput('hero-btnText', 'Button Text', b.btnText)
            + propInput('hero-btnLink', 'Button Link', b.btnLink)
            + '</div>';
        html += '<div class="props-section"><div class="props-section-title">Background</div>'
            + propColor('hero-bgColor', 'Background Color', s.bgColor)
            + '<div class="prop-group"><button type="button" class="prop-upload-btn" id="prop-hero-bg-upload">Upload Background Image</button></div>'
            + (s.bgImage ? '<div class="prop-group"><span class="prop-label">Current: image uploaded</span></div>' : '')
            + propRange('hero-overlayOpacity', 'Overlay Darkness', parseFloat(s.overlayOpacity) * 100, 0, 90, '%', false, true)
            + '</div>';
        html += '<div class="props-section"><div class="props-section-title">Colors</div>'
            + propColor('hero-textColor', 'Text Color', s.textColor)
            + propColor('hero-btnBg', 'Button BG', s.btnBg)
            + propColor('hero-btnColor', 'Button Text', s.btnColor)
            + '</div>';
        html += '<div class="props-section"><div class="props-section-title">Spacing</div>'
            + propRange('hero-paddingTop', 'Top', s.paddingTop, 20, 120, 'px')
            + propRange('hero-paddingBottom', 'Bottom', s.paddingBottom, 20, 120, 'px')
            + '</div>';
    }

    if (b.type === 'columns') {
        html += '<div class="props-section"><div class="props-section-title">Content</div>'
            + propTextarea('col-leftContent', 'Left Column', b.leftContent)
            + propTextarea('col-rightContent', 'Right Column', b.rightContent)
            + '</div>';
        html += '<div class="props-section"><div class="props-section-title">Style</div>'
            + propColor('col-color', 'Text Color', s.color)
            + propColor('col-bgColor', 'Container BG', s.bgColor || '#ffffff')
            + propColor('col-leftBgColor', 'Left BG', s.leftBgColor || '#ffffff')
            + propColor('col-rightBgColor', 'Right BG', s.rightBgColor || '#ffffff')
            + propRange('col-gap', 'Column Gap', s.gap, 0, 40, 'px')
            + '</div>';
    }

    if (b.type === 'social') {
        html += '<div class="props-section"><div class="props-section-title">Links</div>'
            + propInput('soc-twitter', 'Twitter URL', b.links.twitter)
            + propInput('soc-linkedin', 'LinkedIn URL', b.links.linkedin)
            + propInput('soc-instagram', 'Instagram URL', b.links.instagram)
            + propInput('soc-facebook', 'Facebook URL', b.links.facebook)
            + '</div>';
        html += '<div class="props-section"><div class="props-section-title">Style</div>'
            + propColor('soc-bgColor', 'Background', s.bgColor)
            + propColor('soc-iconColor', 'Link Color', s.iconColor)
            + propButtonRow('soc-textAlign', 'Align', [{ val: 'left', label: '⫷' }, { val: 'center', label: '☰' }, { val: 'right', label: '⫸' }], s.textAlign)
            + '</div>';
    }

    // ---- NEW BLOCK TYPE PROPERTIES ----

    if (b.type === 'threeCol') {
        html += '<div class="props-section"><div class="props-section-title">Content</div>'
            + propTextarea('tc-col1', 'Column 1', b.col1)
            + propTextarea('tc-col2', 'Column 2', b.col2)
            + propTextarea('tc-col3', 'Column 3', b.col3)
            + '</div>';
        html += '<div class="props-section"><div class="props-section-title">Style</div>'
            + propColor('tc-color', 'Text Color', s.color)
            + propColor('tc-bgColor', 'Container BG', s.bgColor || '#ffffff')
            + propRange('tc-gap', 'Column Gap', s.gap, 0, 30, 'px')
            + '</div>';
    }

    if (b.type === 'video') {
        html += '<div class="props-section"><div class="props-section-title">Video</div>'
            + propInput('vid-url', 'Video URL', b.videoUrl)
            + propInput('vid-thumb', 'Thumbnail URL (optional)', b.thumbnailUrl)
            + '</div>';
        html += '<div class="props-section"><div class="props-section-title">Style</div>'
            + propRange('vid-borderRadius', 'Corner Radius', s.borderRadius, 0, 30, 'px')
            + propRange('vid-paddingTop', 'Padding Top', s.paddingTop, 0, 60, 'px')
            + propRange('vid-paddingBottom', 'Padding Bottom', s.paddingBottom, 0, 60, 'px')
            + '</div>';
    }

    if (b.type === 'quote') {
        html += '<div class="props-section"><div class="props-section-title">Quote</div>'
            + propTextarea('qt-text', 'Quote Text', b.quoteText)
            + propInput('qt-author', 'Author', b.author)
            + '</div>';
        html += '<div class="props-section"><div class="props-section-title">Style</div>'
            + propColor('qt-borderColor', 'Border Color', s.borderColor)
            + propColor('qt-color', 'Text Color', s.color)
            + propColor('qt-bgColor', 'Background', s.bgColor || '#f8fafc')
            + propRange('qt-fontSize', 'Font Size', s.fontSize, 14, 28, 'px')
            + propRange('qt-borderWidth', 'Border Width', s.borderWidth, 2, 10, 'px')
            + '</div>';
    }

    if (b.type === 'list') {
        html += '<div class="props-section"><div class="props-section-title">List Items</div>'
            + propTextarea('lst-items', 'Items (one per line)', b.items.join('\n'))
            + propButtonRow('lst-listType', 'Type', [{ val: 'bullet', label: 'Bullets' }, { val: 'numbered', label: 'Numbers' }], b.listType)
            + '</div>';
        html += '<div class="props-section"><div class="props-section-title">Style</div>'
            + propColor('lst-color', 'Text Color', s.color)
            + propRange('lst-fontSize', 'Font Size', s.fontSize, 12, 24, 'px')
            + '</div>';
    }

    if (b.type === 'countdown') {
        html += '<div class="props-section"><div class="props-section-title">Timer</div>'
            + propInput('cd-label', 'Label', b.label)
            + propInput('cd-days', 'Days', b.days)
            + propInput('cd-hours', 'Hours', b.hours)
            + propInput('cd-minutes', 'Minutes', b.minutes)
            + propInput('cd-seconds', 'Seconds', b.seconds)
            + '</div>';
        html += '<div class="props-section"><div class="props-section-title">Style</div>'
            + propColor('cd-bgColor', 'Background', s.bgColor)
            + propColor('cd-textColor', 'Text Color', s.textColor)
            + propColor('cd-accentColor', 'Accent Color', s.accentColor)
            + propRange('cd-fontSize', 'Number Size', s.fontSize, 20, 60, 'px')
            + '</div>';
    }

    if (b.type === 'footer') {
        html += '<div class="props-section"><div class="props-section-title">Footer Content</div>'
            + propInput('ft-companyName', 'Company Name', b.companyName)
            + propInput('ft-address', 'Address', b.address)
            + propInput('ft-unsubText', 'Unsubscribe Text', b.unsubText)
            + propInput('ft-unsubLink', 'Unsubscribe Link', b.unsubLink)
            + '</div>';
        html += '<div class="props-section"><div class="props-section-title">Style</div>'
            + propColor('ft-bgColor', 'Background', s.bgColor)
            + propColor('ft-color', 'Text Color', s.color)
            + propRange('ft-fontSize', 'Font Size', s.fontSize, 10, 16, 'px')
            + '</div>';
    }

    if (b.type === 'logoHeader') {
        var navStr = '';
        if (b.navLinks) {
            var parts = [];
            for (var n = 0; n < b.navLinks.length; n++) {
                parts.push(b.navLinks[n].text + '|' + b.navLinks[n].url);
            }
            navStr = parts.join(', ');
        }
        html += '<div class="props-section"><div class="props-section-title">Header</div>'
            + propInput('lh-logoText', 'Logo Text', b.logoText)
            + propInput('lh-navLinks', 'Nav Links (Text|URL, ...)', navStr)
            + '</div>';
        html += '<div class="props-section"><div class="props-section-title">Style</div>'
            + propColor('lh-bgColor', 'Background', s.bgColor)
            + propColor('lh-textColor', 'Logo Color', s.textColor)
            + propColor('lh-linkColor', 'Link Color', s.linkColor)
            + propRange('lh-logoFontSize', 'Logo Size', s.logoFontSize, 14, 36, 'px')
            + propRange('lh-fontSize', 'Nav Size', s.fontSize, 10, 20, 'px')
            + '</div>';
    }

    // ---- EFFECTS PANEL (ALL BLOCK TYPES) ----
    html += renderEffectsPanel(b);

    propsPanel.innerHTML = html;
    attachPropListeners(b);
}

// =============================================
// EFFECTS PANEL UI
// =============================================

function renderEffectsPanel(b) {
    var fx = b.effects || defaultEffects();
    var effectList = [
        { key: 'dropShadow', label: 'Drop Shadow' },
        { key: 'glow', label: 'Glow' },
        { key: 'blur', label: 'Blur BG' },
        { key: 'gradientBorder', label: 'Gradient Border' },
        { key: 'glassmorphism', label: 'Glass' },
        { key: 'neonOutline', label: 'Neon' },
        { key: 'rotate', label: 'Rotate' },
        { key: 'scalePulse', label: 'Pulse' },
        { key: 'float', label: 'Float' },
        { key: 'fadeIn', label: 'Fade In' },
        { key: 'slideInLeft', label: 'Slide Left' },
        { key: 'slideInRight', label: 'Slide Right' },
        { key: 'bounceIn', label: 'Bounce' },
        { key: 'typewriter', label: 'Typewriter' },
        { key: 'colorShift', label: 'Color Shift' }
    ];

    var html = '<div class="props-section"><div class="props-section-title">✨ Effects</div>';
    html += '<div class="effects-grid">';
    for (var i = 0; i < effectList.length; i++) {
        var e = effectList[i];
        var isActive = fx[e.key] ? true : false;
        html += '<button type="button" class="fx-toggle-btn' + (isActive ? ' active' : '') + '" data-fx="' + e.key + '">'
            + '<span class="fx-dot"></span>' + e.label + '</button>';
    }
    html += '</div>';

    // Extra controls for parameterized effects
    if (fx.glow) {
        html += '<div class="prop-group" style="margin-top:10px;">' + propColor('fx-glowColor', 'Glow Color', fx.glowColor || '#6366f1') + '</div>';
    }
    if (fx.neonOutline) {
        html += '<div class="prop-group" style="margin-top:10px;">' + propColor('fx-neonColor', 'Neon Color', fx.neonColor || '#00ff88') + '</div>';
    }
    if (fx.rotate) {
        html += '<div class="prop-group" style="margin-top:10px;">' + propRange('fx-rotateAngle', 'Rotation', fx.rotateAngle || '5', -45, 45, '°') + '</div>';
    }

    html += '</div>';
    return html;
}

// ---- Property rendering helpers ----

function propInput(id, label, value) {
    return '<div class="prop-group"><label class="prop-label">' + label + '</label>'
        + '<input class="prop-input" type="text" id="prop-' + id + '" value="' + escapeHtml(value) + '"></div>';
}

function propTextarea(id, label, value) {
    return '<div class="prop-group"><label class="prop-label">' + label + '</label>'
        + '<textarea class="prop-textarea" id="prop-' + id + '">' + escapeHtml(value) + '</textarea></div>';
}

function propRange(id, label, value, min, max, unit, isDecimal, isPercent) {
    var displayVal = isDecimal ? (value / 10).toFixed(1) : value;
    if (isPercent) displayVal = value;
    return '<div class="prop-group"><label class="prop-label">' + label + '</label>'
        + '<div class="prop-range-row">'
        + '<input type="range" id="prop-' + id + '" min="' + min + '" max="' + max + '" value="' + value + '">'
        + '<span class="range-val" id="prop-' + id + '-val">' + displayVal + (unit || '') + '</span>'
        + '</div></div>';
}

function propColor(id, label, value) {
    return '<div class="prop-group"><label class="prop-label">' + label + '</label>'
        + '<div class="prop-color-row">'
        + '<input type="color" id="prop-' + id + '-picker" value="' + value + '">'
        + '<input type="text" id="prop-' + id + '-hex" value="' + value + '">'
        + '</div></div>';
}

function propButtonRow(id, label, options, active) {
    var html = '<div class="prop-group"><label class="prop-label">' + label + '</label><div class="prop-btn-row">';
    for (var i = 0; i < options.length; i++) {
        html += '<button type="button" class="prop-toggle-btn' + (options[i].val === active ? ' active' : '') + '" data-prop-id="' + id + '" data-val="' + options[i].val + '">' + options[i].label + '</button>';
    }
    html += '</div></div>';
    return html;
}

function propSelect(id, label, options, active) {
    var html = '<div class="prop-group"><label class="prop-label">' + label + '</label><select class="prop-select" id="prop-' + id + '">';
    for (var i = 0; i < options.length; i++) {
        html += '<option value="' + options[i].val + '"' + (options[i].val === active ? ' selected' : '') + '>' + options[i].label + '</option>';
    }
    html += '</select></div>';
    return html;
}

function propShadow(id, active) {
    var presets = [{ val: 'none', label: 'None' }, { val: 'subtle', label: 'Subtle' }, { val: 'medium', label: 'Medium' }, { val: 'strong', label: 'Strong' }];
    var html = '<div class="prop-group"><label class="prop-label">Shadow</label><div class="shadow-presets">';
    for (var i = 0; i < presets.length; i++) {
        html += '<button type="button" class="shadow-preset' + (presets[i].val === active ? ' active' : '') + '" data-prop-id="' + id + '" data-val="' + presets[i].val + '">' + presets[i].label + '</button>';
    }
    html += '</div></div>';
    return html;
}

// =============================================
// ATTACH PROP LISTENERS
// =============================================

function attachPropListeners(b) {
    var s = b.styles;

    function bindInput(propId, setter) {
        var el = document.getElementById('prop-' + propId);
        if (!el) return;
        el.addEventListener('input', function() {
            setter(el.value);
            renderCanvas();
        });
    }

    function bindRange(propId, styleProp, unit, isDecimal, isPercent) {
        var el = document.getElementById('prop-' + propId);
        var valEl = document.getElementById('prop-' + propId + '-val');
        if (!el) return;
        el.addEventListener('input', function() {
            var v = el.value;
            if (isDecimal) {
                s[styleProp] = (v / 10).toFixed(1);
                if (valEl) valEl.textContent = s[styleProp] + (unit || '');
            } else if (isPercent) {
                s[styleProp] = (v / 100).toFixed(2);
                if (valEl) valEl.textContent = v + (unit || '');
            } else {
                s[styleProp] = v;
                if (valEl) valEl.textContent = v + (unit || '');
            }
            renderCanvas();
        });
        el.addEventListener('change', function() { saveState(); });
    }

    function bindColor(propId, styleProp) {
        var picker = document.getElementById('prop-' + propId + '-picker');
        var hex = document.getElementById('prop-' + propId + '-hex');
        if (!picker || !hex) return;
        picker.addEventListener('input', function() {
            s[styleProp] = picker.value;
            hex.value = picker.value;
            renderCanvas();
        });
        hex.addEventListener('input', function() {
            if (/^#[0-9A-Fa-f]{6}$/.test(hex.value)) {
                s[styleProp] = hex.value;
                picker.value = hex.value;
                renderCanvas();
            }
        });
        picker.addEventListener('change', function() { saveState(); });
        hex.addEventListener('change', function() { saveState(); });
    }

    // Position controls
    var posXEl = document.getElementById('prop-pos-x');
    var posYEl = document.getElementById('prop-pos-y');
    var posWEl = document.getElementById('prop-pos-w');
    if (posXEl) {
        posXEl.addEventListener('input', function() {
            b.x = parseInt(posXEl.value);
            var valEl = document.getElementById('prop-pos-x-val');
            if (valEl) valEl.textContent = b.x + 'px';
            renderCanvas();
        });
        posXEl.addEventListener('change', function() { saveState(); });
    }
    if (posYEl) {
        posYEl.addEventListener('input', function() {
            b.y = parseInt(posYEl.value);
            var valEl = document.getElementById('prop-pos-y-val');
            if (valEl) valEl.textContent = b.y + 'px';
            renderCanvas();
        });
        posYEl.addEventListener('change', function() { saveState(); });
    }
    if (posWEl) {
        posWEl.addEventListener('input', function() {
            b.w = parseInt(posWEl.value);
            var valEl = document.getElementById('prop-pos-w-val');
            if (valEl) valEl.textContent = b.w + 'px';
            renderCanvas();
        });
        posWEl.addEventListener('change', function() { saveState(); });
    }

    // Toggle button rows
    var toggleBtns = propsPanel.querySelectorAll('.prop-toggle-btn');
    for (var i = 0; i < toggleBtns.length; i++) {
        toggleBtns[i].addEventListener('click', function(e) {
            var propId = e.currentTarget.getAttribute('data-prop-id');
            var val = e.currentTarget.getAttribute('data-val');
            var group = e.currentTarget.parentNode.querySelectorAll('.prop-toggle-btn');
            for (var j = 0; j < group.length; j++) group[j].classList.remove('active');
            e.currentTarget.classList.add('active');

            var parts = propId.split('-');
            var styleName = parts[parts.length - 1];

            // Handle list type specially
            if (propId === 'lst-listType') {
                b.listType = val;
            } else {
                s[styleName] = val;
            }
            saveState();
            renderCanvas();
        });
    }

    // Shadow presets
    var shadowBtns = propsPanel.querySelectorAll('.shadow-preset');
    for (var i = 0; i < shadowBtns.length; i++) {
        shadowBtns[i].addEventListener('click', function(e) {
            var val = e.currentTarget.getAttribute('data-val');
            s.shadow = val;
            var group = e.currentTarget.parentNode.querySelectorAll('.shadow-preset');
            for (var j = 0; j < group.length; j++) group[j].classList.remove('active');
            e.currentTarget.classList.add('active');
            saveState();
            renderCanvas();
        });
    }

    // Effects toggles
    var fxBtns = propsPanel.querySelectorAll('.fx-toggle-btn');
    for (var i = 0; i < fxBtns.length; i++) {
        fxBtns[i].addEventListener('click', function(e) {
            var fxKey = e.currentTarget.getAttribute('data-fx');
            if (!b.effects) b.effects = defaultEffects();
            b.effects[fxKey] = !b.effects[fxKey];
            saveState();
            renderCanvas();
            renderProps();
        });
    }

    // Effects color controls
    function bindFxColor(propId, fxProp) {
        var picker = document.getElementById('prop-' + propId + '-picker');
        var hex = document.getElementById('prop-' + propId + '-hex');
        if (!picker || !hex) return;
        picker.addEventListener('input', function() {
            b.effects[fxProp] = picker.value;
            hex.value = picker.value;
            renderCanvas();
        });
        hex.addEventListener('input', function() {
            if (/^#[0-9A-Fa-f]{6}$/.test(hex.value)) {
                b.effects[fxProp] = hex.value;
                picker.value = hex.value;
                renderCanvas();
            }
        });
        picker.addEventListener('change', function() { saveState(); });
        hex.addEventListener('change', function() { saveState(); });
    }
    bindFxColor('fx-glowColor', 'glowColor');
    bindFxColor('fx-neonColor', 'neonColor');

    // Effects rotate angle
    var rotEl = document.getElementById('prop-fx-rotateAngle');
    if (rotEl) {
        rotEl.addEventListener('input', function() {
            b.effects.rotateAngle = rotEl.value;
            var valEl = document.getElementById('prop-fx-rotateAngle-val');
            if (valEl) valEl.textContent = rotEl.value + '°';
            renderCanvas();
        });
        rotEl.addEventListener('change', function() { saveState(); });
    }

    // TYPE SPECIFIC BINDINGS
    if (b.type === 'text') {
        bindInput('text-content', function(v) { b.content = v; });
        var tcEl = document.getElementById('prop-text-content');
        if (tcEl) tcEl.addEventListener('change', function() { saveState(); });
        bindRange('text-fontSize', 'fontSize', 'px');
        bindRange('text-lineHeight', 'lineHeight', '', true);
        bindRange('text-borderRadius', 'borderRadius', 'px');
        bindRange('text-paddingTop', 'paddingTop', 'px');
        bindRange('text-paddingBottom', 'paddingBottom', 'px');
        bindRange('text-paddingLeft', 'paddingLeft', 'px');
        bindRange('text-paddingRight', 'paddingRight', 'px');
        bindColor('text-color', 'color');
        bindColor('text-bgColor', 'bgColor');
    }

    if (b.type === 'image') {
        bindInput('img-src', function(v) { b.src = v; });
        bindInput('img-alt', function(v) { b.alt = v; });
        var imgSrcEl = document.getElementById('prop-img-src');
        if (imgSrcEl) imgSrcEl.addEventListener('change', function() { saveState(); });
        bindRange('img-width', 'width', '%');
        bindRange('img-borderRadius', 'borderRadius', 'px');
        bindRange('img-paddingTop', 'paddingTop', 'px');
        bindRange('img-paddingBottom', 'paddingBottom', 'px');

        var imgUploadBtn = document.getElementById('prop-img-upload');
        if (imgUploadBtn) {
            imgUploadBtn.addEventListener('click', function() {
                hiddenFileInput.onchange = function(e) {
                    var file = e.target.files[0];
                    if (file) {
                        var reader = new FileReader();
                        reader.onload = function(ev) {
                            b.src = ev.target.result;
                            var srcInput = document.getElementById('prop-img-src');
                            if (srcInput) srcInput.value = b.src.substring(0, 50) + '...';
                            saveState();
                            renderCanvas();
                        };
                        reader.readAsDataURL(file);
                    }
                    hiddenFileInput.value = '';
                };
                hiddenFileInput.click();
            });
        }
    }

    if (b.type === 'button') {
        bindInput('btn-text', function(v) { b.text = v; });
        bindInput('btn-link', function(v) { b.link = v; });
        var btnTextEl = document.getElementById('prop-btn-text');
        if (btnTextEl) btnTextEl.addEventListener('change', function() { saveState(); });
        var btnLinkEl = document.getElementById('prop-btn-link');
        if (btnLinkEl) btnLinkEl.addEventListener('change', function() { saveState(); });
        bindColor('btn-bgColor', 'bgColor');
        bindColor('btn-textColor', 'textColor');
        bindRange('btn-fontSize', 'fontSize', 'px');
        bindRange('btn-borderRadius', 'borderRadius', 'px');
        bindRange('btn-paddingTop', 'paddingTop', 'px');
        bindRange('btn-paddingBottom', 'paddingBottom', 'px');
        bindRange('btn-paddingLeft', 'paddingLeft', 'px');
        bindRange('btn-paddingRight', 'paddingRight', 'px');
    }

    if (b.type === 'divider') {
        bindColor('div-color', 'color');
        bindRange('div-thickness', 'thickness', 'px');
        bindRange('div-paddingTop', 'paddingTop', 'px');
        bindRange('div-paddingBottom', 'paddingBottom', 'px');
        var styleSelect = document.getElementById('prop-div-style');
        if (styleSelect) {
            styleSelect.addEventListener('change', function() { s.style = styleSelect.value; saveState(); renderCanvas(); });
        }
    }

    if (b.type === 'spacer') {
        bindRange('spc-height', 'height', 'px');
    }

    if (b.type === 'hero') {
        bindInput('hero-headline', function(v) { b.headline = v; });
        bindInput('hero-subtext', function(v) { b.subtext = v; });
        bindInput('hero-btnText', function(v) { b.btnText = v; });
        bindInput('hero-btnLink', function(v) { b.btnLink = v; });

        var headlineEl = document.getElementById('prop-hero-headline');
        if (headlineEl) headlineEl.addEventListener('change', function() { saveState(); });
        var subtextEl = document.getElementById('prop-hero-subtext');
        if (subtextEl) subtextEl.addEventListener('change', function() { saveState(); });

        bindColor('hero-bgColor', 'bgColor');
        bindColor('hero-textColor', 'textColor');
        bindColor('hero-btnBg', 'btnBg');
        bindColor('hero-btnColor', 'btnColor');
        bindRange('hero-overlayOpacity', 'overlayOpacity', '%', false, true);
        bindRange('hero-paddingTop', 'paddingTop', 'px');
        bindRange('hero-paddingBottom', 'paddingBottom', 'px');

        var heroBgUpload = document.getElementById('prop-hero-bg-upload');
        if (heroBgUpload) {
            heroBgUpload.addEventListener('click', function() {
                hiddenFileInput.onchange = function(e) {
                    var file = e.target.files[0];
                    if (file) {
                        var reader = new FileReader();
                        reader.onload = function(ev) {
                            s.bgImage = ev.target.result;
                            saveState();
                            renderCanvas();
                            renderProps();
                        };
                        reader.readAsDataURL(file);
                    }
                    hiddenFileInput.value = '';
                };
                hiddenFileInput.click();
            });
        }
    }

    if (b.type === 'columns') {
        bindInput('col-leftContent', function(v) { b.leftContent = v; });
        bindInput('col-rightContent', function(v) { b.rightContent = v; });
        var leftEl = document.getElementById('prop-col-leftContent');
        if (leftEl) leftEl.addEventListener('change', function() { saveState(); });
        var rightEl = document.getElementById('prop-col-rightContent');
        if (rightEl) rightEl.addEventListener('change', function() { saveState(); });
        bindColor('col-color', 'color');
        bindColor('col-bgColor', 'bgColor');
        bindColor('col-leftBgColor', 'leftBgColor');
        bindColor('col-rightBgColor', 'rightBgColor');
        bindRange('col-gap', 'gap', 'px');
    }

    if (b.type === 'social') {
        bindInput('soc-twitter', function(v) { b.links.twitter = v; });
        bindInput('soc-linkedin', function(v) { b.links.linkedin = v; });
        bindInput('soc-instagram', function(v) { b.links.instagram = v; });
        bindInput('soc-facebook', function(v) { b.links.facebook = v; });
        bindColor('soc-bgColor', 'bgColor');
        bindColor('soc-iconColor', 'iconColor');
    }

    // NEW BLOCK TYPE BINDINGS

    if (b.type === 'threeCol') {
        bindInput('tc-col1', function(v) { b.col1 = v; });
        bindInput('tc-col2', function(v) { b.col2 = v; });
        bindInput('tc-col3', function(v) { b.col3 = v; });
        bindColor('tc-color', 'color');
        bindColor('tc-bgColor', 'bgColor');
        bindRange('tc-gap', 'gap', 'px');
    }

    if (b.type === 'video') {
        bindInput('vid-url', function(v) { b.videoUrl = v; });
        bindInput('vid-thumb', function(v) { b.thumbnailUrl = v; });
        bindRange('vid-borderRadius', 'borderRadius', 'px');
        bindRange('vid-paddingTop', 'paddingTop', 'px');
        bindRange('vid-paddingBottom', 'paddingBottom', 'px');
    }

    if (b.type === 'quote') {
        bindInput('qt-text', function(v) { b.quoteText = v; });
        bindInput('qt-author', function(v) { b.author = v; });
        bindColor('qt-borderColor', 'borderColor');
        bindColor('qt-color', 'color');
        bindColor('qt-bgColor', 'bgColor');
        bindRange('qt-fontSize', 'fontSize', 'px');
        bindRange('qt-borderWidth', 'borderWidth', 'px');
    }

    if (b.type === 'list') {
        var lstEl = document.getElementById('prop-lst-items');
        if (lstEl) {
            lstEl.addEventListener('input', function() {
                b.items = lstEl.value.split('\n').filter(function(line) { return line.trim() !== ''; });
                renderCanvas();
            });
            lstEl.addEventListener('change', function() { saveState(); });
        }
        bindColor('lst-color', 'color');
        bindRange('lst-fontSize', 'fontSize', 'px');
    }

    if (b.type === 'countdown') {
        bindInput('cd-label', function(v) { b.label = v; });
        bindInput('cd-days', function(v) { b.days = v; });
        bindInput('cd-hours', function(v) { b.hours = v; });
        bindInput('cd-minutes', function(v) { b.minutes = v; });
        bindInput('cd-seconds', function(v) { b.seconds = v; });
        bindColor('cd-bgColor', 'bgColor');
        bindColor('cd-textColor', 'textColor');
        bindColor('cd-accentColor', 'accentColor');
        bindRange('cd-fontSize', 'fontSize', 'px');
    }

    if (b.type === 'footer') {
        bindInput('ft-companyName', function(v) { b.companyName = v; });
        bindInput('ft-address', function(v) { b.address = v; });
        bindInput('ft-unsubText', function(v) { b.unsubText = v; });
        bindInput('ft-unsubLink', function(v) { b.unsubLink = v; });
        bindColor('ft-bgColor', 'bgColor');
        bindColor('ft-color', 'color');
        bindRange('ft-fontSize', 'fontSize', 'px');
    }

    if (b.type === 'logoHeader') {
        bindInput('lh-logoText', function(v) { b.logoText = v; });
        var navInput = document.getElementById('prop-lh-navLinks');
        if (navInput) {
            navInput.addEventListener('input', function() {
                var parts = navInput.value.split(',');
                b.navLinks = [];
                for (var p = 0; p < parts.length; p++) {
                    var pair = parts[p].trim().split('|');
                    if (pair.length === 2) {
                        b.navLinks.push({ text: pair[0].trim(), url: pair[1].trim() });
                    } else if (pair[0].trim()) {
                        b.navLinks.push({ text: pair[0].trim(), url: '#' });
                    }
                }
                renderCanvas();
            });
            navInput.addEventListener('change', function() { saveState(); });
        }
        bindColor('lh-bgColor', 'bgColor');
        bindColor('lh-textColor', 'textColor');
        bindColor('lh-linkColor', 'linkColor');
        bindRange('lh-logoFontSize', 'logoFontSize', 'px');
        bindRange('lh-fontSize', 'fontSize', 'px');
    }
}

// =============================================
// BLOCK HELPERS
// =============================================

function findBlock(id) {
    for (var i = 0; i < blocks.length; i++) {
        if (blocks[i].id === id) return blocks[i];
    }
    return null;
}

function findBlockIndex(id) {
    for (var i = 0; i < blocks.length; i++) {
        if (blocks[i].id === id) return i;
    }
    return -1;
}

function duplicateBlock(id) {
    var idx = findBlockIndex(id);
    if (idx < 0) return;
    var dup = clone(blocks[idx]);
    dup.id = uid();
    dup.x += 20;
    dup.y += 20;
    blocks.splice(idx + 1, 0, dup);
    selectedBlockId = dup.id;
    saveState();
    renderCanvas();
    renderProps();
}

function deleteBlock(id) {
    var idx = findBlockIndex(id);
    if (idx < 0) return;
    blocks.splice(idx, 1);
    if (selectedBlockId === id) selectedBlockId = null;
    saveState();
    renderCanvas();
    renderProps();
}

// =============================================
// EVENT: CANVAS CLICKS & BLOCK ACTIONS
// =============================================

canvas.addEventListener('click', function(e) {
    var actionBtn = e.target.closest('.block-action-btn');
    if (actionBtn) {
        var action = actionBtn.getAttribute('data-action');
        var id = actionBtn.getAttribute('data-id');
        if (action === 'dup') duplicateBlock(id);
        else if (action === 'delete') deleteBlock(id);
        return;
    }

    // Don't select on resize handle
    if (e.target.closest('.block-resize-handle')) return;

    var wrapper = e.target.closest('.block-wrapper');
    if (wrapper) {
        selectedBlockId = wrapper.getAttribute('data-id');
        renderCanvas();
        renderProps();
        return;
    }

    selectedBlockId = null;
    renderCanvas();
    renderProps();
});

// =============================================
// FREE-FORM DRAG POSITIONING
// =============================================

canvas.addEventListener('mousedown', function(e) {
    // Handle resize
    var resizeHandle = e.target.closest('.block-resize-handle');
    if (resizeHandle) {
        var rid = resizeHandle.getAttribute('data-id');
        resizeBlock = findBlock(rid);
        if (resizeBlock) {
            isResizing = true;
            resizeStartX = e.clientX;
            resizeStartW = resizeBlock.w;
            e.preventDefault();
        }
        return;
    }

    // Handle drag
    if (e.target.closest('.block-action-btn')) return;

    var wrapper = e.target.closest('.block-wrapper');
    if (!wrapper) return;

    var blockId = wrapper.getAttribute('data-id');
    var block = findBlock(blockId);
    if (!block) return;

    selectedBlockId = blockId;
    isDragging = true;
    dragBlock = block;

    var canvasRect = canvas.getBoundingClientRect();
    dragOffsetX = e.clientX - canvasRect.left - block.x;
    dragOffsetY = e.clientY - canvasRect.top - block.y;

    wrapper.classList.add('dragging');
    e.preventDefault();

    renderCanvas();
    renderProps();
});

document.addEventListener('mousemove', function(e) {
    if (isResizing && resizeBlock) {
        var dx = e.clientX - resizeStartX;
        resizeBlock.w = Math.max(60, Math.min(contentWidth, resizeStartW + dx));
        renderCanvas();
        return;
    }

    if (!isDragging || !dragBlock) return;

    var canvasRect = canvas.getBoundingClientRect();
    var newX = e.clientX - canvasRect.left - dragOffsetX;
    var newY = e.clientY - canvasRect.top - dragOffsetY;

    // Clamp to canvas bounds
    newX = Math.max(0, newX);
    newY = Math.max(0, newY);

    // Snap
    dragBlock.x = snapVal(newX);
    dragBlock.y = snapVal(newY);

    renderCanvas();
});

document.addEventListener('mouseup', function(e) {
    if (isResizing) {
        isResizing = false;
        resizeBlock = null;
        saveState();
        renderProps();
        return;
    }

    if (isDragging && dragBlock) {
        isDragging = false;
        dragBlock = null;
        saveState();
        renderProps();
    }
});

// =============================================
// EVENT: ADD BLOCKS FROM LEFT PANEL
// =============================================

var blockItems = document.querySelectorAll('.block-item');
for (var i = 0; i < blockItems.length; i++) {
    blockItems[i].addEventListener('click', function(e) {
        var type = e.currentTarget.getAttribute('data-type');
        // Position new blocks centered and staggered
        var b = createBlock(type);
        b.x = 20;
        b.y = getNextAvailableY();
        b.w = contentWidth - 40;
        blocks.push(b);
        selectedBlockId = b.id;
        saveState();
        renderCanvas();
        renderProps();
    });
}

function getNextAvailableY() {
    if (blocks.length === 0) return 20;
    var maxY = 0;
    for (var i = 0; i < blocks.length; i++) {
        var wrapper = document.querySelector('.block-wrapper[data-id="' + blocks[i].id + '"]');
        var h = wrapper ? wrapper.offsetHeight : 100;
        var bottom = blocks[i].y + h;
        if (bottom > maxY) maxY = bottom;
    }
    return maxY + 15;
}

// =============================================
// SNAP TOGGLE
// =============================================

snapToggle.addEventListener('click', function() {
    snapEnabled = !snapEnabled;
    snapToggle.classList.toggle('active', snapEnabled);
    canvas.classList.toggle('show-grid', snapEnabled);
});

// =============================================
// DEVICE TOGGLE
// =============================================

var deviceBtns = document.querySelectorAll('.device-toggle button');
for (var i = 0; i < deviceBtns.length; i++) {
    deviceBtns[i].addEventListener('click', function(e) {
        for (var j = 0; j < deviceBtns.length; j++) deviceBtns[j].classList.remove('active');
        e.currentTarget.classList.add('active');
        var view = e.currentTarget.getAttribute('data-view');
        if (view === 'mobile') {
            canvas.classList.add('mobile-view');
        } else {
            canvas.classList.remove('mobile-view');
        }
    });
}

// =============================================
// CANVAS SETTINGS
// =============================================

canvasBgInput.addEventListener('input', function() {
    canvasBg = canvasBgInput.value;
    canvasBgLabel.textContent = canvasBg;
    canvas.style.backgroundColor = canvasBg;
});

contentWidthSelect.addEventListener('change', function() {
    contentWidth = parseInt(contentWidthSelect.value);
    canvas.style.maxWidth = contentWidth + 'px';
});

// =============================================
// UNDO / REDO BUTTONS
// =============================================

undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);

document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    if (e.key === 'Delete' && selectedBlockId && document.activeElement === document.body) { deleteBlock(selectedBlockId); }
});

// =============================================
// GMAIL-COMPATIBLE HTML GENERATOR
// =============================================

function generateEmailHTML() {
    var out = [];
    out.push('<!DOCTYPE html>');
    out.push('<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">');
    out.push('<title>' + escapeHtml(emailTitle.value || 'Email') + '</title>');
    out.push('</head><body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:' + canvasBg + ';">');
    out.push('<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:' + canvasBg + ';">');
    out.push('<tr><td align="center" style="padding:20px 0;">');
    out.push('<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="' + contentWidth + '" style="max-width:' + contentWidth + 'px;width:100%;background-color:#ffffff;">');

    // Sort blocks by Y position for linear email output
    var sorted = clone(blocks).sort(function(a, b) { return a.y - b.y; });

    for (var i = 0; i < sorted.length; i++) {
        out.push(generateBlockEmailHTML(sorted[i]));
    }

    out.push('</table>');
    out.push('</td></tr></table>');
    out.push('</body></html>');
    return out.join('\n');
}

function generateBlockEmailHTML(b) {
    var s = b.styles;
    var rows = [];

    if (b.type === 'text') {
        rows.push('<tr><td style="'
            + 'font-family:Arial,Helvetica,sans-serif;'
            + 'font-size:' + s.fontSize + 'px;'
            + 'font-weight:' + s.fontWeight + ';'
            + 'font-style:' + s.fontStyle + ';'
            + 'color:' + s.color + ';'
            + 'text-align:' + s.textAlign + ';'
            + 'line-height:' + s.lineHeight + ';'
            + 'padding:' + s.paddingTop + 'px ' + s.paddingRight + 'px ' + s.paddingBottom + 'px ' + s.paddingLeft + 'px;'
            + (s.bgColor ? 'background-color:' + s.bgColor + ';' : '')
            + (s.borderRadius !== '0' ? 'border-radius:' + s.borderRadius + 'px;' : '')
            + '">' + b.content + '</td></tr>');
    }

    if (b.type === 'image') {
        if (b.src) {
            rows.push('<tr><td style="text-align:' + s.textAlign + ';padding:' + s.paddingTop + 'px 0 ' + s.paddingBottom + 'px 0;">'
                + '<img src="' + b.src + '" alt="' + escapeHtml(b.alt) + '" width="' + Math.round(contentWidth * parseInt(s.width) / 100) + '" style="display:inline-block;max-width:' + s.width + '%;height:auto;' + (s.borderRadius !== '0' ? 'border-radius:' + s.borderRadius + 'px;' : '') + '">'
                + '</td></tr>');
        }
    }

    if (b.type === 'button') {
        var btnPad = s.paddingTop + 'px ' + s.paddingRight + 'px ' + s.paddingBottom + 'px ' + s.paddingLeft + 'px';
        rows.push('<tr><td style="text-align:' + s.textAlign + ';padding:' + s.containerPaddingTop + 'px 24px ' + s.containerPaddingBottom + 'px 24px;">'
            + '<a href="' + escapeHtml(b.link) + '" style="display:inline-block;padding:' + btnPad + ';background-color:' + s.bgColor + ';color:' + s.textColor + ';text-decoration:none;border-radius:' + s.borderRadius + 'px;font-size:' + s.fontSize + 'px;font-weight:' + s.fontWeight + ';font-family:Arial,Helvetica,sans-serif;' + (s.fullWidth ? 'display:block;text-align:center;' : '') + '">' + escapeHtml(b.text) + '</a>'
            + '</td></tr>');
    }

    if (b.type === 'divider') {
        rows.push('<tr><td style="padding:' + s.paddingTop + 'px ' + s.paddingRight + 'px ' + s.paddingBottom + 'px ' + s.paddingLeft + 'px;">'
            + '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:' + s.thickness + 'px ' + s.style + ' ' + s.color + ';font-size:0;line-height:0;">&nbsp;</td></tr></table>'
            + '</td></tr>');
    }

    if (b.type === 'spacer') {
        rows.push('<tr><td style="height:' + s.height + 'px;font-size:0;line-height:0;">&nbsp;</td></tr>');
    }

    if (b.type === 'hero') {
        var bgImg = s.bgImage ? 'background-image:url(' + s.bgImage + ');background-size:cover;background-position:center;' : '';
        rows.push('<tr><td style="background-color:' + s.bgColor + ';' + bgImg + 'padding:' + s.paddingTop + 'px 30px ' + s.paddingBottom + 'px 30px;text-align:' + s.textAlign + ';">'
            + '<h1 style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:32px;color:' + s.textColor + ';">' + escapeHtml(b.headline) + '</h1>'
            + '<p style="margin:0 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:' + s.textColor + ';opacity:0.9;">' + escapeHtml(b.subtext) + '</p>'
            + '<a href="' + escapeHtml(b.btnLink) + '" style="display:inline-block;padding:14px 32px;background-color:' + s.btnBg + ';color:' + s.btnColor + ';text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;font-family:Arial,Helvetica,sans-serif;">' + escapeHtml(b.btnText) + '</a>'
            + '</td></tr>');
    }

    if (b.type === 'columns') {
        rows.push('<tr><td style="padding:' + s.paddingTop + 'px ' + s.paddingRight + 'px ' + s.paddingBottom + 'px ' + s.paddingLeft + 'px;' + (s.bgColor ? 'background-color:' + s.bgColor + ';' : '') + '">'
            + '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>'
            + '<td width="50%" valign="top" style="padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:' + s.color + ';' + (s.leftBgColor ? 'background-color:' + s.leftBgColor + ';' : '') + '">' + b.leftContent + '</td>'
            + '<td width="' + s.gap + '" style="font-size:0;">&nbsp;</td>'
            + '<td width="50%" valign="top" style="padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:' + s.color + ';' + (s.rightBgColor ? 'background-color:' + s.rightBgColor + ';' : '') + '">' + b.rightContent + '</td>'
            + '</tr></table>'
            + '</td></tr>');
    }

    if (b.type === 'social') {
        var linkStyle = 'display:inline-block;margin:0 8px;color:' + s.iconColor + ';text-decoration:none;font-weight:600;font-size:14px;font-family:Arial,Helvetica,sans-serif;';
        rows.push('<tr><td style="text-align:' + s.textAlign + ';background-color:' + s.bgColor + ';padding:' + s.paddingTop + 'px 24px ' + s.paddingBottom + 'px 24px;">'
            + (b.links.twitter ? '<a href="' + b.links.twitter + '" style="' + linkStyle + '">Twitter</a> ' : '')
            + (b.links.linkedin ? '<a href="' + b.links.linkedin + '" style="' + linkStyle + '">LinkedIn</a> ' : '')
            + (b.links.instagram ? '<a href="' + b.links.instagram + '" style="' + linkStyle + '">Instagram</a> ' : '')
            + (b.links.facebook ? '<a href="' + b.links.facebook + '" style="' + linkStyle + '">Facebook</a>' : '')
            + '</td></tr>');
    }

    // NEW BLOCK EMAIL HTML

    if (b.type === 'threeCol') {
        rows.push('<tr><td style="padding:' + s.paddingTop + 'px ' + s.paddingRight + 'px ' + s.paddingBottom + 'px ' + s.paddingLeft + 'px;' + (s.bgColor ? 'background-color:' + s.bgColor + ';' : '') + '">'
            + '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>'
            + '<td width="33%" valign="top" style="padding:12px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:' + s.color + ';' + (s.col1Bg ? 'background-color:' + s.col1Bg + ';' : '') + '">' + b.col1 + '</td>'
            + '<td width="33%" valign="top" style="padding:12px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:' + s.color + ';' + (s.col2Bg ? 'background-color:' + s.col2Bg + ';' : '') + '">' + b.col2 + '</td>'
            + '<td width="33%" valign="top" style="padding:12px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:' + s.color + ';' + (s.col3Bg ? 'background-color:' + s.col3Bg + ';' : '') + '">' + b.col3 + '</td>'
            + '</tr></table>'
            + '</td></tr>');
    }

    if (b.type === 'video') {
        rows.push('<tr><td style="text-align:' + s.textAlign + ';padding:' + s.paddingTop + 'px ' + s.paddingRight + 'px ' + s.paddingBottom + 'px ' + s.paddingLeft + 'px;">'
            + '<a href="' + escapeHtml(b.videoUrl) + '" style="display:inline-block;text-decoration:none;">'
            + '<img src="' + (b.thumbnailUrl || 'https://via.placeholder.com/560x315/1e293b/ffffff?text=▶+Play+Video') + '" width="' + (contentWidth - 48) + '" style="max-width:100%;height:auto;border-radius:' + s.borderRadius + 'px;" alt="Video">'
            + '</a></td></tr>');
    }

    if (b.type === 'quote') {
        rows.push('<tr><td style="padding:' + s.paddingTop + 'px ' + s.paddingRight + 'px ' + s.paddingBottom + 'px ' + s.paddingLeft + 'px;background-color:' + (s.bgColor || '#f8fafc') + ';border-left:' + s.borderWidth + 'px solid ' + s.borderColor + ';">'
            + '<p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:' + s.fontSize + 'px;color:' + s.color + ';font-style:' + s.fontStyle + ';line-height:1.6;">' + escapeHtml(b.quoteText) + '</p>'
            + '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:' + s.authorColor + ';font-weight:600;">' + escapeHtml(b.author) + '</p>'
            + '</td></tr>');
    }

    if (b.type === 'list') {
        var listTag = b.listType === 'numbered' ? 'ol' : 'ul';
        var listItems = '';
        for (var li = 0; li < b.items.length; li++) {
            listItems += '<li style="margin-bottom:6px;">' + escapeHtml(b.items[li]) + '</li>';
        }
        rows.push('<tr><td style="padding:' + s.paddingTop + 'px ' + s.paddingRight + 'px ' + s.paddingBottom + 'px ' + s.paddingLeft + 'px;' + (s.bgColor ? 'background-color:' + s.bgColor + ';' : '') + '">'
            + '<' + listTag + ' style="margin:0;padding-left:20px;font-family:Arial,Helvetica,sans-serif;color:' + s.color + ';font-size:' + s.fontSize + 'px;line-height:' + s.lineHeight + ';">'
            + listItems
            + '</' + listTag + '></td></tr>');
    }

    if (b.type === 'countdown') {
        var boxStyle = 'display:inline-block;padding:12px 18px;background-color:' + s.accentColor + ';border-radius:10px;margin:0 4px;text-align:center;min-width:60px;';
        var numStyle = 'display:block;font-family:Arial,Helvetica,sans-serif;font-size:' + s.fontSize + 'px;font-weight:800;color:' + s.textColor + ';line-height:1.2;';
        var lblStyle = 'display:block;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:' + s.textColor + ';text-transform:uppercase;letter-spacing:1px;margin-top:4px;';
        rows.push('<tr><td style="background-color:' + s.bgColor + ';padding:' + s.paddingTop + 'px 20px ' + s.paddingBottom + 'px 20px;text-align:' + s.textAlign + ';">'
            + '<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:' + s.textColor + ';">' + escapeHtml(b.label) + '</p>'
            + '<div style="font-size:0;">'
            + '<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="4" border="0" align="center"><tr><td style="' + boxStyle + '"><![endif]-->'
            + '<div style="' + boxStyle + '"><span style="' + numStyle + '">' + escapeHtml(b.days) + '</span><span style="' + lblStyle + '">Days</span></div>'
            + '<div style="' + boxStyle + '"><span style="' + numStyle + '">' + escapeHtml(b.hours) + '</span><span style="' + lblStyle + '">Hrs</span></div>'
            + '<div style="' + boxStyle + '"><span style="' + numStyle + '">' + escapeHtml(b.minutes) + '</span><span style="' + lblStyle + '">Min</span></div>'
            + '<div style="' + boxStyle + '"><span style="' + numStyle + '">' + escapeHtml(b.seconds) + '</span><span style="' + lblStyle + '">Sec</span></div>'
            + '<!--[if mso]></td></tr></table><![endif]-->'
            + '</div></td></tr>');
    }

    if (b.type === 'footer') {
        rows.push('<tr><td style="background-color:' + s.bgColor + ';padding:' + s.paddingTop + 'px 24px ' + s.paddingBottom + 'px 24px;text-align:' + s.textAlign + ';font-family:Arial,Helvetica,sans-serif;font-size:' + s.fontSize + 'px;color:' + s.color + ';">'
            + '<p style="margin:0 0 6px;font-weight:600;">' + escapeHtml(b.companyName) + '</p>'
            + '<p style="margin:0 0 10px;">' + escapeHtml(b.address) + '</p>'
            + '<a href="' + escapeHtml(b.unsubLink) + '" style="color:' + s.color + ';font-size:11px;text-decoration:underline;">' + escapeHtml(b.unsubText) + '</a>'
            + '</td></tr>');
    }

    if (b.type === 'logoHeader') {
        var navHtml = '';
        if (b.navLinks) {
            for (var n = 0; n < b.navLinks.length; n++) {
                navHtml += '<a href="' + escapeHtml(b.navLinks[n].url) + '" style="color:' + s.linkColor + ';text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:' + s.fontSize + 'px;font-weight:500;margin:0 8px;">' + escapeHtml(b.navLinks[n].text) + '</a>';
            }
        }
        rows.push('<tr><td style="background-color:' + s.bgColor + ';padding:' + s.paddingTop + 'px ' + s.paddingRight + 'px ' + s.paddingBottom + 'px ' + s.paddingLeft + 'px;">'
            + '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>'
            + '<td style="font-family:Arial,Helvetica,sans-serif;font-size:' + s.logoFontSize + 'px;font-weight:800;color:' + s.textColor + ';letter-spacing:2px;">' + escapeHtml(b.logoText) + '</td>'
            + '<td align="right">' + navHtml + '</td>'
            + '</tr></table>'
            + '</td></tr>');
    }

    return rows.join('');
}

// =============================================
// COPY & DOWNLOAD
// =============================================

copyBtn.addEventListener('click', function() {
    var html = generateEmailHTML();
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(html).then(function() {
            showToast('✓ Gmail-ready HTML copied!');
        }).catch(function() { fallbackCopy(html); });
    } else {
        fallbackCopy(html);
    }
});

function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast('✓ Gmail-ready HTML copied!'); }
    catch (e) { showToast('Copy failed'); }
    document.body.removeChild(ta);
}

downloadBtn.addEventListener('click', function() {
    var html = generateEmailHTML();
    var blob = new Blob([html], { type: 'text/html' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = (emailTitle.value || 'email').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✓ Email downloaded!');
});

// =============================================
// 15 TEMPLATE PRESETS
// =============================================

function loadTemplate(name) {
    blocks = [];
    selectedBlockId = null;
    nextBlockY = 20;

    if (name === 'welcome') {
        addTplBlock('hero', { headline: 'Welcome to Our Brand', subtext: 'We are thrilled to have you here. Get ready for an amazing experience.', btnText: 'Get Started', styles: { bgColor: '#6366f1' } });
        addTplBlock('text', { content: 'Hi there! Thank you for joining us. We have curated an incredible experience just for you. Explore our features, connect with the community, and start creating something amazing today.', styles: { fontSize: '16', textAlign: 'center', paddingTop: '30', paddingBottom: '10' } });
        addTplBlock('button', { text: 'Explore Features', styles: { bgColor: '#6366f1' } });
        addTplBlock('divider', {});
        addTplBlock('text', { content: '© 2026 Your Brand. All rights reserved.', styles: { fontSize: '12', color: '#94a3b8', textAlign: 'center' } });
    }

    if (name === 'promo') {
        addTplBlock('hero', { headline: 'MEGA SALE — 50% OFF', subtext: 'Exclusive offer ends in 48 hours. Do not miss out!', btnText: 'Shop Now', styles: { bgColor: '#dc2626', btnBg: '#ffffff', btnColor: '#dc2626' } });
        addTplBlock('text', { content: 'Our biggest sale of the year is here! Browse hundreds of deals across all categories.', styles: { textAlign: 'center', paddingTop: '30' } });
        addTplBlock('columns', { leftContent: '<strong style="font-size:18px;">Premium Headphones</strong><br>Was $299 — Now <span style="color:#dc2626;font-weight:bold;">$149</span>', rightContent: '<strong style="font-size:18px;">Smart Watch Pro</strong><br>Was $399 — Now <span style="color:#dc2626;font-weight:bold;">$199</span>', styles: { leftBgColor: '#fef2f2', rightBgColor: '#fef2f2' } });
        addTplBlock('button', { text: 'View All Deals', styles: { bgColor: '#dc2626' } });
        addTplBlock('social', {});
    }

    if (name === 'newsletter') {
        addTplBlock('text', { content: '<strong style="font-size:22px;letter-spacing:2px;">ACME WEEKLY</strong>', styles: { textAlign: 'center', paddingTop: '30', paddingBottom: '10' } });
        addTplBlock('divider', { styles: { color: '#6366f1', thickness: '3' } });
        addTplBlock('text', { content: 'Here is your weekly roundup of the latest news, tips, and community highlights.', styles: { textAlign: 'center', color: '#64748b', paddingBottom: '10' } });
        addTplBlock('image', { src: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80', alt: 'Tech News', styles: { borderRadius: '8', paddingTop: '8', paddingBottom: '8' } });
        addTplBlock('text', { content: '<strong style="font-size:18px;">Latest Industry Trends</strong><br><br>Discover the new tools and technologies shaping the future of our industry.' });
        addTplBlock('divider', {});
        addTplBlock('text', { content: '<strong style="font-size:18px;">Tips & Tricks for Success</strong><br><br>Learn how to get the most out of your experience with our new guide.' });
        addTplBlock('button', { text: 'Read More on Our Blog', styles: { bgColor: '#6366f1' } });
        addTplBlock('social', {});
    }

    if (name === 'onboarding') {
        addTplBlock('logoHeader', { logoText: 'STARTUP', navLinks: [{ text: 'Dashboard', url: '#' }, { text: 'Help', url: '#' }] });
        addTplBlock('hero', { headline: 'Let\'s Get You Started!', subtext: 'Follow these 3 simple steps to set up your account.', btnText: 'Go to Dashboard', styles: { bgColor: '#10b981', btnBg: '#ffffff', btnColor: '#10b981' } });
        addTplBlock('threeCol', { col1: '<strong>Step 1</strong><br>Complete your profile with your info and photo.', col2: '<strong>Step 2</strong><br>Connect your tools and import your data.', col3: '<strong>Step 3</strong><br>Invite your team and start collaborating.', styles: { col1Bg: '#d1fae5', col2Bg: '#d1fae5', col3Bg: '#d1fae5' } });
        addTplBlock('text', { content: 'Need help? Our support team is available 24/7 — just reply to this email!', styles: { textAlign: 'center', color: '#64748b', paddingTop: '20' } });
        addTplBlock('footer', { companyName: 'Startup Inc.' });
    }

    if (name === 'product-launch') {
        addTplBlock('logoHeader', { logoText: 'TECHCO', styles: { bgColor: '#0f172a', textColor: '#ffffff', linkColor: '#818cf8' } });
        addTplBlock('hero', { headline: 'Introducing Product X', subtext: 'The revolutionary tool that changes everything. Available now.', btnText: 'Pre-Order Now', styles: { bgColor: '#7c3aed', btnBg: '#ffffff', btnColor: '#7c3aed', paddingTop: '70', paddingBottom: '70' } });
        addTplBlock('columns', { leftContent: '<strong style="font-size:18px;">⚡ Lightning Fast</strong><br>10x faster than anything on the market.', rightContent: '<strong style="font-size:18px;">🔒 Secure</strong><br>End-to-end encryption by default.', styles: { leftBgColor: '#ede9fe', rightBgColor: '#ede9fe' } });
        addTplBlock('quote', { quoteText: '"Product X is a game-changer. We\'ve never seen anything like it."', author: '— Jane Smith, CEO of BigCorp' });
        addTplBlock('button', { text: 'Learn More →', styles: { bgColor: '#7c3aed' } });
        addTplBlock('social', {});
    }

    if (name === 'event-invite') {
        addTplBlock('hero', { headline: '🎉 You\'re Invited!', subtext: 'Annual Tech Conference 2026', btnText: 'RSVP Now', styles: { bgColor: '#0ea5e9', btnBg: '#ffffff', btnColor: '#0ea5e9' } });
        addTplBlock('text', { content: '<strong style="font-size:18px;">📅 August 15-17, 2026</strong><br>📍 San Francisco Convention Center<br>⏰ 9:00 AM — 6:00 PM PST', styles: { textAlign: 'center', paddingTop: '24', paddingBottom: '16', bgColor: '#e0f2fe' } });
        addTplBlock('columns', { leftContent: '<strong>Day 1</strong><br>Keynotes & Networking<br>Industry Leaders Panel', rightContent: '<strong>Day 2-3</strong><br>Workshops & Labs<br>Hands-on Sessions' });
        addTplBlock('countdown', { label: 'Event starts in:', days: '30', hours: '08', minutes: '45', seconds: '00' });
        addTplBlock('button', { text: 'Reserve Your Spot', styles: { bgColor: '#0ea5e9' } });
        addTplBlock('footer', { companyName: 'TechConf Events' });
    }

    if (name === 'thank-you') {
        addTplBlock('hero', { headline: 'Thank You! 🎊', subtext: 'Your order has been placed successfully.', btnText: 'Track Order', styles: { bgColor: '#f59e0b', textColor: '#0f172a', btnBg: '#0f172a', btnColor: '#f59e0b' } });
        addTplBlock('text', { content: 'We\'re preparing your order right now. You\'ll receive a shipping confirmation email shortly with tracking details.', styles: { textAlign: 'center', paddingTop: '24' } });
        addTplBlock('divider', {});
        addTplBlock('text', { content: '<strong>Order Summary</strong><br>Order #12345 — 2 items<br>Total: $199.00', styles: { bgColor: '#fef3c7', paddingTop: '20', paddingBottom: '20' } });
        addTplBlock('text', { content: 'Questions? Reply to this email or visit our help center.', styles: { textAlign: 'center', color: '#64748b', fontSize: '13' } });
        addTplBlock('footer', {});
    }

    if (name === 'abandoned-cart') {
        addTplBlock('logoHeader', { logoText: 'SHOP' });
        addTplBlock('text', { content: '<strong style="font-size:24px;">Forget something? 🛒</strong>', styles: { textAlign: 'center', paddingTop: '30' } });
        addTplBlock('text', { content: 'You left some amazing items in your cart. Complete your purchase before they\'re gone!', styles: { textAlign: 'center', color: '#64748b' } });
        addTplBlock('columns', { leftContent: '<div style="text-align:center;padding:20px;background:#fef2f2;border-radius:8px;"><strong>Premium Headphones</strong><br><span style="font-size:22px;font-weight:800;color:#dc2626;">$149</span></div>', rightContent: '<div style="text-align:center;padding:20px;background:#fef2f2;border-radius:8px;"><strong>Wireless Charger</strong><br><span style="font-size:22px;font-weight:800;color:#dc2626;">$49</span></div>' });
        addTplBlock('button', { text: 'Complete Purchase →', styles: { bgColor: '#ef4444' } });
        addTplBlock('text', { content: 'Use code <strong>COMEBACK10</strong> for 10% off your order!', styles: { textAlign: 'center', color: '#dc2626' } });
        addTplBlock('footer', { companyName: 'SHOP Inc.' });
    }

    if (name === 'feedback') {
        addTplBlock('hero', { headline: 'How Did We Do? ⭐', subtext: 'We\'d love to hear your feedback on your recent experience.', btnText: 'Leave a Review', styles: { bgColor: '#8b5cf6', btnBg: '#ffffff', btnColor: '#8b5cf6' } });
        addTplBlock('text', { content: 'Your opinion matters to us! Take 2 minutes to share your thoughts and help us improve.', styles: { textAlign: 'center', paddingTop: '24' } });
        addTplBlock('threeCol', { col1: '<div style="text-align:center;font-size:30px;">😊</div><div style="text-align:center;font-size:12px;margin-top:8px;">Great</div>', col2: '<div style="text-align:center;font-size:30px;">😐</div><div style="text-align:center;font-size:12px;margin-top:8px;">Okay</div>', col3: '<div style="text-align:center;font-size:30px;">😞</div><div style="text-align:center;font-size:12px;margin-top:8px;">Poor</div>', styles: { col1Bg: '#ede9fe', col2Bg: '#ede9fe', col3Bg: '#ede9fe' } });
        addTplBlock('button', { text: 'Take Quick Survey', styles: { bgColor: '#8b5cf6' } });
        addTplBlock('footer', {});
    }

    if (name === 'holiday-sale') {
        addTplBlock('hero', { headline: '🎄 Holiday MEGA Sale!', subtext: 'Up to 70% off everything. Limited time only!', btnText: 'Shop the Sale', styles: { bgColor: '#dc2626', btnBg: '#fde047', btnColor: '#0f172a', paddingTop: '50', paddingBottom: '50' } });
        addTplBlock('countdown', { label: 'Sale ends in:', days: '03', hours: '18', minutes: '22', seconds: '00', styles: { bgColor: '#16a34a', accentColor: '#dc2626' } });
        addTplBlock('threeCol', { col1: '<div style="text-align:center;"><strong>🎁 Gifts</strong><br>From $9.99</div>', col2: '<div style="text-align:center;"><strong>🧥 Fashion</strong><br>50% Off</div>', col3: '<div style="text-align:center;"><strong>💻 Tech</strong><br>Up to 70% Off</div>', styles: { col1Bg: '#fef2f2', col2Bg: '#f0fdf4', col3Bg: '#fef2f2' } });
        addTplBlock('button', { text: 'Browse All Deals →', styles: { bgColor: '#16a34a' } });
        addTplBlock('social', { styles: { bgColor: '#dc2626' } });
    }

    if (name === 'password-reset') {
        addTplBlock('logoHeader', { logoText: 'SECURE', styles: { bgColor: '#0f172a', textColor: '#ffffff', linkColor: '#94a3b8' } });
        addTplBlock('spacer', { styles: { height: '20' } });
        addTplBlock('text', { content: '<strong style="font-size:20px;">Password Reset Request</strong>', styles: { textAlign: 'center' } });
        addTplBlock('text', { content: 'We received a request to reset your password. Click the button below to choose a new password. This link expires in 1 hour.', styles: { textAlign: 'center', color: '#475569' } });
        addTplBlock('button', { text: 'Reset Password', styles: { bgColor: '#0f172a' } });
        addTplBlock('divider', {});
        addTplBlock('text', { content: 'If you didn\'t request this, you can safely ignore this email. Your password will not be changed.', styles: { textAlign: 'center', color: '#94a3b8', fontSize: '13' } });
        addTplBlock('footer', { companyName: 'SecureApp', address: 'This is an automated security notification.' });
    }

    if (name === 'order-confirm') {
        addTplBlock('logoHeader', { logoText: 'STORE' });
        addTplBlock('text', { content: '<strong style="font-size:22px;">Order Confirmed ✓</strong>', styles: { textAlign: 'center', paddingTop: '24' } });
        addTplBlock('text', { content: 'Thank you for your order! Here\'s a summary:', styles: { textAlign: 'center', color: '#64748b' } });
        addTplBlock('divider', { styles: { color: '#6366f1', thickness: '2' } });
        addTplBlock('list', { items: ['Premium Wireless Earbuds — $89.00', 'USB-C Charging Cable — $12.00', 'Protective Case — $19.00', 'Shipping — FREE'], listType: 'bullet', styles: { bgColor: '#f8fafc' } });
        addTplBlock('divider', {});
        addTplBlock('text', { content: '<strong>Total: $120.00</strong><br>Estimated delivery: July 20-22, 2026', styles: { textAlign: 'center', fontSize: '16' } });
        addTplBlock('button', { text: 'Track Your Order', styles: { bgColor: '#6366f1' } });
        addTplBlock('footer', { companyName: 'STORE' });
    }

    if (name === 're-engagement') {
        addTplBlock('hero', { headline: 'We Miss You! 💔', subtext: 'It\'s been a while since we\'ve seen you. Come back and see what\'s new!', btnText: 'Come Back', styles: { bgColor: '#f43f5e', btnBg: '#ffffff', btnColor: '#f43f5e' } });
        addTplBlock('text', { content: 'Here\'s what you\'ve been missing:', styles: { textAlign: 'center', paddingTop: '20', fontSize: '16' } });
        addTplBlock('list', { items: ['New features that make your workflow 2x faster', 'Improved dashboard with better analytics', 'Community updates and exclusive resources', 'Special offer: 30% off your next month'], listType: 'bullet' });
        addTplBlock('button', { text: 'Reactivate My Account →', styles: { bgColor: '#f43f5e' } });
        addTplBlock('text', { content: 'Not interested anymore? <a href="#" style="color:#f43f5e;">Unsubscribe here</a>', styles: { textAlign: 'center', color: '#94a3b8', fontSize: '12' } });
    }

    if (name === 'referral') {
        addTplBlock('hero', { headline: 'Share the Love! 🎁', subtext: 'Give $20, Get $20 when you invite a friend.', btnText: 'Invite Friends', styles: { bgColor: '#0ea5e9', btnBg: '#ffffff', btnColor: '#0ea5e9' } });
        addTplBlock('text', { content: '<strong style="font-size:18px;">How it works:</strong>', styles: { textAlign: 'center', paddingTop: '24' } });
        addTplBlock('threeCol', { col1: '<div style="text-align:center;"><strong style="font-size:28px;">1</strong><br>Share your unique link</div>', col2: '<div style="text-align:center;"><strong style="font-size:28px;">2</strong><br>Friend signs up & orders</div>', col3: '<div style="text-align:center;"><strong style="font-size:28px;">3</strong><br>You both get $20 credit!</div>', styles: { col1Bg: '#e0f2fe', col2Bg: '#e0f2fe', col3Bg: '#e0f2fe' } });
        addTplBlock('text', { content: 'Your referral link:<br><strong style="color:#0ea5e9;">https://app.com/ref/YOUR_CODE</strong>', styles: { textAlign: 'center', bgColor: '#f0f9ff', paddingTop: '20', paddingBottom: '20' } });
        addTplBlock('button', { text: 'Copy & Share Link', styles: { bgColor: '#0ea5e9' } });
        addTplBlock('social', {});
    }

    if (name === 'minimal') {
        addTplBlock('spacer', { styles: { height: '30' } });
        addTplBlock('text', { content: '<strong style="font-size:20px;">Hello there,</strong>', styles: { paddingBottom: '4' } });
        addTplBlock('text', { content: 'Just a quick note to share some exciting news with you. We\'ve been working hard on something special and can\'t wait to show you what\'s next.', styles: { color: '#475569', lineHeight: '1.8' } });
        addTplBlock('text', { content: 'Stay tuned for more updates soon.', styles: { color: '#475569' } });
        addTplBlock('text', { content: 'Best,<br><strong>The Team</strong>', styles: { paddingTop: '8' } });
        addTplBlock('divider', { styles: { color: '#e2e8f0' } });
        addTplBlock('text', { content: 'You received this because you\'re subscribed. <a href="#" style="color:#6366f1;">Unsubscribe</a>', styles: { fontSize: '12', color: '#94a3b8', textAlign: 'center' } });
    }

    saveState();
    renderCanvas();
    renderProps();
    showToast('✓ ' + name.charAt(0).toUpperCase() + name.replace(/-/g, ' ').slice(1) + ' template loaded!');
}

// Helper to add template blocks with proper positioning
function addTplBlock(type, overrides) {
    var b = createBlock(type);
    b.x = 20;
    b.y = nextBlockY;
    b.w = contentWidth - 40;

    // Apply overrides
    if (overrides) {
        for (var key in overrides) {
            if (key === 'styles') {
                for (var sk in overrides.styles) {
                    b.styles[sk] = overrides.styles[sk];
                }
            } else if (key === 'navLinks' || key === 'links' || key === 'items') {
                b[key] = overrides[key];
            } else {
                b[key] = overrides[key];
            }
        }
    }

    // Estimate block height to prevent overlapping
    var estHeight = 100;
    if (type === 'hero') estHeight = parseInt(b.styles.paddingTop || 60) + parseInt(b.styles.paddingBottom || 60) + 120;
    else if (type === 'image' || type === 'video') estHeight = 250;
    else if (type === 'button') estHeight = parseInt(b.styles.containerPaddingTop || 16) + parseInt(b.styles.containerPaddingBottom || 16) + 50;
    else if (type === 'divider') estHeight = parseInt(b.styles.paddingTop || 16) + parseInt(b.styles.paddingBottom || 16) + 10;
    else if (type === 'spacer') estHeight = parseInt(b.styles.height || 40);
    else if (type === 'social' || type === 'logoHeader') estHeight = parseInt(b.styles.paddingTop || 16) + parseInt(b.styles.paddingBottom || 16) + 40;
    else if (type === 'columns' || type === 'threeCol') estHeight = parseInt(b.styles.paddingTop || 16) + parseInt(b.styles.paddingBottom || 16) + 100;
    else if (type === 'countdown') estHeight = parseInt(b.styles.paddingTop || 30) + parseInt(b.styles.paddingBottom || 30) + 80;
    else if (type === 'quote') estHeight = parseInt(b.styles.paddingTop || 24) + parseInt(b.styles.paddingBottom || 24) + 80;
    else if (type === 'list') estHeight = parseInt(b.styles.paddingTop || 16) + parseInt(b.styles.paddingBottom || 16) + (b.items ? b.items.length * 30 : 90);
    else if (type === 'text') estHeight = parseInt(b.styles.paddingTop || 16) + parseInt(b.styles.paddingBottom || 16) + 60;
    else if (type === 'footer') estHeight = parseInt(b.styles.paddingTop || 24) + parseInt(b.styles.paddingBottom || 24) + 60;

    nextBlockY += estHeight + 15;
    blocks.push(b);
}

var templateBtns = document.querySelectorAll('.template-item');
for (var i = 0; i < templateBtns.length; i++) {
    templateBtns[i].addEventListener('click', function(e) {
        var tpl = e.currentTarget.getAttribute('data-tpl');
        loadTemplate(tpl);
    });
}

// =============================================
// INIT
// =============================================

saveState();
updateUndoRedoBtns();
renderCanvas();

})();
