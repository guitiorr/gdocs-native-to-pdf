// === CONFIG ===
const SOURCE_DOC_ID = 'SOURCE_DOC_ID'; // from doc URL: /d/<this_part>/edit
const PDF_NAME      = 'PDF_NAME';      // exact filename for the PDF

// === MAIN: runs on trigger ===
function rebuildPdfIfChanged() {
  const doc = DriveApp.getFileById(SOURCE_DOC_ID);
  const lastModified = doc.getLastUpdated().getTime();

  const props = PropertiesService.getScriptProperties();
  const lastExported = Number(props.getProperty('lastExportedAt') || 0);

  if (lastModified <= lastExported) {
    console.log('No changes. Skipping.');
    return;
  }

  // Native Google Doc -> PDF directly, no conversion hop
  const pdfBlob = doc.getAs(MimeType.PDF).setName(PDF_NAME);

  // Place PDF in source's parent folder
  const parents = doc.getParents();
  if (!parents.hasNext()) throw new Error('Source doc has no parent folder.');
  const folder = parents.next();

  const existing = folder.getFilesByName(PDF_NAME);
  if (existing.hasNext()) {
    const file = existing.next();
    Drive.Files.update({}, file.getId(), pdfBlob);
    console.log(`Updated existing PDF: ${file.getId()}`);
  } else {
    const created = folder.createFile(pdfBlob);
    console.log(`Created new PDF: ${created.getId()}`);
  }

  props.setProperty('lastExportedAt', String(lastModified));
}

// === SETUP: run ONCE to install the 5-minute trigger ===
function installTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'rebuildPdfIfChanged')
    .forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('rebuildPdfIfChanged')
    .timeBased()
    .everyMinutes(5)
    .create();

  console.log('Trigger installed.');
}
