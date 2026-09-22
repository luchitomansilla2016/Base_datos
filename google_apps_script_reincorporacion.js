/**
 * =========================================================================================
 * POLICÍA NACIONAL DEL PERÚ - REGIÓN POLICIAL HUÁNUCO
 * SISTEMA DE GESTIÓN DOCUMENTARIA Y PERSONAL
 * SCRIPT OFICIAL: CARGA MASIVA DE ÓRDENES DE REINCORPORACIÓN
 * =========================================================================================
 * 
 * ORDEN DE COLUMNAS:
 * A: FECHA DOCUMENTO | B: CIP | C: GRADO | D: APELLIDOS Y NOMBRES | E: MOTIVO |
 * F: DESTINO | G: UNIDAD DE PROCEDENCIA | H: DESCRIPCION | I: QUIEN ORDENA |
 * J: USUARIO REGISTRA | K: ESTADO | L: NUMERO DOCUMENTO | M: ID NUBE
 * =========================================================================================
 */

const SUPABASE_URL = "https://ngsujkfmkgofngqwuqnf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nc3Vqa2Zta2dvZm5ncXd1cW5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2NDk2MzQsImV4cCI6MjEwNDIyNTYzNH0.KL1YmWPLSkMHs9LCf4TC8quqo2G4cd8K0zaGxvoU3Vg";

// Valores predeterminados oficiales
const DEFAULT_PROCEDENCIA = "COMOPPOL DIRNOS REGPOL HUANUCO EM OFAD";
const DEFAULT_QUIEN_ORDENA = "JEFE OFAD REGPOL HUANUCO";
const DEFAULT_USUARIO_REGISTRA = "ST2 PNP MANSILLA SANTA MARIA JOSE LUIS";
const DEFAULT_DESCRIPCION_PRE = "PONE A DISPOSICION AL TERMINO DE:";

// Firmante oficial por defecto para el pie de página
const DEFAULT_FIRMANTE = {
  cip: "30894512",
  nombres: "Ricky Florian CISNEROS APAZA",
  grado: "CMTE PNP",
  cargo: "JEFE OFAD REGPOL HUANUCO"
};

/**
 * Menú superior oficial en Google Sheets
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("📌 PNP Reincorporaciones")
    .addItem("🚀 1. Asignar N° Oficial y Registrar en el Sistema", "subirANube")
    .addItem("⚡ 2. Autocompletar Campos Pendientes", "autocompletarTodo")
    .addSeparator()
    .addItem("🖨️ 3. Imprimir Fila Actual (Individual - 2 Copias A5 en A4)", "imprimirFilaActual")
    .addItem("🖨️ 4. Imprimir Todo el Lote (Masivo A4)", "imprimirLoteMasivo")
    .addSeparator()
    .addItem("🔄 5. Marcar Todo como 'PENDIENTE DE SUBIR'", "marcarTodoPendiente")
    .addItem("✨ 6. Crear / Restaurar Encabezados Oficiales", "crearEncabezadosOficiales")
    .addToUi();
}

/**
 * Disparador automático que se ejecuta en tiempo real al escribir en la hoja
 */
function onEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const startRow = e.range.getRow();
  const numRows = e.range.getNumRows();

  if (startRow < 2) return; // Ignorar encabezados

  for (let r = 0; r < numRows; r++) {
    const fila = startRow + r;
    autoCompletarFila(sheet, fila);
  }
}

/**
 * Llena automáticamente los campos predeterminados de una fila mientras el usuario escribe
 */
