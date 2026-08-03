import { toast } from './toast';

// ─── PDF print styles & window (paginação A4 real, papel timbrado, marca d'água) ──

export const PDF_STYLES = `
* { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 11px; padding: 20px 0; line-height: 1.4; background: #f1f5f9; display: flex; flex-direction: column; align-items: center; }
@media print {
  body { background: transparent; padding: 0; margin: 0; display: block; }
}
h1 { font-size: 18px; font-weight: bold; margin-bottom: 6px; text-align: center; color: #0f172a; }
h2 { font-size: 13px; font-weight: bold; margin: 20px 0 10px; color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
.meta { font-size: 10px; color: #64748b; margin-bottom: 20px; text-align: center; }
table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; background: rgba(255, 255, 255, 0.85); table-layout: auto; border-left: none !important; border-right: none !important; }
th { background: rgba(248, 250, 252, 0.9); padding: 6px 8px; text-align: left; font-weight: 700; color: #475569; border-bottom: 2px solid #e2e8f0; border-left: none !important; border-right: none !important; }
td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; border-left: none !important; border-right: none !important; }
tr:last-child td { border-bottom: none; }
.badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; }
.g { background:#d1fae5;color:#065f46 } .y { background:#fef3c7;color:#92400e }
.r { background:#fee2e2;color:#991b1b } .b { background:#dbeafe;color:#1d4ed8 }
.v { background:#ede9fe;color:#5b21b6 } .o { background:#ffedd5;color:#9a3412 }
.kpi-row { display:flex; gap:12px; margin-bottom:20px; }
.kpi { flex:1; background: rgba(248, 250, 252, 0.85); border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; page-break-inside: avoid; break-inside: avoid; }
.kpi-label { font-size:9px; color:#64748b; margin-bottom:4px; font-weight:600; text-transform:uppercase; letter-spacing:.5px; }
.kpi-value { font-size:18px; font-weight:800; }
.empty { text-align:center; color:#94a3b8; padding:20px; }
.footer { margin-top:20px; padding-top:10px; border-top:1px solid #e2e8f0; font-size:9px; color:#94a3b8; text-align: center; page-break-inside: avoid; break-inside: avoid; }

/* Paginação Real A4 */
#pdf-pages {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
@media print {
  #pdf-pages {
    display: block;
  }
}
.pdf-page {
  width: 210mm;
  height: 297mm;
  position: relative;
  background: white;
  box-shadow: 0 4px 10px rgba(0,0,0,0.15);
  margin-bottom: 20px;
  overflow: hidden;
  box-sizing: border-box;
}
@media print {
  .pdf-page {
    box-shadow: none;
    margin-bottom: 0;
    page-break-after: always;
    break-after: page;
  }
}
.letterhead-background {
  position: absolute;
  top: 0; left: 0;
  width: 210mm; height: 297mm;
  z-index: 1;
  pointer-events: none;
  background-repeat: no-repeat;
  background-position: center top;
  background-size: 100% 100%;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
.watermark-background {
  position: absolute;
  top: 0; left: 0;
  width: 210mm; height: 297mm;
  z-index: 2;
  pointer-events: none;
  opacity: 0.04;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
.page-content-safe-area {
  position: absolute;
  top: 45mm;
  left: 20mm;
  width: 170mm;
  height: 207mm;
  z-index: 10;
  box-sizing: border-box;
  overflow: hidden;
  background: transparent;
}
`;

