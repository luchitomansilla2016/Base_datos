/**
 * =========================================================================================
 * POLICÍA NACIONAL DEL PERÚ - REGIÓN POLICIAL HUÁNUCO
 * SISTEMA DE GESTIÓN DOCUMENTARIA Y PERSONAL
 * SCRIPT OFICIAL: CARGA MASIVA DE ÓRDENES DE REINCORPORACIÓN (GOOGLE APPS SCRIPT)
 * =========================================================================================
 * 
 * INSTRUCCIONES DE INSTALACIÓN EN GOOGLE SHEETS:
 * 1. Abra su Hoja de Cálculo en Google Drive (Mi Unidad > PROGRAMAS > SUPABASE).
 * 2. En el menú superior de Google Sheets, haga clic en: Extensiones > Apps Script.
 * 3. Borre cualquier código anterior y pegue todo este archivo.
 * 4. Haga clic en el ícono de Guardar (Disquete) y recargue su Hoja de Cálculo (F5).
 * 5. Aparecerá el menú "📌 PNP Reincorporaciones" en la parte superior.
 */

const SUPABASE_URL = "https://ngsujkfmkgofngqwuqnf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nc3Vqa2Zta2dvZm5ncXd1cW5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2NDk2MzQsImV4cCI6MjEwNDIyNTYzNH0.KL1YmWPLSkMHs9LCf4TC8quqo2G4cd8K0zaGxvoU3Vg";

// Valores predeterminados oficiales requeridos por el sistema
const DEFAULT_PROCEDENCIA = "COMOPPOL DIRNOS REGPOL HUANUCO EM OFAD";
const DEFAULT_QUIEN_ORDENA = "JEFE OFAD REGPOL HUANUCO";
const DEFAULT_USUARIO_REGISTRA = "ST2 PNP MANSILLA SANTA MARIA JOSE LUIS";
const DEFAULT_DESCRIPCION_PRE = "PONE A DISPOSICION AL TERMINO DE:";

/**
 * Crea el menú superior oficial en Google Sheets al abrir la hoja
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("📌 PNP Reincorporaciones")
    .addItem("🚀 1. Subir a Nube (Supabase)", "subirANube")
    .addItem("⚡ 2. Autocompletar Filas y Asignar Correlativos", "autocompletarTodo")
    .addSeparator()
    .addItem("🔄 3. Marcar Todo como 'PENDIENTE DE SUBIR'", "marcarTodoPendiente")
    .addItem("✨ 4. Crear / Restaurar Encabezados Oficiales", "crearEncabezadosOficiales")
    .addToUi();
}

/**
 * Disparador automático que se ejecuta en tiempo real al escribir en la hoja.
 * Al ingresar datos en CIP, GRADO, APELLIDOS Y NOMBRES o DESTINO:
 * - Pone automáticamente la FECHA de hoy.
 * - Pone en UNIDAD DE PROCEDENCIA: COMOPPOL DIRNOS REGPOL HUANUCO EM OFAD.
 * - Pone en DESCRIPCIÓN: PONE A DISPOSICION AL TERMINO DE: <MOTIVO>.
 * - Pone en QUIEN ORDENA: JEFE OFAD REGPOL HUANUCO.
 * - Pone en USUARIO REGISTRA: ST2 PNP MANSILLA SANTA MARIA JOSE LUIS.
 * - Asigna el ESTADO "PENDIENTE DE SUBIR" y genera el correlativo.
 */
function onEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const startRow = e.range.getRow();
  const numRows = e.range.getNumRows();

  // Ignorar fila 1 de encabezados
  if (startRow < 2) return;

  for (let r = 0; r < numRows; r++) {
    const fila = startRow + r;
    autoCompletarFila(sheet, fila);
  }
}

/**
 * Llena automáticamente los campos predeterminados de una fila si tiene datos de efectivo
 */