function autoCompletarFila(sheet, fila) {
  const rowVals = sheet.getRange(fila, 1, 1, 13).getValues()[0];
  
  let fecha = rowVals[0];                                          // Col A (1) : FECHA DOCUMENTO
  let cip = String(rowVals[1] || "").trim();                       // Col B (2) : CIP
  let grado = String(rowVals[2] || "").trim().toUpperCase();       // Col C (3) : GRADO
  let nombres = String(rowVals[3] || "").trim().toUpperCase();     // Col D (4) : APELLIDOS Y NOMBRES
  let motivo = String(rowVals[4] || "").trim().toUpperCase();      // Col E (5) : MOTIVO
  let destino = String(rowVals[5] || "").trim().toUpperCase();     // Col F (6) : DESTINO
  let procedencia = String(rowVals[6] || "").trim().toUpperCase(); // Col G (7) : UNIDAD DE PROCEDENCIA
  let descripcion = String(rowVals[7] || "").trim();               // Col H (8) : DESCRIPCION
  let quienOrdena = String(rowVals[8] || "").trim().toUpperCase(); // Col I (9) : QUIEN ORDENA
  let usuarioRegistra = String(rowVals[9] || "").trim();           // Col J (10): USUARIO REGISTRA
  let estado = String(rowVals[10] || "").trim().toUpperCase();     // Col K (11): ESTADO
  let numDoc = String(rowVals[11] || "").trim();                   // Col L (12): NUMERO DOCUMENTO

  if (!cip && !nombres && !destino && !grado && !motivo) return;

  const todayStr = Utilities.formatDate(new Date(), "GMT-5", "yyyy-MM-dd");

  // 1. FECHA DOCUMENTO (Col A)
  if (!fecha) {
    sheet.getRange(fila, 1).setValue(todayStr);
  }

  // 2. GRADO (Col C) y APELLIDOS Y NOMBRES (Col D)
  if (grado) sheet.getRange(fila, 3).setValue(grado);
  if (nombres) sheet.getRange(fila, 4).setValue(nombres);

  // 3. MOTIVO (Col E)
  if (motivo) sheet.getRange(fila, 5).setValue(motivo);

  // 4. DESTINO (Col F)
  if (destino) sheet.getRange(fila, 6).setValue(destino);

  // 5. UNIDAD DE PROCEDENCIA (Col G)
  if (!procedencia) {
    sheet.getRange(fila, 7).setValue(DEFAULT_PROCEDENCIA);
  } else {
    sheet.getRange(fila, 7).setValue(procedencia);
  }

  // 6. DESCRIPCION (Col H)
  const detalleMotivo = motivo ? motivo : "SUS ATENCIONES MEDICAS";
  const textoEsperado = DEFAULT_DESCRIPCION_PRE + " " + detalleMotivo;
  if (!descripcion || descripcion === DEFAULT_DESCRIPCION_PRE || descripcion.startsWith(DEFAULT_DESCRIPCION_PRE)) {
    sheet.getRange(fila, 8).setValue(textoEsperado);
  }

  // 7. QUIEN ORDENA (Col I)
  if (!quienOrdena) {
    sheet.getRange(fila, 9).setValue(DEFAULT_QUIEN_ORDENA);
  } else {
    sheet.getRange(fila, 9).setValue(quienOrdena);
  }

  // 8. USUARIO REGISTRA (Col J)
  if (!usuarioRegistra) {
    sheet.getRange(fila, 10).setValue(DEFAULT_USUARIO_REGISTRA);
  }

  // 9. ESTADO (Col K)
  if (!estado || estado !== "REGISTRADO EN NUBE") {
    sheet.getRange(fila, 11).setValue("PENDIENTE DE SUBIR");
    sheet.getRange(fila, 11).setBackground("#fff3cd").setFontColor("#856404").setFontWeight("bold");
    
    // 10. NUMERO DOCUMENTO (Col L): Se indicará que será asignado por el sistema al registrar
    if (!numDoc) {
      sheet.getRange(fila, 12).setValue("(Se asignará al registrar)");
      sheet.getRange(fila, 12).setFontColor("#888888").setFontStyle("italic");
    }
  }
}

/**
 * Autocompleta todas las filas existentes en la hoja
 */
function autocompletarTodo() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("No hay registros en la hoja para autocompletar.");
    return;
  }

  let count = 0;
  for (let fila = 2; fila <= lastRow; fila++) {
    const cip = sheet.getRange(fila, 2).getValue();
    const nombres = sheet.getRange(fila, 4).getValue();
    if (cip || nombres) {
      autoCompletarFila(sheet, fila);
      count++;
    }
  }

  SpreadsheetApp.getUi().alert("⚡ Se autocompletaron y verificaron " + count + " filas con éxito.");
}

/**
 * Consulta el correlativo oficial en la tabla 'orden_reincorporacion' de Supabase,
 * genera el número correlativo oficial, registra la orden en la tabla
 * y actualiza la fila en Google Sheets.
 */