export const openPrintWindow = (title: string, body: string, settingsOwnerId: string) => {
  const win = window.open('', '_blank', 'width=960,height=720');
  if (!win) { toast.warning('Permita popups para gerar o PDF.'); return; }

  let watermarkSrc = '';
  let hasLetterhead = false;
  try {
    const settingsKey = `recanto_system_settings_${settingsOwnerId}`;
    const raw = localStorage.getItem(settingsKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      const src = parsed?.institution?.watermarkImage;
      if (src) {
        hasLetterhead = true;
        watermarkSrc = src;
      }
    }
  } catch (e) {
    console.error('Erro ao carregar papel timbrado:', e);
  }

  const now = new Date().toLocaleString('pt-BR');

  win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
      @page { size: A4; margin: 0; }
      ${PDF_STYLES}
    </style>
  </head><body>
    <div id="pdf-source" style="position: absolute; left: -9999px; top: 0; width: 170mm; box-sizing: border-box;">
      ${body}
      <div class="footer">Gerado em ${now} · Recanto dos Anciãos · Sistema de Gestão ILPI</div>
    </div>

    <div id="pdf-pages"></div>

    <script>
      const hasLetterhead = ${hasLetterhead};
      const letterheadSrc = '${watermarkSrc}';

      window.onload = () => {
        const pxPerMm = 96 / 25.4;
        const maxHeight = 207 * pxPerMm; // 207mm is safe content height (297 - 45 - 45)
        const pagesContainer = document.getElementById('pdf-pages');
        const sourceContainer = document.getElementById('pdf-source');

        let currentPage = null;
        let currentSafeContent = null;

        function createPage() {
          currentPage = document.createElement('div');
          currentPage.className = 'pdf-page';

          if (hasLetterhead && letterheadSrc) {
            const bg = document.createElement('div');
            bg.className = 'letterhead-background';
            bg.style.backgroundImage = 'url("' + letterheadSrc + '")';
            currentPage.appendChild(bg);

            const wm = document.createElement('div');
            wm.className = 'watermark-background';
            wm.style.backgroundImage = 'url("' + letterheadSrc + '")';
            currentPage.appendChild(wm);
          }

          currentSafeContent = document.createElement('div');
          currentSafeContent.className = 'page-content-safe-area';
          currentPage.appendChild(currentSafeContent);

          pagesContainer.appendChild(currentPage);
        }

        function handleTable(table) {
          currentSafeContent.appendChild(table);
          if (currentSafeContent.scrollHeight <= maxHeight) {
            return;
          }
          currentSafeContent.removeChild(table);

          if (currentSafeContent.children.length > 0) {
            createPage();
            currentSafeContent.appendChild(table);
            if (currentSafeContent.scrollHeight <= maxHeight) {
              return;
            }
            currentSafeContent.removeChild(table);
          }

          const thead = table.querySelector('thead');
          const tbody = table.querySelector('tbody');
          const rows = tbody ? Array.from(tbody.querySelectorAll('tr')) : [];

          let currentTable = document.createElement('table');
          currentTable.className = table.className;
          currentTable.style.cssText = table.style.cssText;
          if (thead) {
            currentTable.appendChild(thead.cloneNode(true));
          }
          let currentTbody = document.createElement('tbody');
          currentTable.appendChild(currentTbody);
          currentSafeContent.appendChild(currentTable);

          for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            currentTbody.appendChild(row);

            if (currentSafeContent.scrollHeight > maxHeight) {
              currentTbody.removeChild(row);
              createPage();

              currentTable = document.createElement('table');
              currentTable.className = table.className;
              currentTable.style.cssText = table.style.cssText;
              if (thead) {
                currentTable.appendChild(thead.cloneNode(true));
              }
              currentTbody = document.createElement('tbody');
              currentTable.appendChild(currentTbody);
              currentSafeContent.appendChild(currentTable);

              currentTbody.appendChild(row);
            }
          }
        }

        createPage();

        const elements = Array.from(sourceContainer.children);
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i];
          if (el.tagName === 'TABLE') {
            handleTable(el);
          } else {
            currentSafeContent.appendChild(el);
            if (currentSafeContent.scrollHeight > maxHeight) {
              if (el.classList.contains('footer')) {
                // Keep it on the last page. Rule 15: Don't create an exclusive page just for the footer.
                continue;
              }
              if (currentSafeContent.children.length > 1) {
                currentSafeContent.removeChild(el);
                createPage();
                currentSafeContent.appendChild(el);
              }
            }
          }
        }

        sourceContainer.style.display = 'none';

        setTimeout(() => {
          window.print();
        }, 150);
      };
    </script>
  </body></html>`);
  win.document.close();
};
