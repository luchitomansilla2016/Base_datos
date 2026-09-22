/**
 * =========================================================================================
 * POLICÍA NACIONAL DEL PERÚ - REGIÓN POLICIAL HUÁNUCO
 * SISTEMA DE GESTIÓN DOCUMENTARIA Y PERSONAL
 * SCRIPT OFICIAL: CARGA MASIVA DE ÓRDENES DE REINCORPORACIÓN
 * =========================================================================================
 * 
 * FLUJO OFICIAL DE NUMERACIÓN Y REGISTRO:
 * 1. El operador ingresa los efectivos en la Hoja de Cálculo (CIP, Grado, Nombres, Motivo, Destino).
 * 2. La hoja autocompleta la Fecha, Procedencia, Descripción, Quien Ordena, Usuario Registra
 *    y marca el Estado como "PENDIENTE DE SUBIR".
 * 3. El número correlativo NO se inventa localmente, sino que se consulta en tiempo real
 *    a la tabla 'orden_reincorporacion' del Sistema Documentario (Supabase).
 * 4. Al hacer clic en "🚀 1. Asignar N° Oficial y Registrar en el Sistema":
 *    - Se consulta el último correlativo registrado en la tabla 'orden_reincorporacion'.
 *    - Se genera y asigna el siguiente número consecutivo oficial.
 *    - Se inserta el registro en la base de datos de 'orden_reincorporacion'.
 *    - Se actualiza la fila en Google Sheets con su NUMERO DOCUMENTO oficial, ESTADO "REGISTRADO EN NUBE" y el ID NUBE.
 *    - Queda listo para ser impreso o consultado en el Sistema Web.
 * =========================================================================================
 */

const SUPABASE_URL = "https://ngsujkfmkgofngqwuqnf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nc3Vqa2Zta2dvZm5ncXd1cW5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2NDk2MzQsImV4cCI6MjEwNDIyNTYzNH0.KL1YmWPLSkMHs9LCf4TC8quqo2G4cd8K0zaGxvoU3Vg";

// Valores predeterminados oficiales
const DEFAULT_PROCEDENCIA = "COMOPPOL DIRNOS REGPOL HUANUCO EM OFAD";
const DEFAULT_QUIEN_ORDENA = "JEFE OFAD REGPOL HUANUCO";
const DEFAULT_USUARIO_REGISTRA = "ST2 PNP MANSILLA SANTA MARIA JOSE LUIS";
const DEFAULT_DESCRIPCION_PRE = "PONE A DISPOSICION AL TERMINO DE:";

/**
 * Menú superior oficial en Google Sheets
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("📌 PNP Reincorporaciones")
    .addItem("🚀 1. Asignar N° Oficial y Registrar en el Sistema", "subirANube")
    .addItem("⚡ 2. Autocompletar Campos Pendientes", "autocompletarTodo")
    .addSeparator()
    .addItem("🔄 3. Marcar Todo como 'PENDIENTE DE SUBIR'", "marcarTodoPendiente")
    .addItem("✨ 4. Crear / Restaurar Encabezados Oficiales", "crearEncabezadosOficiales")
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
    "\nLas órdenes ya se encuentran registradas con su correlativo oficial en la tabla 'orden_reincorporacion' y están listas para generarse e imprimirse desde el sistema web."
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