function subirANube() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("No hay registros en la hoja para registrar en el sistema.");
    return;
  }

  // 1. Obtener el número correlativo máximo actual directo de la tabla orden_reincorporacion
  let maxCorrelativo = obtenerUltimoCorrelativoSupabase();
  const yr = new Date().getFullYear();
  let subidos = 0;
  let errores = 0;

  for (let fila = 2; fila <= lastRow; fila++) {
    autoCompletarFila(sheet, fila);
    const rowVals = sheet.getRange(fila, 1, 1, 13).getValues()[0];

    const fecha = rowVals[0];                                          // Col A (1) : FECHA DOCUMENTO
    const cip = String(rowVals[1] || "").trim();                       // Col B (2) : CIP
    const grado = String(rowVals[2] || "").trim().toUpperCase();       // Col C (3) : GRADO
    const nombres = String(rowVals[3] || "").trim().toUpperCase();     // Col D (4) : APELLIDOS Y NOMBRES
    const motivo = String(rowVals[4] || "").trim().toUpperCase();      // Col E (5) : MOTIVO
    const destino = String(rowVals[5] || "").trim().toUpperCase();     // Col F (6) : DESTINO
    const procedencia = String(rowVals[6] || "").trim().toUpperCase() || DEFAULT_PROCEDENCIA; // Col G (7): UNIDAD PROCEDENCIA
    const descripcion = String(rowVals[7] || "").trim() || (DEFAULT_DESCRIPCION_PRE + " " + (motivo || "SUS ATENCIONES MEDICAS")); // Col H (8): DESCRIPCION
    const quienOrdena = String(rowVals[8] || "").trim().toUpperCase() || DEFAULT_QUIEN_ORDENA; // Col I (9): QUIEN ORDENA
    const usuarioRegistra = String(rowVals[9] || "").trim() || DEFAULT_USUARIO_REGISTRA; // Col J (10): USUARIO REGISTRA
    const estado = String(rowVals[10] || "").trim().toUpperCase();     // Col K (11): ESTADO

    // Procesar solo filas con datos que aún no están registradas en la nube
    if ((cip || nombres) && estado !== "REGISTRADO EN NUBE") {
      maxCorrelativo++;
      const numPadded = String(maxCorrelativo).padStart(3, "0");
      const fullNumDoc = `ORDEN DE REINCORPORACION N°${numPadded}-${yr}-COMOPPOL/DIRNOS PNP/REGPOL HCO/EM-OFAD.AREREHUM.MP`;

      let gradoNombresFinal = nombres;
      if (grado && !nombres.startsWith(grado)) {
        gradoNombresFinal = grado + " " + nombres;
      }

      const formattedFecha = (fecha instanceof Date) 
        ? Utilities.formatDate(fecha, "GMT-5", "yyyy-MM-dd") 
        : (String(fecha || "").split("T")[0] || Utilities.formatDate(new Date(), "GMT-5", "yyyy-MM-dd"));

      // Payload oficial para la tabla orden_reincorporacion
      const payload = {
        numero_documento: fullNumDoc,
        fecha_documento: formattedFecha,
        descripcion: descripcion,
        grado_apellidos_nombres: gradoNombresFinal,
        unidad_procedencia: procedencia,
        destino: destino || "OFAD REGPOL HUANUCO",
        quien_ordena: quienOrdena,
        usuario_registra: usuarioRegistra
      };

      try {
        const options = {
          method: "post",
          contentType: "application/json",
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": "Bearer " + SUPABASE_KEY,
            "Prefer": "return=representation"
          },
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        };

        // Inserción en la tabla orden_reincorporacion
        const response = UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/orden_reincorporacion", options);
        const code = response.getResponseCode();
        const resText = response.getContentText();

        if (code >= 200 && code < 300) {
          const data = JSON.parse(resText);
          const newId = (Array.isArray(data) && data[0]) ? data[0].id : "";
          
          // Actualizar la fila en Google Sheets con el número oficial registrado
          sheet.getRange(fila, 11).setValue("REGISTRADO EN NUBE");
          sheet.getRange(fila, 11).setBackground("#d4edda").setFontColor("#155724").setFontWeight("bold");
          
          sheet.getRange(fila, 12).setValue(fullNumDoc);
          sheet.getRange(fila, 12).setFontColor("#000000").setFontStyle("normal").setFontWeight("bold");

          if (newId) sheet.getRange(fila, 13).setValue(newId);
          subidos++;
        } else {
          errores++;
          Logger.log("Error al registrar fila " + fila + " en orden_reincorporacion: HTTP " + code + " - " + resText);
        }
      } catch (err) {
        errores++;
        Logger.log("Excepción al registrar fila " + fila + ": " + err.message);
      }
    }
  }

  SpreadsheetApp.getUi().alert(
    "🚀 Resultado de Registro en 'orden_reincorporacion':\n\n" +
    "✅ Órdenes numeradas y registradas con éxito: " + subidos + "\n" +
    (errores > 0 ? ("⚠️ Errores encontrados: " + errores + "\n") : "") +
    "\nLas órdenes ya se encuentran registradas con su correlativo oficial en la tabla 'orden_reincorporacion' y están listas para imprimirse individual o masivamente."
  );
}