function autoCompletarFila(sheet, fila) {
  const rowVals = sheet.getRange(fila, 1, 1, 13).getValues()[0];
  
  let fecha = rowVals[0];                                      // Col A (1): FECHA
  let cip = String(rowVals[1] || "").trim();                   // Col B (2): CIP
  let grado = String(rowVals[2] || "").trim().toUpperCase();   // Col C (3): GRADO
  let nombres = String(rowVals[3] || "").trim().toUpperCase(); // Col D (4): APELLIDOS Y NOMBRES
  let destino = String(rowVals[4] || "").trim().toUpperCase(); // Col E (5): DESTINO
  let procedencia = String(rowVals[5] || "").trim().toUpperCase(); // Col F (6): UNIDAD DE PROCEDENCIA
  let motivo = String(rowVals[6] || "").trim().toUpperCase();  // Col G (7): MOTIVO
  let descripcion = String(rowVals[7] || "").trim();           // Col H (8): DESCRIPCIÓN
  let quienOrdena = String(rowVals[8] || "").trim().toUpperCase(); // Col I (9): QUIEN ORDENA
  let usuarioRegistra = String(rowVals[9] || "").trim();       // Col J (10): USUARIO REGISTRA
  let estado = String(rowVals[10] || "").trim().toUpperCase(); // Col K (11): ESTADO
  let numDoc = String(rowVals[11] || "").trim();               // Col L (12): N° DOCUMENTO

  // Si toda la fila está vacía, no hacer nada
  if (!cip && !nombres && !destino && !grado) return;

  const todayStr = Utilities.formatDate(new Date(), "GMT-5", "yyyy-MM-dd");

  // 1. FECHA (Columna A)
  if (!fecha) {
    sheet.getRange(fila, 1).setValue(todayStr);
  }

  // 2. GRADO & NOMBRES en Mayúsculas (Cols C y D)
  if (grado) sheet.getRange(fila, 3).setValue(grado);
  if (nombres) sheet.getRange(fila, 4).setValue(nombres);

  // 3. DESTINO en Mayúsculas (Col E)
  if (destino) sheet.getRange(fila, 5).setValue(destino);

  // 4. UNIDAD DE PROCEDENCIA (Columna F)
  if (!procedencia) {
    sheet.getRange(fila, 6).setValue(DEFAULT_PROCEDENCIA);
  } else {
    sheet.getRange(fila, 6).setValue(procedencia);
  }

  // 5. MOTIVO (Columna G)
  if (motivo) sheet.getRange(fila, 7).setValue(motivo);

  // 6. DESCRIPCIÓN / ASUNTO (Columna H)
  if (!descripcion || descripcion === DEFAULT_DESCRIPCION_PRE) {
    const detalle = motivo ? motivo : "SUS ATENCIONES MEDICAS";
    sheet.getRange(fila, 8).setValue(DEFAULT_DESCRIPCION_PRE + " " + detalle);
  }

  // 7. QUIEN ORDENA (Columna I)
  if (!quienOrdena) {
    sheet.getRange(fila, 9).setValue(DEFAULT_QUIEN_ORDENA);
  } else {
    sheet.getRange(fila, 9).setValue(quienOrdena);
  }

  // 8. USUARIO REGISTRA (Columna J)
  if (!usuarioRegistra) {
    sheet.getRange(fila, 10).setValue(DEFAULT_USUARIO_REGISTRA);
  }

  // 9. ESTADO (Columna K)
  if (!estado || estado !== "REGISTRADO EN NUBE") {
    sheet.getRange(fila, 11).setValue("PENDIENTE DE SUBIR");
    sheet.getRange(fila, 11).setBackground("#fff3cd").setFontColor("#856404").setFontWeight("bold");
  }

  // 10. CORRELATIVO / NUMERO DOCUMENTO (Columna L)
  if (!numDoc) {
    const yr = new Date().getFullYear();
    const correlativoFila = String(fila - 1).padStart(3, "0");
    const docTitulo = `ORDEN DE REINCORPORACION N°${correlativoFila}-${yr}-COMOPPOL/DIRNOS PNP/REGPOL HCO/EM-OFAD.AREREHUM.MP`;
    sheet.getRange(fila, 12).setValue(docTitulo);
  }
}

/**
 * Recorre todas las filas de la hoja para autocompletar campos faltantes y asignar correlativos
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
 * Sube a Supabase todas las filas que tengan ESTADO = 'PENDIENTE DE SUBIR'
 */