/**
 * Consulta el último correlativo registrado en la tabla orden_reincorporacion de Supabase
 */
function obtenerUltimoCorrelativoSupabase() {
  const currentYear = new Date().getFullYear();
  try {
    const url = SUPABASE_URL + "/rest/v1/orden_reincorporacion?select=numero_documento,id&order=id.desc&limit=150";
    const options = {
      method: "get",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY
      },
      muteHttpExceptions: true
    };
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 200) {
      const list = JSON.parse(response.getContentText());
      let max = 0;
      if (Array.isArray(list)) {
        list.forEach(item => {
          const numStr = String(item.numero_documento || "");
          const m = numStr.match(/N[°º\s]*(\d+)/i) || numStr.match(/^(\d+)/);
          if (m) {
            const val = parseInt(m[1], 10);
            if (!isNaN(val) && val > max) max = val;
          }
        });
      }
      return max;
    }
  } catch (e) {
    Logger.log("Error al consultar correlativo en orden_reincorporacion: " + e.message);
  }
  return 0;
}

// =========================================================================
// MÓDULO DE IMPRESIÓN OFICIAL (INDIVIDUAL Y MASIVO) DIRECTO EN GOOGLE SHEETS
// =========================================================================

/**
 * Imprime la orden de la fila que el usuario tiene actualmente seleccionada
 */
function imprimirFilaActual() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const row = sheet.getActiveCell().getRow();
  if (row < 2) {
    SpreadsheetApp.getUi().alert("Por favor, seleccione una fila con datos de un efectivo (a partir de la fila 2).");
    return;
  }
  const rowVals = sheet.getRange(row, 1, 1, 13).getValues()[0];
  const cip = String(rowVals[1] || "").trim();
  const nombres = String(rowVals[3] || "").trim();
  if (!cip && !nombres) {
    SpreadsheetApp.getUi().alert("La fila seleccionada (" + row + ") no contiene datos de un efectivo.");
    return;
  }
  const pageHTML = generarHtmlA4Reincorporacion(rowVals, row - 1);
  const fullHtml = envolverHtmlImpresion([pageHTML], "Impresión Individual - Fila " + row);
  const htmlOutput = HtmlService.createHtmlOutput(fullHtml).setWidth(960).setHeight(750);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, "Vista Previa e Impresión Oficial A4");
}

/**
 * Imprime todas las órdenes registradas en la hoja en formato A4 masivo
 */
function imprimirLoteMasivo() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("No hay registros en la hoja para imprimir.");
    return;
  }
  const allRows = sheet.getRange(2, 1, lastRow - 1, 13).getValues();
  const pages = [];
  for (let i = 0; i < allRows.length; i++) {
    const rowVals = allRows[i];
    const cip = String(rowVals[1] || "").trim();
    const nombres = String(rowVals[3] || "").trim();
    if (cip || nombres) {
      pages.push(generarHtmlA4Reincorporacion(rowVals, i + 1));
    }
  }
  if (pages.length === 0) {
    SpreadsheetApp.getUi().alert("No se encontraron filas con datos para imprimir.");
    return;
  }
  const fullHtml = envolverHtmlImpresion(pages, "Impresión Masiva de Órdenes (" + pages.length + " hojas A4)");
  const htmlOutput = HtmlService.createHtmlOutput(fullHtml).setWidth(960).setHeight(750);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, "Impresión Masiva A4 (" + pages.length + " Órdenes)");
}

/**
 * Genera el HTML de una hoja física A4 (con 2 copias A5) para una fila de datos
 */
function generarHtmlA4Reincorporacion(rowVals, correlativoFallback) {
  const yr = new Date().getFullYear();
  const rawNumDoc = String(rowVals[11] || "").trim();
  let numDocFinal = rawNumDoc;
  if (!numDocFinal || numDocFinal.includes("Se asignará")) {
    const numPadded = String(correlativoFallback || 1).padStart(3, "0");
    numDocFinal = `ÓRDEN DE REINCORPORACION N°${numPadded}-${yr}-COMOPPOL/DIRNOS PNP/REGPOL HCO/EM-OFAD.AREREHUM.MP`;
  } else {
    const mNum = rawNumDoc.match(/N[°º\s]*(\d+)/i) || rawNumDoc.match(/(\d+)/);
    const numPadded = mNum ? mNum[1].padStart(3, "0") : String(correlativoFallback || 1).padStart(3, "0");
    numDocFinal = `ÓRDEN DE REINCORPORACION N°${numPadded}-${yr}-COMOPPOL/DIRNOS PNP/REGPOL HCO/EM-OFAD.AREREHUM.MP`;
  }

  const fechaRaw = rowVals[0];
  let fechaDocTexto = "22 DE SETIEMBRE DE 2026";
  const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SETIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
  let d = (fechaRaw instanceof Date) ? fechaRaw : new Date();
  if (isNaN(d.getTime())) d = new Date();
  fechaDocTexto = d.getDate() + " DE " + meses[d.getMonth()] + " DE " + d.getFullYear();

  const cip = String(rowVals[1] || "---").trim();
  const grado = String(rowVals[2] || "").trim().toUpperCase();
  let nombres = String(rowVals[3] || "---").trim().toUpperCase();
  if (grado && !nombres.startsWith(grado)) {
    nombres = grado + " " + nombres;
  }

  // Extraer el motivo limpio priorizando DESCRIPCION (Col H / rowVals[7]) y luego MOTIVO (Col E / rowVals[4])
  let descRaw = String(rowVals[7] || "").trim();
  let motivoRaw = String(rowVals[4] || "").trim();
  
  let motivoLimpio = descRaw.replace(/^(SE\s+)?PONE\s+A\s+DISPOSICI[OÓ]N\s+(AL\s+T[EÉ]RMINO\s+DE\s*:?|AL\s*:?|POR\s*:?|CONFORME\s*:?)/i, "")
                            .replace(/^REINCORPORACI[OÓ]N\s*(POR|AL|A|DE|EN)?\s*(T[EÉ]RMINO\s*DE\s*:?)?/i, "")
                            .replace(/^AL\s*T[EÉ]RMINO\s*DE\s*:?\s*/i, "")
                            .trim();

  if (!motivoLimpio && motivoRaw) {
    motivoLimpio = motivoRaw.replace(/^(SE\s+)?PONE\s+A\s+DISPOSICI[OÓ]N\s+(AL\s+T[EÉ]RMINO\s+DE\s*:?|AL\s*:?|POR\s*:?|CONFORME\s*:?)/i, "")
                            .replace(/^REINCORPORACI[OÓ]N\s*(POR|AL|A|DE|EN)?\s*(T[EÉ]RMINO\s*DE\s*:?)?/i, "")
                            .replace(/^AL\s*T[EÉ]RMINO\s*DE\s*:?\s*/i, "")
                            .trim();
  }
  const motivo = (motivoLimpio || "SUS ATENCIONES MEDICAS").toUpperCase();

  const destino = String(rowVals[5] || "COMISARIA SECTORIAL HUANUCO").trim().toUpperCase();
  const procedencia = String(rowVals[6] || DEFAULT_PROCEDENCIA).trim().toUpperCase();

  const obsHTML = "SE PONE A DISPOSICI&Oacute;N AL ADMINISTRADO CONFORME AL MOTIVO ANTES INDICADO; CABE PRECISAR QUE SU REINCORPORACI&Oacute;N DEBER&Aacute; SER COMUNICADO AL JEFE DE DIVISI&Oacute;N, JEFE DE DEPARTAMENTO (SI FUERA EL CASO) Y A AL &Aacute;REA DE RECURSOS HUMANOS DE LA REGPOL HUANUCO CON EL DOCUMENTO CORRESPONDIENTE MEDIANTE EL CORREO ELECTR&Oacute;NICO rphuanuco.arerehum@policia.gob.pe, SIN PERJUICIO DE FORMULAR LA DOCUMENTACI&Oacute;N CORRESPONDIENTE ANTE CUALQUIER NOVEDAD QUE PUDIERA SUSCITARSE.";

  const imgMembrete = "https://luchitomansilla2016.github.io/Base_datos/membrete_oficial_pnp.png";
  const imgSelloOfad = "https://luchitomansilla2016.github.io/Base_datos/sello_redondo_ofad.png";
  const imgSelloCargo = "https://luchitomansilla2016.github.io/Base_datos/sello_cargo_recepcion.png";

  return `
  <div class="a4-page">
    <!-- COPIA 1 (SUPERIOR 148.5mm) -->
    <div class="orden-card top-copy">
      <div>
        <div class="header-row">
          <div class="header-membrete-box">
            <img src="${imgMembrete}" class="membrete-img" alt="PNP" />
          </div>
          <div class="doc-title-container">
            <div class="doc-title">${numDocFinal}</div>
          </div>
        </div>

        <table class="data-table">
          <tr>
            <td class="data-label">CIP</td>
            <td class="data-sep">:</td>
            <td class="data-val bold">${cip}</td>
          </tr>
          <tr>
            <td class="data-label">APELLIDOS Y NOMBRES</td>
            <td class="data-sep">:</td>
            <td class="data-val bold">${nombres}</td>
          </tr>
          <tr>
            <td class="data-label">PROCEDENCIA</td>
            <td class="data-sep">:</td>
            <td class="data-val">${procedencia}</td>
          </tr>
          <tr>
            <td class="data-label">UNIDAD DE DESTINO</td>
            <td class="data-sep">:</td>
            <td class="data-val bold">${destino}</td>
          </tr>
          <tr>
            <td class="data-label">MOTIVO</td>
            <td class="data-sep">:</td>
            <td class="data-val">AL T&Eacute;RMINO DE: <b class="val-motivo">${motivo}</b></td>
          </tr>
          <tr>
            <td class="data-label">OBSERVACI&Oacute;N</td>
            <td class="data-sep">:</td>
            <td class="data-val obs-paragraph">${obsHTML}</td>
          </tr>
        </table>
      </div>

      <div>
        <div class="divider-line"></div>
        <div class="date-row">HU&Aacute;NUCO, <span>${fechaDocTexto}</span></div>

        <div class="footer-sign-block">
          <div class="sello-sign-wrapper">
            <img src="${imgSelloOfad}" class="sello-redondo-img" alt="Sello OFAD" />
            <div class="sign-container">
              <div class="sign-dots"></div>
              <div class="sign-info-main">CIP - ${DEFAULT_FIRMANTE.cip}</div>
              <div class="sign-info-main">${DEFAULT_FIRMANTE.nombres}</div>
              <div class="sign-info-main">${DEFAULT_FIRMANTE.grado}</div>
              <div class="sign-info-cargo">${DEFAULT_FIRMANTE.cargo}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- COPIA 2 (INFERIOR 148.5mm CON CARGO DE RECEPCION) -->
    <div class="orden-card bottom-copy">
      <div>
        <div class="header-row">
          <div class="header-membrete-box">
            <img src="${imgMembrete}" class="membrete-img" alt="PNP" />
          </div>
          <div class="doc-title-container">
            <div class="doc-title">${numDocFinal}</div>
          </div>
        </div>

        <table class="data-table">
          <tr>
            <td class="data-label">CIP</td>
            <td class="data-sep">:</td>
            <td class="data-val bold">${cip}</td>
          </tr>
          <tr>
            <td class="data-label">APELLIDOS Y NOMBRES</td>
            <td class="data-sep">:</td>
            <td class="data-val bold">${nombres}</td>
          </tr>
          <tr>
            <td class="data-label">PROCEDENCIA</td>
            <td class="data-sep">:</td>
            <td class="data-val">${procedencia}</td>
          </tr>
          <tr>
            <td class="data-label">UNIDAD DE DESTINO</td>
            <td class="data-sep">:</td>
            <td class="data-val bold">${destino}</td>
          </tr>
          <tr>
            <td class="data-label">MOTIVO</td>
            <td class="data-sep">:</td>
            <td class="data-val">AL T&Eacute;RMINO DE: <b class="val-motivo">${motivo}</b></td>
          </tr>
          <tr>
            <td class="data-label">OBSERVACI&Oacute;N</td>
            <td class="data-sep">:</td>
            <td class="data-val obs-paragraph">${obsHTML}</td>
          </tr>
        </table>
      </div>

      <div>
        <div class="divider-line"></div>
        <div class="date-row">HU&Aacute;NUCO, <span>${fechaDocTexto}</span></div>

        <div class="footer-sign-block has-cargo">
          <div class="sello-cargo-box">
            <img src="${imgSelloCargo}" class="sello-cargo-img" alt="Cargo Recepci&oacute;n" />
          </div>
          <div class="sello-sign-wrapper">
            <img src="${imgSelloOfad}" class="sello-redondo-img" alt="Sello OFAD" />
            <div class="sign-container">
              <div class="sign-dots"></div>
              <div class="sign-info-main">CIP - ${DEFAULT_FIRMANTE.cip}</div>
              <div class="sign-info-main">${DEFAULT_FIRMANTE.nombres}</div>
              <div class="sign-info-main">${DEFAULT_FIRMANTE.grado}</div>
              <div class="sign-info-cargo">${DEFAULT_FIRMANTE.cargo}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `;
}