function subirANube() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("No hay registros en la hoja para subir a la nube.");
    return;
  }

  // Obtener el correlativo máximo actual de la base de datos Supabase
  let maxCorrelativo = obtenerUltimoCorrelativoSupabase();
  const yr = new Date().getFullYear();
  let subidos = 0;
  let errores = 0;

  for (let fila = 2; fila <= lastRow; fila++) {
    autoCompletarFila(sheet, fila);
    const rowVals = sheet.getRange(fila, 1, 1, 13).getValues()[0];

    const fecha = rowVals[0];
    const cip = String(rowVals[1] || "").trim();
    const grado = String(rowVals[2] || "").trim().toUpperCase();
    const nombres = String(rowVals[3] || "").trim().toUpperCase();
    const destino = String(rowVals[4] || "").trim().toUpperCase();
    const procedencia = String(rowVals[5] || "").trim().toUpperCase() || DEFAULT_PROCEDENCIA;
    const motivo = String(rowVals[6] || "").trim().toUpperCase();
    const descripcion = String(rowVals[7] || "").trim() || (DEFAULT_DESCRIPCION_PRE + " " + (motivo || "SUS ATENCIONES MEDICAS"));
    const quienOrdena = String(rowVals[8] || "").trim().toUpperCase() || DEFAULT_QUIEN_ORDENA;
    const usuarioRegistra = String(rowVals[9] || "").trim() || DEFAULT_USUARIO_REGISTRA;
    const estado = String(rowVals[10] || "").trim().toUpperCase();

    // Solo procesar filas con datos que no hayan sido subidas
    if ((cip || nombres) && estado !== "REGISTRADO EN NUBE") {
      maxCorrelativo++;
      const numPadded = String(maxCorrelativo).padStart(3, "0");
      const fullNumDoc = `ORDEN DE REINCORPORACION N°${numPadded}-${yr}-COMOPPOL/DIRNOS PNP/REGPOL HCO/EM-OFAD.AREREHUM.MP`;

      // Armar nombre completo concatenando Grado + Nombres si corresponde
      let gradoNombresFinal = nombres;
      if (grado && !nombres.startsWith(grado)) {
        gradoNombresFinal = grado + " " + nombres;
      }

      const formattedFecha = (fecha instanceof Date) 
        ? Utilities.formatDate(fecha, "GMT-5", "yyyy-MM-dd") 
        : (String(fecha || "").split("T")[0] || Utilities.formatDate(new Date(), "GMT-5", "yyyy-MM-dd"));

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

        const response = UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/orden_reincorporacion", options);
        const code = response.getResponseCode();
        const resText = response.getContentText();

        if (code >= 200 && code < 300) {
          const data = JSON.parse(resText);
          const newId = (Array.isArray(data) && data[0]) ? data[0].id : "";
          
          sheet.getRange(fila, 11).setValue("REGISTRADO EN NUBE");
          sheet.getRange(fila, 11).setBackground("#d4edda").setFontColor("#155724").setFontWeight("bold");
          sheet.getRange(fila, 12).setValue(fullNumDoc);
          if (newId) sheet.getRange(fila, 13).setValue(newId);
          subidos++;
        } else {
          errores++;
          Logger.log("Error al subir fila " + fila + ": HTTP " + code + " - " + resText);
        }
      } catch (err) {
        errores++;
        Logger.log("Excepción al subir fila " + fila + ": " + err.message);
      }
    }
  }

  SpreadsheetApp.getUi().alert(
    "🚀 Resultado de la Sincronización con Nube Supabase:\n\n" +
    "✅ Registros subidos exitosamente: " + subidos + "\n" +
    (errores > 0 ? ("⚠️ Errores encontrados: " + errores + "\n") : "") +
    "\nPuede abrir el sistema web y presionar 'Actualizar Tabla' para ver las órdenes cargadas."
  );
}

/**
 * Obtiene el último número correlativo registrado en la tabla orden_reincorporacion de Supabase
 */
function obtenerUltimoCorrelativoSupabase() {
  const currentYear = new Date().getFullYear();
  try {
    const url = SUPABASE_URL + "/rest/v1/orden_reincorporacion?select=numero_documento&order=id.desc&limit=100";
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
          const m = numStr.match(/N[°º\s]*(\d+)/i) || numStr.match(/(\d+)/);
          if (m) {
            const val = parseInt(m[1], 10);
            if (!isNaN(val) && val > max) max = val;
          }
        });
      }
      return max;
    }
  } catch (e) {
    Logger.log("Error al consultar último correlativo: " + e.message);
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
    }
  }
  SpreadsheetApp.getUi().alert("🔄 Todas las filas han sido marcadas como 'PENDIENTE DE SUBIR'.");
}

/**
 * Crea o restablece los encabezados oficiales en la Fila 1
 */
function crearEncabezadosOficiales() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const headers = [
    "FECHA",
    "CIP",
    "GRADO",
    "APELLIDOS Y NOMBRES",
    "DESTINO",
    "UNIDAD DE PROCEDENCIA",
    "MOTIVO",
    "DESCRIPCIÓN / ASUNTO",
    "QUIEN ORDENA",
    "USUARIO REGISTRA",
    "ESTADO",
    "N° DOCUMENTO (CORRELATIVO)",
    "ID SUPABASE"
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