/**
 * Envuelve las hojas generadas con los estilos oficiales y la barra de impresión
 */
function envolverHtmlImpresion(pagesArray, tituloDialogo) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>${tituloDialogo}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: #33393e; font-family: Arial, sans-serif; display: flex; flex-direction: column; align-items: center; padding-bottom: 30px; }
      .screen-bar {
        position: sticky; top: 0; z-index: 1000; width: 100%; background: #ffffff;
        padding: 12px 20px; border-bottom: 2px solid #0b5a3c; display: flex;
        justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      }
      .screen-bar h3 { color: #0b5a3c; font-size: 15px; margin: 0; }
      .btn-print {
        background: #0b5a3c; color: #ffffff; border: none; padding: 8px 18px;
        border-radius: 6px; font-size: 13px; font-weight: bold; cursor: pointer;
        display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(11,90,60,0.3);
      }
      .btn-print:hover { background: #08432c; }
      .pages-wrapper { display: flex; flex-direction: column; gap: 20px; margin-top: 20px; }
      
      .a4-page {
        width: 210mm; height: 297mm; min-height: 297mm; max-height: 297mm;
        background: #ffffff; padding: 0; box-shadow: 0 0 25px rgba(0,0,0,0.5);
        display: flex; flex-direction: column; box-sizing: border-box; position: relative; margin: 0 auto;
      }
      .orden-card {
        width: 100%; height: 148.5mm; max-height: 148.5mm; box-sizing: border-box;
        padding: 10mm 12mm 0mm 25mm; display: flex; flex-direction: column;
        justify-content: flex-start; position: relative; background: #ffffff;
      }
      .orden-card.top-copy { border-bottom: 1.5px dashed #555; }
      .header-row { display: flex; align-items: center; justify-content: flex-start; gap: 12px; margin-bottom: 6px; }
      .membrete-img { width: 135px; height: auto; display: block; }
      .doc-title-container { flex: 1; text-align: center; }
      .doc-title {
        font-family: 'Impact', 'Arial Black', sans-serif; font-size: 14pt;
        font-weight: normal; text-decoration: underline; letter-spacing: 0.3px;
        line-height: 1.18; color: #000; text-transform: uppercase;
      }
      .data-table { width: 100%; border-collapse: collapse; margin-bottom: 2px; font-family: Arial, sans-serif; font-size: 9pt; }
      .data-table tr { vertical-align: top; }
      .data-label { width: 180px; font-weight: bold; color: #000; padding: 1.5px 0; white-space: nowrap; }
      .data-sep { width: 14px; text-align: center; font-weight: bold; padding: 1.5px 0; }
      .data-val { color: #000; padding: 1.5px 0; text-align: justify; line-height: 1.25; }
      .data-val.bold { font-weight: bold; }
      .obs-paragraph { font-family: Arial, sans-serif; font-size: 9pt; line-height: 1.25; text-align: justify; }
      .divider-line { width: 100%; height: 1px; background-color: #000; margin: 6px 0 5px 0; }
      .date-row { text-align: right; font-family: Arial, sans-serif; font-size: 9pt; font-weight: bold; text-transform: uppercase; margin-bottom: 6px; }
      .footer-sign-block { display: flex; justify-content: flex-end; align-items: flex-start; margin-top: 64px; margin-right: 23px; }
      .footer-sign-block.has-cargo { justify-content: space-between; }
      .sello-cargo-box { display: flex; align-items: flex-start; }
      .sello-cargo-img { width: 58mm; height: auto; display: block; margin-top: -8mm; margin-left: 2mm; }
      .sello-sign-wrapper { display: flex; align-items: flex-start; position: relative; }
      .sello-redondo-img {
        width: 30mm; height: 30mm; border-radius: 50%; object-fit: contain;
        display: block; margin-right: -1px; margin-top: -15mm; position: relative; z-index: 2;
      }
      .sign-container {
        width: 40mm; max-width: 40mm; min-height: 15mm; text-align: center;
        position: relative; z-index: 1; display: flex; flex-direction: column; justify-content: flex-start;
      }
      .sign-dots { border-top: 1px dashed #000; margin-bottom: 2px; width: 100%; }
      .sign-info-main { font-family: 'Arial Narrow', Arial, sans-serif; font-size: 9pt; font-weight: bold; line-height: 1.1; text-transform: none; white-space: nowrap; }
      .sign-info-cargo { font-family: 'Arial Narrow', Arial, sans-serif; font-size: 8pt; font-weight: bold; line-height: 1.1; text-transform: uppercase; white-space: normal; }

      @page { size: A4 portrait; margin: 0; }
      @media print {
        body { background: #ffffff !important; padding: 0 !important; }
        .screen-bar { display: none !important; }
        .pages-wrapper { margin: 0 !important; gap: 0 !important; }
        .a4-page { box-shadow: none !important; margin: 0 !important; page-break-after: always !important; break-after: page !important; }
      }
    </style>
  </head>
  <body>
    <div class="screen-bar">
      <h3><span>📑</span> ${tituloDialogo}</h3>
      <button class="btn-print" onclick="window.print()"><span>🖨️</span> IMPRIMIR EN A4 / GUARDAR PDF</button>
    </div>
    <div class="pages-wrapper">
      ${pagesArray.join("")}
    </div>
  </body>
  </html>
  `;
}

/**
 * Marca todas las filas con datos como PENDIENTE DE SUBIR
 */
function marcarTodoPendiente() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  for (let fila = 2; fila <= lastRow; fila++) {
    const cip = sheet.getRange(fila, 2).getValue();
    const nombres = sheet.getRange(fila, 4).getValue();
    if (cip || nombres) {
      sheet.getRange(fila, 11).setValue("PENDIENTE DE SUBIR");
      sheet.getRange(fila, 11).setBackground("#fff3cd").setFontColor("#856404").setFontWeight("bold");
      sheet.getRange(fila, 12).setValue("(Se asignará al registrar)");
      sheet.getRange(fila, 12).setFontColor("#888888").setFontStyle("italic");
      sheet.getRange(fila, 13).setValue("");
    }
  }
  SpreadsheetApp.getUi().alert("🔄 Todas las filas han sido marcadas como 'PENDIENTE DE SUBIR'.");
}

/**
 * Restaura los encabezados oficiales en la Fila 1
 */
function crearEncabezadosOficiales() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const headers = [
    "FECHA DOCUMENTO",
    "CIP",
    "GRADO",
    "APELLIDOS Y NOMBRES",
    "MOTIVO",
    "DESTINO",
    "UNIDAD DE PROCEDENCIA",
    "DESCRIPCION",
    "QUIEN ORDENA",
    "USUARIO REGISTRA",
    "ESTADO",
    "NUMERO DOCUMENTO",
    "ID NUBE"
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground("#0b5a3c")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
  SpreadsheetApp.getUi().alert("✨ Encabezados oficiales aplicados con éxito.");
}
